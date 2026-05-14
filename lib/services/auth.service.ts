import { API_BASE_URL } from '../api-service';

export class AuthService {
  static getGoogleLoginUrl(): string {
    return `${API_BASE_URL}/auth/google`;
  }
}

export default AuthService;
