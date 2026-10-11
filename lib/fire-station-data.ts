export interface FireStation {
  id: string
  name: string
  type: string
  description: string
  authority: string
  locality: string
  lat: number
  lng: number
}

export const IDEJUY_FIRE_STATIONS_URL = 'https://geo.idejuy.jujuy.gob.ar/catalogue/#/dataset/151'
