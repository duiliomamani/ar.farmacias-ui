import { ApiService } from '../api-service';

export class HealthService {
  /**
   * GET /ping - Health check endpoint (sin autenticación)
   */
  static async ping(): Promise<any> {
    return ApiService.request<any>('/ping', { skipAuth: true });
  }
}

export default HealthService;
