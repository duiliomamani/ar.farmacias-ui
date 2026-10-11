import 'server-only'

const IDEJUY_WFS_URL = 'https://geo.idejuy.jujuy.gob.ar/geoserver/ows'

interface IdejuyLocalityFeature {
  geometry?: {
    type?: string
    coordinates?: unknown[]
  }
  properties?: {
    nam?: unknown
  }
}

interface IdejuyLocalityCollection {
  features?: IdejuyLocalityFeature[]
}

interface IdejuyLocality {
  name: string
  lat: number
  lng: number
}

interface GeocodedItem {
  lat: number
  lng: number
}

const toRadians = (degrees: number) => degrees * Math.PI / 180

const distanceInKilometers = (first: GeocodedItem, second: GeocodedItem) => {
  const latitudeDelta = toRadians(second.lat - first.lat)
  const longitudeDelta = toRadians(second.lng - first.lng)
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.lat)) * Math.cos(toRadians(second.lat))
    * Math.sin(longitudeDelta / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export async function getIdejuyLocalities(cacheSeconds: number): Promise<IdejuyLocality[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typename: 'geonode:localidades_censales_puntos_jujuy',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
  })

  const response = await fetch(`${IDEJUY_WFS_URL}?${params}`, {
    next: { revalidate: cacheSeconds },
    headers: { Accept: 'application/geo+json, application/json' },
  })

  if (!response.ok) throw new Error(`IDEJuy respondió con estado ${response.status}`)

  const collection = await response.json() as IdejuyLocalityCollection
  return (collection.features || []).flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates
    const name = feature.properties?.nam
    if (feature.geometry?.type !== 'Point' || !Array.isArray(coordinates) || typeof name !== 'string') return []

    const [lng, lat] = coordinates
    return typeof lat === 'number' && typeof lng === 'number'
      ? [{ name: name.trim(), lat, lng }]
      : []
  })
}

export function addNearestLocalities<T extends GeocodedItem>(items: T[], localities: IdejuyLocality[]) {
  return items.map((item) => {
    const nearest = localities.reduce<IdejuyLocality | null>((closest, locality) => {
      if (!closest) return locality
      return distanceInKilometers(item, locality) < distanceInKilometers(item, closest)
        ? locality
        : closest
    }, null)

    return { ...item, locality: nearest?.name || 'Sin localidad' }
  })
}
