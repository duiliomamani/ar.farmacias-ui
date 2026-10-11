import { NextResponse } from 'next/server'
import type { HealthFacility, HealthFacilityType } from '@/lib/health-facility-data'
import { IDEJUY_HEALTH_DATASETS } from '@/lib/health-facility-data'
import { addNearestLocalities, getIdejuyLocalities } from '@/lib/idejuy-localities'

const IDEJUY_WFS_URL = 'https://geo.idejuy.jujuy.gob.ar/geoserver/ows'
const CACHE_SECONDS = 6 * 60 * 60

interface IdejuyFeature {
  id: string
  geometry?: {
    type?: string
    coordinates?: unknown[]
  }
  properties?: {
    nam?: unknown
    sag?: unknown
    caa?: unknown
    ies?: unknown
    ces?: unknown
  }
}

interface IdejuyFeatureCollection {
  features?: IdejuyFeature[]
}

const textValue = (value: unknown, fallback = '') => (
  typeof value === 'string' && value.trim() ? value.trim() : fallback
)

function mapFeature(
  feature: IdejuyFeature,
  fallbackType: HealthFacilityType,
  datasetId: number,
  datasetUrl: string
): Omit<HealthFacility, 'locality'> | null {
  const coordinates = feature.geometry?.coordinates
  if (feature.geometry?.type !== 'Point' || !Array.isArray(coordinates)) return null

  const [lng, lat] = coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const properties = feature.properties || {}
  const rawType = textValue(properties.ces, fallbackType) as HealthFacilityType

  return {
    id: feature.id,
    name: textValue(properties.nam, 'Centro de salud').replace(/\s+\(\d+\)$/, ''),
    type: rawType,
    lat,
    lng,
    authority: textValue(properties.sag, 'Ministerio de Salud de Jujuy'),
    jurisdiction: textValue(properties.caa, 'Provincial'),
    establishmentCode: textValue(properties.ies),
    datasetId,
    datasetUrl,
  }
}

async function fetchLayer(layer: {
  layer: string
  type: HealthFacilityType
  id: number
  url: string
}): Promise<Omit<HealthFacility, 'locality'>[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typename: `geonode:${layer.layer}`,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
  })

  const response = await fetch(`${IDEJUY_WFS_URL}?${params}`, {
    next: { revalidate: CACHE_SECONDS },
    headers: { Accept: 'application/geo+json, application/json' },
  })

  if (!response.ok) {
    throw new Error(`IDEJuy (${layer.layer}) respondió con estado ${response.status}`)
  }

  const collection = await response.json() as IdejuyFeatureCollection
  return (collection.features || [])
    .map((feature) => mapFeature(feature, layer.type, layer.id, layer.url))
    .filter((facility): facility is Omit<HealthFacility, 'locality'> => facility !== null)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const datasetParam = searchParams.get('dataset')

    // Permitir filtrar por dataset específico (ej: ?dataset=48) o unificar todas las fuentes por defecto
    const targetDatasets = datasetParam && datasetParam !== 'all'
      ? IDEJUY_HEALTH_DATASETS.filter(
          (ds) => String(ds.id) === datasetParam || ds.type.toLowerCase() === datasetParam.toLowerCase()
        )
      : IDEJUY_HEALTH_DATASETS

    const layersToFetch = targetDatasets.length > 0 ? targetDatasets : IDEJUY_HEALTH_DATASETS

    const [layerResults, localities] = await Promise.all([
      Promise.allSettled(layersToFetch.map(fetchLayer)),
      getIdejuyLocalities(CACHE_SECONDS),
    ])

    const seenIds = new Set<string>()
    const rawFacilities: Omit<HealthFacility, 'locality'>[] = []

    for (const result of layerResults) {
      if (result.status === 'fulfilled') {
        for (const facility of result.value) {
          if (!seenIds.has(facility.id)) {
            seenIds.add(facility.id)
            rawFacilities.push(facility)
          }
        }
      } else {
        console.error('[health-facilities] Falló la carga de una capa de IDEJuy:', result.reason)
      }
    }

    if (rawFacilities.length === 0) {
      throw new Error('No se pudo obtener ningún efector de salud de las fuentes de IDEJuy')
    }

    const facilities = addNearestLocalities(rawFacilities, localities)

    return NextResponse.json(
      { isSuccessful: true, data: facilities },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
        },
      },
    )
  } catch (error) {
    console.error('[health-facilities] No se pudieron obtener los datos de IDEJuy', error)
    return NextResponse.json(
      { isSuccessful: false, errors: [{ message: 'No pudimos cargar los centros de salud de IDEJuy.' }] },
      { status: 502 },
    )
  }
}
