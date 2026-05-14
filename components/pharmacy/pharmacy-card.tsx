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
        "cursor-pointer transition-all duration-300 hover:shadow-lg border-l-4 overflow-hidden group relative flex flex-col",
        isSelected ? "ring-1 ring-primary ring-offset-1" : "hover:bg-card/50",
        pharmacy.isOnDuty
          ? "border-l-primary bg-primary/5"
          : "border-l-muted-foreground/20"
      )}
      onClick={() => onSelect?.(pharmacy)}
    >
      <CardContent className="p-3 flex flex-col flex-1">
        <div className="flex flex-col gap-1.5 flex-1">
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
                    pharmacy.isOnDuty
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {pharmacy.isOnDuty ? 'De Turno' : 'Cerrada'}
                </Badge>
                {isHighActivity && (
                  <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                )}
              </div>
            </div>
            <div className="text-[10px] font-black text-muted-foreground/80 bg-muted/80 px-1.5 py-0.5 rounded shrink-0">
              {pharmacy.distance?.toFixed(1)} km
            </div>
          </div>

          {/* Prominent Opening Hours */}
          {pharmacy.openingHours && (
            <div className="text-[9px] font-bold text-primary/80 uppercase tracking-widest mt-0.5">
              {pharmacy.openingHours}
            </div>
          )}

          {/* Address */}
          <div className="flex items-center gap-1.5 text-[10px] text-foreground/80 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0 text-primary" strokeWidth={2.5} />
            <span className="font-medium truncate">{pharmacy.address}</span>
          </div>

          {/* Confidence Badge */}
          {confidenceBadge}

          <div className="flex-1" />

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-1">
            <Button
              variant="default"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest h-8 shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                handleNavigate()
              }}
            >
              <Navigation className="mr-1.5 h-3 w-3" strokeWidth={3} />
              Navegar
            </Button>

            <Button
              variant="outline"
              className="w-8 h-8 p-0 border-green-500/20 hover:border-green-500/50 hover:bg-green-500/5 text-green-600"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Button>
          </div>
          
          {/* Quick Feedback Section */}
          <div className="flex flex-col gap-1 mt-1.5 pt-1.5 border-t border-border/60">
             <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">¿Está abierta?</span>
             <div className="flex items-center gap-1.5">
               <Button 
                 size="sm" 
                 variant="outline" 
                 className="flex-1 h-7 text-[9px] gap-1 bg-green-50/50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 font-bold uppercase"
                 disabled={isReporting}
                 onClick={(e) => { e.stopPropagation(); handleQuickReport(true); }}
               >
                  {isReporting ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <ThumbsUp className="w-2.5 h-2.5"/>} Sí, está abierta
               </Button>
               <Button 
                 size="sm" 
                 variant="outline" 
                 className="flex-1 h-7 text-[9px] gap-1 bg-red-50/50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 font-bold uppercase"
                 disabled={isReporting}
                 onClick={(e) => { e.stopPropagation(); handleQuickReport(false); }}
               >
                  {isReporting ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <ThumbsDown className="w-2.5 h-2.5"/>} No, está cerrada
               </Button>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
