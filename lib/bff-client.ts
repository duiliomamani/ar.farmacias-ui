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

type ApiErrorPayload = {
  message?: string | string[]
  errors?: string[]
  error?: string | string[]
}

function errorMessage(payload: ApiErrorPayload | null, status: number): string {
  const messages = payload?.errors?.filter(Boolean)
  if (messages?.length) return messages.join(', ')

  const message = Array.isArray(payload?.message)
    ? payload.message.join(', ')
    : payload?.message || (Array.isArray(payload?.error) ? payload.error.join(', ') : payload?.error)

  return message || `Error ${status}`
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
