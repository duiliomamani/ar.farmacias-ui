import { proxyToCore } from '@/lib/server/backend-bff'

export const dynamic = 'force-dynamic'

export async function GET() {
  return proxyToCore('/ping')
}
