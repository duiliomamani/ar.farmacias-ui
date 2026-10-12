import { bffFetch } from '@/lib/bff-client'
import type { HealthFacility } from '@/lib/health-facility-data'

export class HealthFacilityService {
  static async getAll(dataset?: number | string): Promise<HealthFacility[]> {
    const query = dataset ? `?dataset=${encodeURIComponent(dataset)}` : ''
    return bffFetch<HealthFacility[]>(`/api/health-facilities${query}`, { showToast: false })
  }
}
