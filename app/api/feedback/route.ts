import { NextRequest } from 'next/server'
import { proxyToCore } from '@/lib/server/backend-bff'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const frontendOrigin = process.env.FRONTEND_URL || request.nextUrl.origin

  return proxyToCore('/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: frontendOrigin.split(',')[0].trim(),
      Referer: `${frontendOrigin.split(',')[0].trim()}/`,
    },
    body,
  })
}

export async function OPTIONS(request: NextRequest) {
  const frontendOrigin = process.env.FRONTEND_URL || request.nextUrl.origin
  return proxyToCore('/api/feedback', {
    method: 'OPTIONS',
    headers: { Origin: frontendOrigin.split(',')[0].trim() },
  })
}
