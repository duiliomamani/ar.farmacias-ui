import type { Pharmacy } from './pharmacy-data'

const RECENT_REPORT_MS = 2 * 60 * 60 * 1000

export interface PharmacyRecommendation {
  pharmacy: Pharmacy
  reasons: string[]
  score: number
}

function recentReports(pharmacy: Pharmacy) {
  const cutoff = Date.now() - RECENT_REPORT_MS
  return (pharmacy.communityReports || []).filter(
    (report) => new Date(report.createdAt).getTime() >= cutoff,
  )
}

export function isPharmacyAvailable(pharmacy: Pharmacy): boolean {
  const reports = recentReports(pharmacy)
  const open = reports.filter((report) => report.isOnDuty).length
  const closed = reports.length - open
  if (closed > open) return false

  if (pharmacy.isPermanentlyOnDuty || (pharmacy.isOnDuty && !pharmacy.isVoluntary)) return true
  if (!pharmacy.isVoluntary) return false

  return open > closed
}

export function getRecommendedPharmacy(pharmacies: Pharmacy[]): PharmacyRecommendation | null {
  const ranked = pharmacies
    .map((pharmacy) => {
      const reports = recentReports(pharmacy)
      const openReports = reports.filter((report) => report.isOnDuty).length
      const closedReports = reports.length - openReports
      const hasPhone = Boolean(pharmacy.phone && pharmacy.phone !== 'Sin teléfono')
      const distance = pharmacy.distance ?? 999
      const reasons: string[] = []
      let score = 0

      if (pharmacy.isPermanentlyOnDuty) {
        score += 130
        reasons.push('Atención permanente')
      } else if (pharmacy.isOnDuty && !pharmacy.isVoluntary) {
        score += 115
        reasons.push('Turno oficial')
      } else if (pharmacy.isVoluntary) {
        score += 45
        reasons.push('Atención voluntaria')
      } else {
        score -= 100
      }

      score += openReports * 16
      score -= closedReports * 24
      if (openReports > closedReports) reasons.push(`${openReports} confirmación${openReports === 1 ? '' : 'es'} reciente${openReports === 1 ? '' : 's'}`)
      if (closedReports > openReports) {
        score -= 160
        reasons.push('Reportes recientes de cierre')
      }

      score += Math.max(0, 24 - distance * 6)
      if (distance < 1) reasons.push('A menos de 1 km')

      if (hasPhone) {
        score += 6
        reasons.push('Teléfono disponible')
      }

      return { pharmacy, reasons: reasons.slice(0, 3), score }
    })
    .filter(({ pharmacy, score }) => score > 0 && (pharmacy.isPermanentlyOnDuty || pharmacy.isOnDuty || pharmacy.isVoluntary))
    .sort((a, b) => b.score - a.score || (a.pharmacy.distance ?? 999) - (b.pharmacy.distance ?? 999))

  return ranked[0] || null
}

