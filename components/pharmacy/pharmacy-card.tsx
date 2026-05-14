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
  const isPending =
    pharmacy.verificationStatus === "pending" ||
    pharmacy.verificationStatus === "community_verified";

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-xl border-l-8 overflow-hidden group relative",
        isSelected ? "ring-2 ring-primary ring-offset-2" : "hover:bg-card/50",
        pharmacy.isOnDuty
          ? "border-l-primary bg-primary/5"
          : "border-l-muted-foreground/20"
      )}
      onClick={() => onSelect?.(pharmacy)}
    >
      <CardContent className="p-4">
        {/* Activity & Status Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5">
            {isHighActivity && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-[10px] font-black uppercase tracking-widest gap-1 py-0.5 shadow-sm">
                <Flame className="h-3 w-3 fill-white" />
                Alta Actividad
              </Badge>
            )}
            {pharmacy.verificationStatus === 'community_verified' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-black uppercase tracking-widest gap-1 py-0.5">
                <Check className="h-3 w-3" />
                Verificado Comunidad
              </Badge>
            )}
            {pharmacy.verificationStatus === 'pending' && (
              <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-50 text-[10px] font-black uppercase tracking-widest gap-1 py-0.5">
                <Info className="h-3 w-3" />
                Pendiente Turno
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {pharmacy.distance?.toFixed(1)} km
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Main Info */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading font-black text-foreground leading-tight text-lg tracking-tighter uppercase group-hover:text-primary transition-colors">
                {pharmacy.name}
              </h3>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm',
                  pharmacy.isOnDuty
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {pharmacy.isOnDuty
                  ? (pharmacy.isPermanentlyOnDuty || pharmacy.openingHours?.toLowerCase().includes('24hs')
                      ? 'Atención Permanente 24hs'
                      : (() => {
                          if (!pharmacy.dutyUntil) return 'Abierta ahora';
                          const until = new Date(pharmacy.dutyUntil);
                          const now = new Date();
                          const isTomorrow = until.getDate() !== now.getDate();
                          const timeStr = until.toLocaleTimeString('es-AR', { 
                            timeZone: 'America/Argentina/Buenos_Aires', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) + 'hs';
                          return isTomorrow ? `De Turno hasta mañana ${timeStr}` : `De Turno hasta las ${timeStr}`;
                        })())
                  : 'Cerrado temporalmente'}
              </Badge>
              {pharmacy.openingHours && !pharmacy.openingHours.toLowerCase().includes('24hs') && (
                <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest ml-1">
                  • {pharmacy.openingHours}
                </span>
              )}
              {pharmacy.lastConfirmed && (
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 italic">
                  <Check className="h-3 w-3 text-green-500" />
                  {pharmacy.lastConfirmed}
                </span>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 text-sm text-foreground/80 bg-muted/30 p-2 rounded-lg border border-border/50">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" strokeWidth={2.5} />
            <span className="font-medium">{pharmacy.address}</span>
          </div>

          {/* Report Button */}
          <ReportPharmacyModal 
            pharmacy={pharmacy} 
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 font-bold text-[10px] uppercase h-9 gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Camera className="h-3.5 w-3.5" />
                ¿Está abierta ahora? Reportar Estado
              </Button>
            }
          />

          {/* Quick Action Row */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest h-12 shadow-lg"
              onClick={(e) => {
                e.stopPropagation()
                handleNavigate()
              }}
            >
              <Navigation className="mr-2 h-4 w-4" strokeWidth={3} />
              Navegar
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-12 h-12 p-0 border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCall()
                }}
              >
                <Phone className="h-5 w-5" strokeWidth={2.5} />
              </Button>
              <Button
                variant="outline"
                className="w-12 h-12 p-0 border-2 border-green-500/20 hover:border-green-500/50 hover:bg-green-500/5 text-green-600"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShare()
                }}
              >
                <Share2 className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
