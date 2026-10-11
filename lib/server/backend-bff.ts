import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.FARMACIAS_API_URL || 'http://localhost:5001'

export async function proxyToCore(path: string, init?: RequestInit): Promise<NextResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    })

    const body = await response.text()
    return new NextResponse(body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'El servicio tardó demasiado en responder.'
      : 'No se pudo conectar con el servicio de farmacias.'

    return NextResponse.json({ isSuccessful: false, errors: [message] }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
