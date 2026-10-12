'use client'

import { Navigation, ExternalLink, Shield, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PoliceStation } from '@/lib/police-station-data'
import { IDEJUY_POLICE_STATIONS_URL } from '@/lib/police-station-data'
import { calculateDistance, cn } from '@/lib/utils'
import { toTitleCase } from '@/lib/locality-utils'

interface PoliceStationCardProps {
  station: PoliceStation
  isSelected?: boolean
  userLocation?: [number, number] | null
  onSelect?: (station: PoliceStation) => void
}

export function PoliceStationCard({
  station,
  isSelected,
  userLocation,
  onSelect,
}: PoliceStationCardProps) {
  const distance = userLocation
    ? calculateDistance(userLocation[0], userLocation[1], station.lat, station.lng)
    : undefined

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 border-l-blue-600 bg-blue-500/5 overflow-hidden relative rounded-xl',
        isSelected ? 'ring-2 ring-blue-600 ring-offset-1 bg-card' : 'hover:bg-card/70',
      )}
      onClick={() => onSelect?.(station)}
    >
      <CardContent className="p-3.5">
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl shrink-0 mt-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                    {station.type || 'COMISARÍA'}
                  </Badge>
                  {distance !== undefined && (
                    <span className="text-[10px] font-bold text-muted-foreground ml-auto">
                      {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-black text-foreground text-sm tracking-tight leading-snug mt-1 line-clamp-2">
                  {toTitleCase(station.name)}
                </h3>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pl-0.5">
            <div className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{station.locality}</span>
            </div>
            {station.description && (
              <p className="text-[11px] text-foreground/80 line-clamp-1 mt-0.5">
                {station.description}
              </p>
            )}
            {station.authority && (
              <p className="text-[10px] text-muted-foreground/80 truncate">
                {station.authority}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-1 flex items-center gap-2 pt-2 border-t border-border/40">
            <Button
              size="sm"
              className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              onClick={(event) => {
                event.stopPropagation()
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }}
            >
              <Navigation className="h-3.5 w-3.5" /> Cómo llegar
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 px-2.5 rounded-lg gap-1 border-blue-500/30 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300 font-bold text-xs shrink-0"
              title="Llamar al 911 (Emergencias Policiales)"
              onClick={(event) => event.stopPropagation()}
            >
              <a href="tel:911" aria-label="Llamar al 911">
                <Phone className="h-3.5 w-3.5" /> 911
              </a>
            </Button>
            <Button
              asChild
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
              title="Ver fuente oficial en IDEJuy (Dataset #150)"
              onClick={(event) => event.stopPropagation()}
            >
              <a href={IDEJUY_POLICE_STATIONS_URL} target="_blank" rel="noreferrer" aria-label="Ver fuente oficial en IDEJuy">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
