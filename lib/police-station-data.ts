export interface PoliceStation {
  id: string
  name: string
  type: string
  description: string
  authority: string
  locality: string
  lat: number
  lng: number
  distance?: number
}

export const IDEJUY_POLICE_STATIONS_URL = 'https://geo.idejuy.jujuy.gob.ar/catalogue/#/dataset/150'
