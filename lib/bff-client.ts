import { toast } from 'sonner'

export interface BffRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
  showToast?: boolean
}

export class BffClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'BffClientError'
  }
}

type ApiErrorItem = string | { message?: unknown; code?: unknown }

type ApiErrorPayload = {
  message?: unknown
  errors?: ApiErrorItem[]
  error?: unknown
}

function readableError(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (Array.isArray(value)) return value.flatMap(readableError)
  if (value && typeof value === 'object' && 'message' in value) {
    return readableError((value as { message?: unknown }).message)
  }
  return []
}

function errorMessage(payload: ApiErrorPayload | null, status: number): string {
  const messages = [
    ...readableError(payload?.errors),
    ...readableError(payload?.message),
    ...readableError(payload?.error),
  ]

  return messages[0] || `No se pudo completar la solicitud (error ${status}).`
}

/** Cliente público del BFF. Nunca contiene la URL privada del core. */
export async function bffFetch<T>(
  endpoint: string,
  options: BffRequestOptions = {},
): Promise<T> {
  const { params, showToast = true, ...requestOptions } = options
  const url = new URL(endpoint, window.location.origin)

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  })

  const headers = new Headers(requestOptions.headers)
  if (!(requestOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(url, { ...requestOptions, headers })
    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json() as ApiErrorPayload & { data?: T; isSuccessful?: boolean }
      : null

    if (!response.ok || payload?.isSuccessful === false) {
      const message = errorMessage(payload, response.status)
      if (showToast) toast.error(message, { id: `bff-${response.status}-${message}` })
      throw new BffClientError(response.status, message)
    }

    return (payload && 'data' in payload ? payload.data : payload) as T
  } catch (error) {
    if (error instanceof BffClientError) throw error
    if (showToast) {
      toast.error('Error de conexión. Verifica tu conexión a internet.', {
        id: 'bff-connection-error',
      })
    }
    throw new BffClientError(0, 'Error de conexión con el BFF')
  }
}

export const BffClient = {
  get<T>(endpoint: string, params?: BffRequestOptions['params']) {
    return bffFetch<T>(endpoint, { params })
  },
  post<T>(endpoint: string, body: unknown, options?: Omit<BffRequestOptions, 'body' | 'method'>) {
    return bffFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
