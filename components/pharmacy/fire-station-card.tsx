'use client'

import { Navigation, ExternalLink, Flame, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FireStation } from '@/lib/fire-station-data'
import { IDEJUY_FIRE_STATIONS_URL } from '@/lib/fire-station-data'
import { calculateDistance, cn } from '@/lib/utils'
import { toTitleCase } from '@/lib/locality-utils'

interface FireStationCardProps {
  station: FireStation
  isSelected?: boolean
  userLocation?: [number, number] | null
  onSelect?: (station: FireStation) => void
}

export function FireStationCard({
  station,
  isSelected,
  userLocation,
  onSelect,
}: FireStationCardProps) {
  const distance = userLocation
    ? calculateDistance(userLocation[0], userLocation[1], station.lat, station.lng)
    : undefined

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 border-l-orange-500 bg-orange-500/5 overflow-hidden relative rounded-xl',
        isSelected ? 'ring-2 ring-orange-500 ring-offset-1 bg-card' : 'hover:bg-card/70',
      )}
      onClick={() => onSelect?.(station)}
    >
      <CardContent className="p-3.5">
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl shrink-0 mt-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Flame className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                    {station.type || 'BOMBEROS'}
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
              className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
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
              className="h-8 px-2.5 rounded-lg gap-1 border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:text-orange-300 font-bold text-xs shrink-0"
              title="Llamar al 100 de Bomberos"
              onClick={(event) => event.stopPropagation()}
            >
              <a href="tel:100" aria-label="Llamar al 100">
                <Phone className="h-3.5 w-3.5" /> 100
              </a>
            </Button>
            <Button
              asChild
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
              title="Ver fuente oficial en IDEJuy"
              onClick={(event) => event.stopPropagation()}
            >
              <a href={IDEJUY_FIRE_STATIONS_URL} target="_blank" rel="noreferrer" aria-label="Ver fuente oficial en IDEJuy">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

