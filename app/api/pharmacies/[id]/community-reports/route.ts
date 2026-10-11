import { NextRequest } from 'next/server'
import { proxyToCore } from '@/lib/server/backend-bff'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.text()
  const frontendOrigin = process.env.FRONTEND_URL || request.nextUrl.origin
  const origin = frontendOrigin.split(',')[0].trim()

  return proxyToCore(`/api/pharmacies/${encodeURIComponent(id)}/community-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: `${origin}/`,
    },
    body,
  })
}
