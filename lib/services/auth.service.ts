import { API_BASE_URL, ApiService } from '../api-service';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  trustScore: number;
}

export class AuthService {
  static getGoogleLoginUrl(): string {
    return `${API_BASE_URL}/auth/google`;
  }

  static async getProfile(): Promise<UserProfile> {
    return ApiService.request<UserProfile>('/api/users/profile');
  }
}

export default AuthService;
