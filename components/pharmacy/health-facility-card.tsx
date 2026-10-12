'use client'

import { Navigation, ExternalLink, HeartPulse, Hospital, Users, Cross, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { HealthFacility } from '@/lib/health-facility-data'
import { getHealthDatasetDescription, getHealthDatasetUrl } from '@/lib/health-facility-data'
import { calculateDistance, cn } from '@/lib/utils'
import { toTitleCase } from '@/lib/locality-utils'

interface HealthFacilityCardProps {
  facility: HealthFacility
  isSelected?: boolean
  userLocation?: [number, number] | null
  onSelect?: (facility: HealthFacility) => void
}

export function HealthFacilityCard({
  facility,
  isSelected,
  userLocation,
  onSelect,
}: HealthFacilityCardProps) {
  const distance = userLocation
    ? calculateDistance(userLocation[0], userLocation[1], facility.lat, facility.lng)
    : undefined

  const typeConfig = {
    'NODO SANITARIO': {
      icon: Hospital,
      badgeClass: 'bg-red-600 text-white',
      borderClass: 'border-l-red-600 bg-red-500/5',
      iconClass: 'text-red-600 dark:text-red-400 bg-red-500/10',
    },
    CAPS: {
      icon: HeartPulse,
      badgeClass: 'bg-rose-600 text-white',
      borderClass: 'border-l-rose-600 bg-rose-500/5',
      iconClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
    },
    CIC: {
      icon: Users,
      badgeClass: 'bg-teal-600 text-white',
      borderClass: 'border-l-teal-600 bg-teal-500/5',
      iconClass: 'text-teal-600 dark:text-teal-400 bg-teal-500/10',
    },
    'PUESTO DE SALUD': {
      icon: Cross,
      badgeClass: 'bg-orange-600 text-white',
      borderClass: 'border-l-orange-600 bg-orange-500/5',
      iconClass: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
    },
  }[facility.type] || {
    icon: Cross,
    badgeClass: 'bg-red-600 text-white',
    borderClass: 'border-l-red-600 bg-red-500/5',
    iconClass: 'text-red-600 bg-red-500/10',
  }

  const Icon = typeConfig.icon
  const officialUrl = facility.datasetUrl || getHealthDatasetUrl(facility.type, facility.datasetId)

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 overflow-hidden relative rounded-xl',
        isSelected ? 'ring-2 ring-primary ring-offset-1 bg-card' : 'hover:bg-card/70',
        typeConfig.borderClass,
      )}
      onClick={() => onSelect?.(facility)}
    >
      <CardContent className="p-3.5">
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className={cn('p-2 rounded-xl shrink-0 mt-0.5', typeConfig.iconClass)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5', typeConfig.badgeClass)}>
                    {facility.type}
                  </Badge>
                  {distance !== undefined && (
                    <span className="text-[10px] font-bold text-muted-foreground ml-auto">
                      {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-black text-foreground text-sm tracking-tight leading-snug mt-1 line-clamp-2">
                  {toTitleCase(facility.name)}
                </h3>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pl-0.5">
            <div className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{facility.locality}</span>
            </div>
            <p className="text-[11px] text-foreground/80 line-clamp-1 mt-0.5">
              {getHealthDatasetDescription(facility.type)}
            </p>
            <p className="text-[10px] text-muted-foreground/80 truncate">
              {facility.authority} · Jurisdicción {facility.jurisdiction.toLowerCase()}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-1 flex items-center gap-2 pt-2 border-t border-border/40">
            <Button
              size="sm"
              className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              onClick={(event) => {
                event.stopPropagation()
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }}
            >
              <Navigation className="h-3.5 w-3.5" /> Cómo llegar
            </Button>
            <Button
              asChild
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
              title="Ver fuente oficial en IDEJuy"
              onClick={(event) => event.stopPropagation()}
            >
              <a href={officialUrl} target="_blank" rel="noreferrer" aria-label="Ver fuente oficial en IDEJuy">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

