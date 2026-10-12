'use client'

import { useEffect, useRef } from 'react'
import { PoliceStationCard } from './police-station-card'
import type { PoliceStation } from '@/lib/police-station-data'
import { Shield, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PoliceStationListProps {
  stations: PoliceStation[]
  selectedStation?: PoliceStation | null
  userLocation?: [number, number] | null
  onSelectStation?: (station: PoliceStation) => void
  isLoading?: boolean
}

export function PoliceStationList({
  stations,
  selectedStation,
  userLocation,
  onSelectStation,
  isLoading,
}: PoliceStationListProps) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!selectedStation?.id) return
    const frame = window.requestAnimationFrame(() => {
      const card = cardRefs.current.get(selectedStation.id)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      card?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [selectedStation?.id])

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header and 911 Emergency Banner */}
      <div className="px-3 py-2.5 border-b bg-card/90 backdrop-blur-md sticky top-0 z-10 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-blue-600" />
            {stations.length} {stations.length === 1 ? 'dependencia policial' : 'dependencias policiales'}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">IDEJuy Seguridad #150</span>
        </div>

        {/* Emergency Alert Box */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/10 border border-blue-500/25">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
              Emergencias y Denuncias
            </span>
          </div>
          <Button asChild size="sm" className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs gap-1 rounded-lg shadow-xs">
            <a href="tel:911" aria-label="Llamar al 911">
              <Phone className="h-3 w-3" /> 911
            </a>
          </Button>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-20 sm:pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="animate-spin bg-blue-500/10 rounded-full p-6 mb-4 ring-8 ring-blue-500/5 text-blue-600">
              <Shield className="h-10 w-10" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tight text-base animate-pulse">
              Cargando comisarías y dependencias...
            </p>
          </div>
        ) : stations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="bg-muted rounded-full p-6 mb-4 ring-8 ring-muted/30 text-muted-foreground/40">
              <Shield className="h-10 w-10" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tight text-base">No hay comisarías en esta zona</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
              Probá seleccionar otra localidad o ampliar el radio de búsqueda.
            </p>
          </div>
        ) : (
          stations.map((station) => (
            <div
              key={station.id}
              ref={(element) => {
                if (element) cardRefs.current.set(station.id, element)
                else cardRefs.current.delete(station.id)
              }}
              aria-current={selectedStation?.id === station.id ? 'true' : undefined}
              className="scroll-my-4"
            >
              <PoliceStationCard
                station={station}
                isSelected={selectedStation?.id === station.id}
                userLocation={userLocation}
                onSelect={onSelectStation}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
