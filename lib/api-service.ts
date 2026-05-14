import { toast } from 'sonner';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

if (process.env.NODE_ENV === 'development') {
  console.log('[API Service] API_BASE_URL:', API_BASE_URL);
}

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class AuthenticationError extends ApiClientError {
  constructor(message: string = 'No hay sesión activa') {
    super(401, 'UNAUTHENTICATED', message);
    this.name = 'AuthenticationError';
  }
}

export type QueryParams = Record<string, any>;

export interface FetchOptions extends RequestInit {
  params?: QueryParams;
  skipAuth?: boolean;
}

interface ApiErrorResponse {
  isSuccessful: false;
  code?: string;
  message: string | string[];
  statusCode?: number;
}

async function fetchAccessToken(): Promise<string> {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || '';
  }
  return '';
}

export class ApiService {
  static async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { params, skipAuth, ...fetchOptions } = options;

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: HeadersInit = { ...fetchOptions.headers };

    if (!(fetchOptions.body instanceof FormData) && !headers['Content-Type' as keyof HeadersInit]) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (!skipAuth) {
      const token = await fetchAccessToken();
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          if (response.status === 401 && typeof window !== 'undefined') {
             localStorage.removeItem('auth_token');
             window.location.href = '/';
          }
          throw new ApiClientError(
            response.status,
            'UNKNOWN_ERROR',
            `Error ${response.status}: ${response.statusText}`
          );
        }
        if (contentType?.includes('image/')) {
          const blob = await response.blob();
          return blob as unknown as T;
        }
        return {} as T;
      }

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiErrorResponse;

        if (typeof window !== 'undefined') {
          if (response.status === 401) {
            toast.error('Sesión expirada');
            localStorage.removeItem('auth_token');
            window.location.href = '/';
          } else if (response.status === 403) {
            toast.error('No tienes permiso');
          } else if (response.status === 400) {
            const errorMsg = Array.isArray(error.message)
              ? error.message.join(' | ')
              : (error.message || 'Datos inválidos');
            toast.error(`Error de validación: ${errorMsg}`);
          } else if (response.status >= 500) {
            toast.error('Ha ocurrido un error en los servidores. Nuestro equipo ha sido notificado.');
          }
        }

        const errorMessage = Array.isArray(error.message) ? error.message.join(', ') : error.message;

        throw new ApiClientError(
          error.statusCode || response.status,
          error.code || 'UNKNOWN_ERROR',
          errorMessage || 'Error desconocido del servidor'
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof AuthenticationError && typeof window !== 'undefined') {
        toast.error('Sesión expirada');
        localStorage.removeItem('auth_token');
        window.location.href = '/';
      }

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (typeof window !== 'undefined' && !(error instanceof AuthenticationError)) {
        toast.error('Error de conexión. Verifica tu conexión a internet.');
      }

      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        'Error de conexión. Verifica tu conexión a internet.'
      );
    }
  }

  static async getAll<T>(route: string, params?: QueryParams): Promise<T> {
    return this.request<T>(route, { params });
  }

  static async get<T>(route: string, id: string): Promise<T> {
    return this.request<T>(`${route}/${id}`);
  }

  static async post<T>(
    route: string,
    data: unknown,
    options?: FetchOptions
  ): Promise<T> {
    return this.request<T>(route, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  static async put<T>(route: string, id: string, data: unknown): Promise<T> {
    return this.request<T>(`${route}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete<T>(route: string, id: string): Promise<T> {
    return this.request<T>(`${route}/${id}`, {
      method: 'DELETE',
    });
  }
}
