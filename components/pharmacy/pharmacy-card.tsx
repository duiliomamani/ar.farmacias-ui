'use client'

import { Navigation, MapPin, Share2, Flame, ExternalLink, ShieldCheck, Clock3, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface PharmacyCardProps {
  pharmacy: Pharmacy
  isSelected?: boolean
  userLocation?: [number, number] | null
  onSelect?: (pharmacy: Pharmacy) => void
}

export function PharmacyCard({ pharmacy, isSelected, userLocation, onSelect }: PharmacyCardProps) {
  const handleShowRoute = () => {
    onSelect?.(pharmacy)
  }

  const handleShare = () => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`
    const text = `Farmacia de Turno: ${pharmacy.name}\nDirección: ${pharmacy.address}\n\nVer en Google Maps: ${mapsUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleStreetView = () => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pharmacy.lat},${pharmacy.lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const isHighActivity = pharmacy.activityLevel > 70;
  const isPermanent = pharmacy.isPermanentlyOnDuty === true;
  const isVoluntary = pharmacy.isVoluntary === true;

  const latestReport = pharmacy.communityReports?.[0];
  let confidenceBadge = null;

  if (latestReport && !latestReport.isOnDuty) {
    const minutes = Math.floor((Date.now() - new Date(latestReport.createdAt).getTime()) / 60000);
    const timeStr = minutes >= 60 ? `${Math.floor(minutes / 60)} hs` : `${minutes} min`;
    confidenceBadge = (
      <div className="bg-orange-50 text-orange-700 border-orange-200 border px-1.5 py-1 rounded text-[9px] font-bold w-full mt-1.5 flex items-center gap-1">
        <span>⚠️</span> Reportada como cerrada hace {timeStr}
      </div>
    );
  } else {
    const recentVerifiedReport = pharmacy.communityReports?.find(
      (r) => r.isOnDuty && (Date.now() - new Date(r.createdAt).getTime()) < 2 * 60 * 60 * 1000
    );
    if (recentVerifiedReport) {
      const minutes = Math.floor((Date.now() - new Date(recentVerifiedReport.createdAt).getTime()) / 60000);
      const timeStr = minutes >= 60 ? `${Math.floor(minutes / 60)} hs` : `${minutes} min`;
      confidenceBadge = (
        <div className="bg-green-50 text-green-700 border-green-200 border px-1.5 py-1 rounded text-[9px] font-bold w-full mt-1.5 flex items-center gap-1">
          <span>✅</span> Confirmada por la comunidad hace {timeStr}
        </div>
      );
    }
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg border-l-4 overflow-hidden group relative gap-2 py-2",
        isSelected ? "ring-1 ring-primary ring-offset-1" : "hover:bg-card/50",
        pharmacy.isOnDuty
          ? isPermanent ? "border-l-sky-500 bg-sky-500/5" : "border-l-primary bg-primary/5"
          : isVoluntary ? "border-l-blue-500 bg-blue-500/5"
          : "border-l-muted-foreground/20"
      )}
      onClick={() => onSelect?.(pharmacy)}
    >
      <CardContent className="p-2.5">
        <div className="flex flex-col gap-1.5">
          {/* Header Area */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 flex-1">
              <h3 className="font-heading font-black text-foreground leading-tight text-sm tracking-tight uppercase group-hover:text-primary transition-colors line-clamp-1">
                {pharmacy.name}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={cn(
                    'text-[9px] font-black uppercase tracking-widest px-1.5 py-0 shadow-sm h-4',
                    isVoluntary
                      ? 'bg-blue-600 text-white'
                      : pharmacy.isOnDuty
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isVoluntary ? 'Voluntaria' : pharmacy.isOnDuty ? 'De Turno' : 'Cerrada'}
                </Badge>
                {isPermanent && (
                  <Badge className="h-4 gap-1 border border-sky-500/30 bg-sky-500/10 px-1.5 py-0 text-[9px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">
                    <ShieldCheck className="h-2.5 w-2.5" /> Permanente
                  </Badge>
                )}
                {isHighActivity && (
                  <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                )}
              </div>
            </div>
            <div className="text-[10px] font-black text-muted-foreground/80 bg-muted/80 px-1.5 py-0.5 rounded shrink-0">
              {pharmacy.distance?.toFixed(1)} km
            </div>
          </div>

          {isVoluntary && (
            <p className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-700 dark:text-blue-300">
              Atención no garantizada. Recomendamos llamar antes de ir.
            </p>
          )}

          {/* Compact details: full values appear on demand in tooltips. */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {pharmacy.openingHours && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={(event) => event.stopPropagation()} className={cn("rounded-md p-1 hover:bg-muted", isPermanent ? "text-sky-600 dark:text-sky-300" : "text-primary/80")} aria-label="Ver horario">
                    <Clock3 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Horario: {pharmacy.openingHours}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={(event) => event.stopPropagation()} className="rounded-md p-1 text-primary hover:bg-muted" aria-label="Ver dirección">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Dirección: {pharmacy.address}</TooltipContent>
            </Tooltip>
            {pharmacy.phone && pharmacy.phone !== 'Sin teléfono' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={`tel:${pharmacy.phone}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-primary" aria-label="Llamar a la farmacia" onClick={(event) => event.stopPropagation()}>
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Teléfono: {pharmacy.phone}</TooltipContent>
              </Tooltip>
            )}
            <span className="text-[10px] text-muted-foreground">Más información</span>
          </div>

          {/* Confidence Badge */}
          {confidenceBadge}

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Button
              variant="default"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest h-7 shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                handleShowRoute()
              }}
            >
              <Navigation className="mr-1.5 h-3 w-3" strokeWidth={3} />
              Cómo llegar
            </Button>

            <Button
              variant="outline"
              className="w-7 h-7 p-0 border-green-500/20 hover:border-green-500/50 hover:bg-green-500/5 text-green-600"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0"
              aria-label="Ver ubicación en Street View"
              onClick={(e) => {
                e.stopPropagation()
                handleStreetView()
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
          
        </div>
      </CardContent>
    </Card>
  )
}
