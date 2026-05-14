'use client'

import { ReportPharmacyModal } from './report-pharmacy-modal'
import { Navigation, Phone, MapPin, Check, Share2, Flame, Info, Camera, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface PharmacyCardProps {
  pharmacy: Pharmacy
  isSelected?: boolean
  onSelect?: (pharmacy: Pharmacy) => void
  onReportOpen?: (pharmacy: Pharmacy) => void
}

export function PharmacyCard({ pharmacy, isSelected, onSelect }: PharmacyCardProps) {
  const { toast } = useToast()

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`
    window.open(url, '_blank')
  }

  const handleCall = () => {
    window.location.href = `tel:${pharmacy.phone}`
  }

  const handleShare = () => {
    const text = `Farmacia de Turno: ${pharmacy.name}\nDirección: ${pharmacy.address}\nTel: ${pharmacy.phone}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const isHighActivity = pharmacy.activityLevel > 70;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg border-l-4 overflow-hidden group relative",
        isSelected ? "ring-1 ring-primary ring-offset-1" : "hover:bg-card/50",
        pharmacy.isOnDuty
          ? "border-l-primary bg-primary/5"
          : "border-l-muted-foreground/20"
      )}
      onClick={() => onSelect?.(pharmacy)}
    >
      <CardContent className="p-3">
        <div className="flex flex-col gap-2.5">
          {/* Header Area */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1">
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
                  {pharmacy.isOnDuty
                    ? (pharmacy.isPermanentlyOnDuty || pharmacy.openingHours?.toLowerCase().includes('24hs')
                        ? '24hs'
                        : (() => {
                            if (!pharmacy.dutyUntil) return 'Abierta';
                            const until = new Date(pharmacy.dutyUntil);
                            const now = new Date();
                            const isTomorrow = until.getDate() !== now.getDate();
                            const timeStr = until.toLocaleTimeString('es-AR', { 
                              timeZone: 'America/Argentina/Buenos_Aires', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) + 'hs';
                            return isTomorrow ? `Turno: mañana ${timeStr}` : `Turno: ${timeStr}`;
                          })())
                    : 'Cerrada'}
                </Badge>
                {pharmacy.openingHours && !pharmacy.openingHours.toLowerCase().includes('24hs') && (
                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate max-w-[120px]">
                    {pharmacy.openingHours}
                  </span>
                )}
                {isHighActivity && (
                  <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                )}
              </div>
            </div>
            <div className="text-[10px] font-black text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
              {pharmacy.distance?.toFixed(1)} km
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/70">
            <MapPin className="h-3 w-3 shrink-0 text-primary" strokeWidth={3} />
            <span className="font-medium truncate">{pharmacy.address}</span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-0.5">
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
            
            <ReportPharmacyModal 
              pharmacy={pharmacy} 
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0 border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
              }
            />

            <Button
              variant="outline"
              className="w-8 h-8 p-0 border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary"
              onClick={(e) => {
                e.stopPropagation()
                handleCall()
              }}
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2.5} />
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
        </div>
      </CardContent>
    </Card>
  )
}
  )
}
