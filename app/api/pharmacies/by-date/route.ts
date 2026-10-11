import { NextRequest } from 'next/server'
import { proxyToCore } from '@/lib/server/backend-bff'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyToCore(`/api/pharmacies/by-date?${request.nextUrl.searchParams.toString()}`)
}
