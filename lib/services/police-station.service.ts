import { bffFetch } from '@/lib/bff-client'
import type { PoliceStation } from '@/lib/police-station-data'

export class PoliceStationService {
  static async getAll(): Promise<PoliceStation[]> {
    return bffFetch<PoliceStation[]>('/api/police-stations', { showToast: false })
  }
}
