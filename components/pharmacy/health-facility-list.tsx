'use client'

import { useEffect, useRef, useState } from 'react'
import { HealthFacilityCard } from './health-facility-card'
import type { HealthFacility, HealthFacilityType } from '@/lib/health-facility-data'
import { HeartPulse, Hospital, Users, Cross, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HealthFacilityListProps {
  facilities: HealthFacility[]
  selectedFacility?: HealthFacility | null
  userLocation?: [number, number] | null
  onSelectFacility?: (facility: HealthFacility) => void
  isLoading?: boolean
}

type HealthSubtypeFilter = 'ALL' | HealthFacilityType

export function HealthFacilityList({
  facilities,
  selectedFacility,
  userLocation,
  onSelectFacility,
  isLoading,
}: HealthFacilityListProps) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const [selectedSubtype, setSelectedSubtype] = useState<HealthSubtypeFilter>('ALL')

  useEffect(() => {
    if (!selectedFacility?.id) return
    const frame = window.requestAnimationFrame(() => {
      const card = cardRefs.current.get(selectedFacility.id)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      card?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [selectedFacility?.id])

  const filtered = selectedSubtype === 'ALL'
    ? facilities
    : facilities.filter((f) => f.type === selectedSubtype)

  const counts = {
    ALL: facilities.length,
    'NODO SANITARIO': facilities.filter((f) => f.type === 'NODO SANITARIO').length,
    CAPS: facilities.filter((f) => f.type === 'CAPS').length,
    CIC: facilities.filter((f) => f.type === 'CIC').length,
    'PUESTO DE SALUD': facilities.filter((f) => f.type === 'PUESTO DE SALUD').length,
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Subtype Filter Pills */}
      <div className="px-3 py-2 border-b bg-card/90 backdrop-blur-md sticky top-0 z-10 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <Search className="h-3 w-3 text-red-600" />
            {filtered.length} {filtered.length === 1 ? 'centro encontrado' : 'centros encontrados'}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">IDEJuy Salud</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { key: 'ALL', label: 'Todos', count: counts.ALL },
            { key: 'NODO SANITARIO', label: 'Nodos', count: counts['NODO SANITARIO'] },
            { key: 'CAPS', label: 'CAPS', count: counts.CAPS },
            { key: 'CIC', label: 'CIC', count: counts.CIC },
            { key: 'PUESTO DE SALUD', label: 'Puestos', count: counts['PUESTO DE SALUD'] },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedSubtype(tab.key as HealthSubtypeFilter)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0',
                selectedSubtype === tab.key
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span>{tab.label}</span>
              <span className={cn('text-[10px] px-1 py-0.2 rounded-full', selectedSubtype === tab.key ? 'bg-white/20' : 'bg-background/80')}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-20 sm:pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="animate-spin bg-red-500/10 rounded-full p-6 mb-4 ring-8 ring-red-500/5 text-red-600">
              <HeartPulse className="h-10 w-10" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tight text-base animate-pulse">
              Cargando centros de salud...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="bg-muted rounded-full p-6 mb-4 ring-8 ring-muted/30 text-muted-foreground/40">
              <Hospital className="h-10 w-10" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tight text-base">No hay centros en esta zona</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
              Probá cambiar la localidad, seleccionar otro filtro de salud o ampliar el radio de búsqueda.
            </p>
          </div>
        ) : (
          filtered.map((facility) => (
            <div
              key={facility.id}
              ref={(element) => {
                if (element) cardRefs.current.set(facility.id, element)
                else cardRefs.current.delete(facility.id)
              }}
              aria-current={selectedFacility?.id === facility.id ? 'true' : undefined}
              className="scroll-my-4"
            >
              <HealthFacilityCard
                facility={facility}
                isSelected={selectedFacility?.id === facility.id}
                userLocation={userLocation}
                onSelect={onSelectFacility}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

