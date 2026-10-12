import { bffFetch } from '../bff-client'
import type { GeorefJujuyItem } from '@/app/api/georef/jujuy/route'

export interface GeorefJujuyResponse {
  isSuccessful: boolean
  fuente: string
  total: number
  resultados: GeorefJujuyItem[]
}

export class GeorefJujuyService {
  /**
   * Búsqueda geográfica universal (parajes, barrios, localidades, municipios y departamentos de Jujuy)
   */
  static async search(
    query: string,
    options?: {
      tipo?: 'departamentos' | 'municipios' | 'localidades' | 'asentamientos' | 'todos'
      departamento?: string
      max?: number
    }
  ): Promise<GeorefJujuyItem[]> {
    if (!query && !options?.tipo && !options?.departamento) return []

    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (options?.tipo) params.set('tipo', options.tipo)
    if (options?.departamento) params.set('departamento', options.departamento)
    if (options?.max) params.set('max', String(options.max))

    try {
      const response = await bffFetch<GeorefJujuyResponse>(`/api/georef/jujuy?${params.toString()}`)
      return response.resultados || []
    } catch (error) {
      console.warn('[GeorefJujuyService] Error buscando en Georef:', error)
      return []
    }
  }

  /**
   * Retorna los 16 departamentos oficiales de Jujuy
   */
  static async getDepartamentos(): Promise<GeorefJujuyItem[]> {
    return this.search('', { tipo: 'departamentos' })
  }

  /**
   * Retorna los municipios de Jujuy (opcionalmente filtrados por departamento)
   */
  static async getMunicipios(departamento?: string): Promise<GeorefJujuyItem[]> {
    return this.search('', { tipo: 'municipios', departamento })
  }
}

