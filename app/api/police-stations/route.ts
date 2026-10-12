import { NextResponse } from 'next/server'
import type { PoliceStation } from '@/lib/police-station-data'
import { addNearestLocalities, getIdejuyLocalities } from '@/lib/idejuy-localities'
import { proxyToCore } from '@/lib/server/backend-bff'

const IDEJUY_WFS_URL = 'https://geo.idejuy.jujuy.gob.ar/geoserver/ows'
const CACHE_SECONDS = 6 * 60 * 60

interface IdejuyPoliceStationFeature {
  id: string
  geometry?: {
    type?: string
    coordinates?: unknown[]
  }
  properties?: {
    fna?: unknown
    gna?: unknown
    nam?: unknown
    tes?: unknown
    sag?: unknown
  }
}

interface IdejuyFeatureCollection {
  features?: IdejuyPoliceStationFeature[]
}

const textValue = (value: unknown, fallback = '') => (
  typeof value === 'string' && value.trim() ? value.trim() : fallback
)

function mapFeature(feature: IdejuyPoliceStationFeature): Omit<PoliceStation, 'locality'> | null {
  const coordinates = feature.geometry?.coordinates
  if (feature.geometry?.type !== 'Point' || !Array.isArray(coordinates)) return null

  const [lng, lat] = coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const properties = feature.properties || {}
  return {
    id: feature.id,
    name: textValue(properties.nam, 'Comisaría'),
    type: textValue(properties.tes || properties.gna, 'Comisaría'),
    description: textValue(properties.fna),
    authority: textValue(properties.sag, 'Ministerio de Seguridad'),
    lat,
    lng,
  }
}

export async function GET() {
  // 1. Delegar a ar.farmacias-core
  try {
    const coreResponse = await proxyToCore('/api/police-stations')
    if (coreResponse.ok) {
      return coreResponse
    }
  } catch (err) {
    console.warn('[police-stations] Fallback a IDEJuy directo:', err)
  }

  // 2. Fallback resiliente directo a IDEJuy GeoServer
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typename: 'geonode:edificios_de_seguridad',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
  })

  try {
    const [response, localities] = await Promise.all([
      fetch(`${IDEJUY_WFS_URL}?${params}`, {
        next: { revalidate: CACHE_SECONDS },
        headers: { Accept: 'application/geo+json, application/json' },
      }),
      getIdejuyLocalities(CACHE_SECONDS),
    ])

    if (!response.ok) throw new Error(`IDEJuy respondió con estado ${response.status}`)

    const collection = await response.json() as IdejuyFeatureCollection
    const rawStations = (collection.features || [])
      .map(mapFeature)
      .filter((station): station is Omit<PoliceStation, 'locality'> => station !== null)
    const stations = addNearestLocalities(rawStations, localities)

    return NextResponse.json(
      { isSuccessful: true, data: stations },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
        },
      },
    )
  } catch (error) {
    console.error('[police-stations] No se pudieron obtener los datos de IDEJuy', error)
    return NextResponse.json(
      { isSuccessful: false, errors: [{ message: 'No pudimos cargar las comisarías de IDEJuy.' }] },
      { status: 502 },
    )
  }
}
