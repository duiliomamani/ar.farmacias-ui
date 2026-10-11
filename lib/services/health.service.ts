import { BffClient } from '../bff-client';

export class HealthService {
  /**
   * GET /ping - Health check endpoint (sin autenticación)
   */
  static async ping(): Promise<any> {
    return BffClient.get<any>('/api/health');
  }
}

export default HealthService;
