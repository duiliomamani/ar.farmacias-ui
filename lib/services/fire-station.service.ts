import { bffFetch } from '@/lib/bff-client'
import type { FireStation } from '@/lib/fire-station-data'

export class FireStationService {
  static async getAll(): Promise<FireStation[]> {
    return bffFetch<FireStation[]>('/api/fire-stations', { showToast: false })
  }
}
