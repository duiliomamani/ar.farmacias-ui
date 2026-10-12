import { NextResponse } from 'next/server'
import type { FireStation } from '@/lib/fire-station-data'
import { addNearestLocalities, getIdejuyLocalities } from '@/lib/idejuy-localities'
import { proxyToCore } from '@/lib/server/backend-bff'

const IDEJUY_WFS_URL = 'https://geo.idejuy.jujuy.gob.ar/geoserver/ows'
const CACHE_SECONDS = 6 * 60 * 60

interface IdejuyFireStationFeature {
  id: string
  geometry?: {
    type?: string
    coordinates?: unknown[]
  }
  properties?: {
    fna?: unknown
    gna?: unknown
    nam?: unknown
    sag?: unknown
  }
}

interface IdejuyFeatureCollection {
  features?: IdejuyFireStationFeature[]
}

const textValue = (value: unknown, fallback = '') => (
  typeof value === 'string' && value.trim() ? value.trim() : fallback
)

function mapFeature(feature: IdejuyFireStationFeature): Omit<FireStation, 'locality'> | null {
  const coordinates = feature.geometry?.coordinates
  if (feature.geometry?.type !== 'Point' || !Array.isArray(coordinates)) return null

  const [lng, lat] = coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const properties = feature.properties || {}
  return {
    id: feature.id,
    name: textValue(properties.nam, 'Cuartel de bomberos'),
    type: textValue(properties.gna, 'Cuartel'),
    description: textValue(properties.fna),
    authority: textValue(properties.sag, 'Ministerio de Seguridad'),
    lat,
    lng,
  }
}

export async function GET() {
  // 1. Delegar a condorjuy-api
  try {
    const coreResponse = await proxyToCore('/api/fire-stations')
    if (coreResponse.ok) {
      return coreResponse
    }
  } catch (err) {
    console.warn('[fire-stations] Fallback a IDEJuy directo:', err)
  }

  // 2. Fallback resiliente directo a IDEJuy
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typename: 'geonode:cuartel_de_bomberos',
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
    const rawFireStations = (collection.features || [])
      .map(mapFeature)
      .filter((station): station is Omit<FireStation, 'locality'> => station !== null)
    const fireStations = addNearestLocalities(rawFireStations, localities)

    return NextResponse.json(
      { isSuccessful: true, data: fireStations },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
        },
      },
    )
  } catch (error) {
    console.error('[fire-stations] No se pudieron obtener los datos de IDEJuy', error)
    return NextResponse.json(
      { isSuccessful: false, errors: [{ message: 'No pudimos cargar los cuarteles de bomberos de IDEJuy.' }] },
      { status: 502 },
    )
  }
}
