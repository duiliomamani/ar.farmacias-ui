'use client'

import { Navigation, MapPin, Share2, Flame, ExternalLink, ShieldCheck, Clock3, Phone, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CommunityReportActions } from './community-report-actions'
import { toTitleCase } from '@/lib/locality-utils'

interface PharmacyCardProps {
  pharmacy: Pharmacy
  isSelected?: boolean
  userLocation?: [number, number] | null
  onSelect?: (pharmacy: Pharmacy) => void
  isFavorite?: boolean
  onToggleFavorite?: (pharmacy: Pharmacy) => void
}

export function PharmacyCard({ pharmacy, isSelected, userLocation, onSelect, isFavorite = false, onToggleFavorite }: PharmacyCardProps) {
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

  const reports = pharmacy.communityReports || [];
  let confidenceBadge = null;

  if (reports.length > 0) {
    const openCount = reports.filter((report) => report.isOnDuty).length;
    const closedCount = reports.length - openCount;
    const latestReport = reports.reduce((latest, report) =>
      new Date(report.createdAt).getTime() > new Date(latest.createdAt).getTime() ? report : latest
    );
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(latestReport.createdAt).getTime()) / 60000));
    const timeStr = minutes >= 60 ? `${Math.floor(minutes / 60)} hs` : `${minutes} min`;
    if (openCount === closedCount) {
      confidenceBadge = (
        <div className="mt-1.5 flex w-full items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-1 text-[9px] font-bold text-amber-700">
          <span>⚠️</span> Información dividida · actualización hace {timeStr}
        </div>
      );
    } else if (openCount > closedCount) {
      confidenceBadge = (
        <div className="mt-1.5 flex w-full items-center gap-1 rounded border border-green-200 bg-green-50 px-1.5 py-1 text-[9px] font-bold text-green-700">
          <span>✅</span> {openCount} {openCount === 1 ? 'persona confirma' : 'personas confirman'} que atiende · hace {timeStr}
        </div>
      );
    } else {
      confidenceBadge = (
        <div className="mt-1.5 flex w-full items-center gap-1 rounded border border-orange-200 bg-orange-50 px-1.5 py-1 text-[9px] font-bold text-orange-700">
          <span>⚠️</span> {closedCount} {closedCount === 1 ? 'persona reporta' : 'personas reportan'} que está cerrada · hace {timeStr}
        </div>
      );
    }
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-md border-l-4 overflow-hidden group relative rounded-xl",
        isSelected ? "ring-2 ring-primary ring-offset-1" : "hover:bg-card/70",
        pharmacy.isOnDuty
          ? isPermanent ? "border-l-sky-500 bg-sky-500/5" : "border-l-primary bg-primary/5"
          : isVoluntary ? "border-l-blue-500 bg-blue-500/5"
          : "border-l-muted-foreground/20"
      )}
      onClick={() => onSelect?.(pharmacy)}
    >
      <CardContent className="p-3.5">
        <div className="flex flex-col gap-2">
          {/* Header Area */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <h3 className="font-heading font-black text-foreground leading-snug text-sm tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                {toTitleCase(pharmacy.name)}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={cn(
                    'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-xs h-4.5',
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
                  <Badge className="h-4.5 gap-1 border border-sky-500/30 bg-sky-500/10 px-1.5 py-0 text-[9px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">
                    <ShieldCheck className="h-2.5 w-2.5" /> Permanente
                  </Badge>
                )}
                {isHighActivity && (
                  <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {pharmacy.distance !== undefined && (
                <div className="text-[11px] font-black text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">
                  {pharmacy.distance.toFixed(1)} km
                </div>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full"
                aria-label={isFavorite ? `Quitar ${pharmacy.name} de favoritas` : `Guardar ${pharmacy.name} como favorita`}
                aria-pressed={isFavorite}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleFavorite?.(pharmacy)
                }}
              >
                <Star className={cn('h-4 w-4', isFavorite && 'fill-amber-400 text-amber-500')} />
              </Button>
            </div>
          </div>

          {isVoluntary && (
            <p className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300">
              Atención no garantizada. Recomendamos llamar antes de ir.
            </p>
          )}

          {isVoluntary && <CommunityReportActions pharmacy={pharmacy} />}

          {/* Address & Hours details */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-0.5">
            <p className="flex items-center gap-1.5 text-xs text-foreground/80 line-clamp-1">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2.5} />
              <span className="truncate">{toTitleCase(pharmacy.address)}</span>
            </p>
            {pharmacy.openingHours && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground line-clamp-1">
                <Clock3 className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{pharmacy.openingHours}</span>
              </p>
            )}
          </div>

          {/* Confidence Badge */}
          {confidenceBadge}

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="default"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider h-8 shadow-sm rounded-lg"
              onClick={(e) => {
                e.stopPropagation()
                handleShowRoute()
              }}
            >
              <Navigation className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />
              Cómo llegar
            </Button>

            {pharmacy.phone && pharmacy.phone !== 'Sin teléfono' && (
              <Button
                asChild
                variant="outline"
                className="h-8 px-2.5 text-muted-foreground hover:text-primary rounded-lg border-border/80"
                onClick={(e) => e.stopPropagation()}
              >
                <a href={`tel:${pharmacy.phone}`} aria-label="Llamar a farmacia">
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              className="w-8 h-8 p-0 border-green-500/20 hover:border-green-500/50 hover:bg-green-500/5 text-green-600 rounded-lg shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
              title="Compartir por WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg shrink-0"
              aria-label="Ver en Street View"
              onClick={(e) => {
                e.stopPropagation()
                handleStreetView()
              }}
              title="Ver calle"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
