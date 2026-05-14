'use client'

import { useState } from 'react'
import { Navigation, MapPin, Share2, Flame, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { cn, getDeviceId } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { PharmacyService } from '@/lib/api'

interface PharmacyCardProps {
  pharmacy: Pharmacy
  isSelected?: boolean
  onSelect?: (pharmacy: Pharmacy) => void
  onReportOpen?: (pharmacy: Pharmacy) => void
}

export function PharmacyCard({ pharmacy, isSelected, onSelect }: PharmacyCardProps) {
  const { toast } = useToast()
  const [isReporting, setIsReporting] = useState(false)

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`
    window.open(url, '_blank')
  }

  const handleShare = () => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`
    const text = `Farmacia de Turno: ${pharmacy.name}\nDirección: ${pharmacy.address}\n\nVer en Google Maps: ${mapsUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleQuickReport = async (isOnDuty: boolean) => {
    setIsReporting(true)
    try {
      const deviceId = getDeviceId()
      
      // Try to get location quickly
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('No geolocation'))
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      }).catch(() => null)

      const lat = position ? position.coords.latitude : pharmacy.lat
      const lng = position ? position.coords.longitude : pharmacy.lng

      await PharmacyService.reportStatus({
        pharmacyId: pharmacy.id,
        isOnDuty,
        lat,
        lng,
        deviceId,
      })
      toast({ 
        title: "¡Gracias por tu aporte!", 
        description: "El estado ha sido actualizado para ayudar a la comunidad." 
      })
    } catch (e) {
      toast({ 
        title: "Error", 
        description: "No se pudo enviar el reporte. Inténtalo más tarde.", 
        variant: "destructive" 
      })
    } finally {
      setIsReporting(false)
    }
  }

  const isHighActivity = pharmacy.activityLevel > 70;

  // Community logic
  const latestReport = pharmacy.communityReports?.[0];
  let confidenceBadge = null;

  if (latestReport && !latestReport.isOnDuty) {
    const minutes = Math.floor((Date.now() - new Date(latestReport.createdAt).getTime()) / 60000);
    const timeStr = minutes >= 60 ? `${Math.floor(minutes / 60)} hs` : `${minutes} min`;
    confidenceBadge = (
      <div className="bg-orange-50 text-orange-700 border-orange-200 border px-2 py-1.5 rounded-md text-[11px] font-bold w-full mt-2 flex items-center gap-1.5">
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
        <div className="bg-green-50 text-green-700 border-green-200 border px-2 py-1.5 rounded-md text-[11px] font-bold w-full mt-2 flex items-center gap-1.5">
          <span>✅</span> Confirmada por la comunidad hace {timeStr}
        </div>
      );
    }
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg border-l-4 overflow-hidden group relative flex flex-col",
        isSelected ? "ring-1 ring-primary ring-offset-1" : "hover:bg-card/50",
        pharmacy.isOnDuty
          ? "border-l-primary bg-primary/5"
          : "border-l-muted-foreground/20"
      )}
      onClick={() => onSelect?.(pharmacy)}
    >
      <CardContent className="p-3.5 flex flex-col flex-1">
        <div className="flex flex-col gap-2 flex-1">
          {/* Header Area */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <h3 className="font-heading font-black text-foreground leading-tight text-base tracking-tight uppercase group-hover:text-primary transition-colors line-clamp-1">
                {pharmacy.name}
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm',
                    pharmacy.isOnDuty
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {pharmacy.isOnDuty ? 'De Turno' : 'Cerrada'}
                </Badge>
                {isHighActivity && (
                  <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                )}
              </div>
            </div>
            <div className="text-[11px] font-black text-muted-foreground/80 bg-muted/80 px-2 py-1 rounded-md shrink-0">
              {pharmacy.distance?.toFixed(1)} km
            </div>
          </div>

          {/* Prominent Opening Hours */}
          <div className="mt-0.5">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-wider inline-block border border-primary/20">
              {pharmacy.openingHours || "Horario no especificado"}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-center gap-1.5 text-xs text-foreground/80 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
            <span className="font-medium truncate">{pharmacy.address}</span>
          </div>

          {/* Confidence Badge */}
          {confidenceBadge}

          <div className="flex-1" />

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-2 mt-1">
            <Button
              variant="default"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[11px] uppercase tracking-widest h-9 shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                handleNavigate()
              }}
            >
              <Navigation className="mr-1.5 h-3.5 w-3.5" strokeWidth={3} />
              Navegar
            </Button>

            <Button
              variant="outline"
              className="w-9 h-9 p-0 border-green-500/20 hover:border-green-500/50 hover:bg-green-500/5 text-green-600"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
            >
              <Share2 className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
          
          {/* Quick Feedback Section */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex-1">¿Está abierta?</span>
             <div className="flex items-center gap-1.5">
               <Button 
                 size="sm" 
                 variant="outline" 
                 className="h-7 text-[10px] px-2.5 gap-1.5 bg-green-50/50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 font-bold uppercase"
                 disabled={isReporting}
                 onClick={(e) => { e.stopPropagation(); handleQuickReport(true); }}
               >
                  {isReporting ? <Loader2 className="w-3 h-3 animate-spin"/> : <ThumbsUp className="w-3 h-3"/>} Sí, está abierta
               </Button>
               <Button 
                 size="sm" 
                 variant="outline" 
                 className="h-7 text-[10px] px-2.5 gap-1.5 bg-red-50/50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 font-bold uppercase"
                 disabled={isReporting}
                 onClick={(e) => { e.stopPropagation(); handleQuickReport(false); }}
               >
                  {isReporting ? <Loader2 className="w-3 h-3 animate-spin"/> : <ThumbsDown className="w-3 h-3"/>} No, está cerrada
               </Button>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
