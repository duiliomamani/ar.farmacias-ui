export type HealthFacilityType = 'NODO SANITARIO' | 'CAPS' | 'CIC' | 'PUESTO DE SALUD'

export interface HealthFacility {
  id: string
  name: string
  type: HealthFacilityType
  lat: number
  lng: number
  authority: string
  jurisdiction: string
  establishmentCode: string
  locality: string
  datasetId?: number
  datasetUrl?: string
  distance?: number
}

export interface HealthDatasetMeta {
  id: number
  type: HealthFacilityType
  layer: string
  label: string
  title: string
  url: string
  description: string
}

/**
 * Fuentes oficiales de datos de Salud Pública de IDEJuy (Jujuy, Argentina).
 * Unifica las 4 redes de efectores de salud provinciales:
 * - Dataset 47: Nodos Sanitarios (Especialidades, Guardia y Observación)
 * - Dataset 45: CAPS (Centros de Atención Primaria de la Salud)
 * - Dataset 46: CIC (Centros Integradores Comunitarios)
 * - Dataset 48: Puestos de Salud (Atención Primaria y Agentes Sanitarios)
 */
export const IDEJUY_HEALTH_DATASETS: readonly HealthDatasetMeta[] = [
  {
    id: 47,
    type: 'NODO SANITARIO',
    layer: 'efectores_de_salud_nodos',
    label: 'Nodo Sanitario',
    title: 'Centros de Salud Públicos (NODOS)',
    url: 'https://geo.idejuy.jujuy.gob.ar/catalogue/#/dataset/47',
    description: 'Atención con especialidades médicas, sala de observación y guardia de 7 a 22 hs.',
  },
  {
    id: 45,
    type: 'CAPS',
    layer: 'efectores_de_salud_caps',
    label: 'CAPS',
    title: 'Centros de Salud Públicos (CAPS)',
    url: 'https://geo.idejuy.jujuy.gob.ar/catalogue/#/dataset/45',
    description: 'Centro de Atención Primaria de la Salud con médico generalista permanente, enfermería y agentes sanitarios.',
  },
  {
    id: 46,
    type: 'CIC',
    layer: 'efectores_de_salud_cic',
    label: 'CIC',
    title: 'Centros de Salud Públicos (CIC)',
    url: 'https://geo.idejuy.jujuy.gob.ar/catalogue/#/dataset/46',
    description: 'Centro Integrador Comunitario municipal con espacio de salud y atención comunitaria.',
  },
  {
    id: 48,
    type: 'PUESTO DE SALUD',
    layer: 'efectores_de_salud_puestos_de_salud',
    label: 'Puesto de Salud',
    title: 'Centros de Salud Públicos (Puestos de Salud)',
    url: 'https://geo.idejuy.jujuy.gob.ar/catalogue/#/dataset/48',
    description: 'Puesto de salud barrial o rural con agentes sanitarios y enfermería de primer contacto.',
  },
] as const

export const IDEJUY_HEALTH_MAP_URL = 'https://geo.idejuy.jujuy.gob.ar/catalogue/#/dataset/48'

export function getHealthDatasetUrl(type?: HealthFacilityType, datasetId?: number): string {
  if (datasetId) {
    const ds = IDEJUY_HEALTH_DATASETS.find((d) => d.id === datasetId)
    if (ds) return ds.url
  }
  if (type) {
    const ds = IDEJUY_HEALTH_DATASETS.find((d) => d.type === type)
    if (ds) return ds.url
  }
  return IDEJUY_HEALTH_MAP_URL
}

export function getHealthDatasetDescription(type?: HealthFacilityType): string {
  if (type) {
    const ds = IDEJUY_HEALTH_DATASETS.find((d) => d.type === type)
    if (ds) return ds.description
  }
  return 'Efector público de salud de la Provincia de Jujuy'
}
