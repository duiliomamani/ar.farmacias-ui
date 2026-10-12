'use client'

import { useEffect, useRef } from 'react'
import { PharmacyCard } from './pharmacy-card'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { Pill, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getRecommendedPharmacy } from '@/lib/pharmacy-ranking'
import { RecommendedPharmacyCard } from './recommended-pharmacy-card'

interface PharmacyListProps {
  pharmacies: Pharmacy[]
  selectedPharmacy?: Pharmacy | null
  userLocation?: [number, number] | null
  onSelectPharmacy?: (pharmacy: Pharmacy) => void
  isLoading?: boolean
  viewMode?: 'map' | 'list'
  hideHeader?: boolean
  favoriteIds?: string[]
  onToggleFavorite?: (pharmacy: Pharmacy) => void
}

export function PharmacyList({
  pharmacies,
  selectedPharmacy,
  userLocation,
  onSelectPharmacy,
  isLoading,
  viewMode = 'map',
  hideHeader = false,
  favoriteIds = [],
  onToggleFavorite,
}: PharmacyListProps) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const recommendation = userLocation ? getRecommendedPharmacy(pharmacies) : null

  useEffect(() => {
    if (!selectedPharmacy?.id) return
    const frame = window.requestAnimationFrame(() => {
      const card = cardRefs.current.get(selectedPharmacy.id)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      card?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [selectedPharmacy?.id])

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      {!hideHeader && (
        <div className="px-4 py-2.5 border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Search className="h-3 w-3 text-primary" strokeWidth={3} />
            {pharmacies.length} {pharmacies.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </p>
          {!isLoading && pharmacies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                Actualizado
              </span>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="animate-spin bg-primary/10 rounded-full p-6 mb-4 ring-8 ring-primary/5">
              <Pill className="h-10 w-10 text-primary" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tighter text-lg animate-pulse">Buscando Farmacias...</p>
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="bg-muted rounded-full p-6 mb-4 ring-8 ring-muted/30">
              <Pill className="h-10 w-10 text-muted-foreground/40" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tighter text-lg">No hay resultados</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
              Probá borrar la búsqueda, elegir otra localidad o aumentar el radio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendation && (
              <RecommendedPharmacyCard
                recommendation={recommendation}
                isFavorite={favoriteIds.includes(recommendation.pharmacy.id)}
                onSelect={() => onSelectPharmacy?.(recommendation.pharmacy)}
                onToggleFavorite={() => onToggleFavorite?.(recommendation.pharmacy)}
              />
            )}
            <div
              className={cn(
                viewMode === 'list'
                  ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col space-y-4',
              )}
            >
              {[
                { title: 'Farmacias permanentes', items: pharmacies.filter((pharmacy) => pharmacy.isPermanentlyOnDuty) },
                { title: 'Turnos del día', items: pharmacies.filter((pharmacy) => pharmacy.isOnDuty && !pharmacy.isPermanentlyOnDuty && !pharmacy.isVoluntary) },
                { title: 'Turnos voluntarios', items: pharmacies.filter((pharmacy) => pharmacy.isVoluntary) },
              ].map((section) => section.items.length > 0 && (
                <div key={section.title} className={viewMode === 'list' ? 'contents' : 'space-y-2'}>
                  <div className="flex items-center gap-2 px-1 pt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {section.title} ({section.items.length})
                  </div>
                  <div className={cn(viewMode === 'list' ? 'contents' : 'flex flex-col space-y-4')}>
                    {section.items.map((pharmacy) => (
                      <div
                        key={pharmacy.id}
                        ref={(element) => {
                          if (element) cardRefs.current.set(pharmacy.id, element)
                          else cardRefs.current.delete(pharmacy.id)
                        }}
                        aria-current={selectedPharmacy?.id === pharmacy.id ? 'true' : undefined}
                        className="scroll-my-4"
                      >
                        <PharmacyCard
                          pharmacy={pharmacy}
                          isSelected={selectedPharmacy?.id === pharmacy.id}
                          userLocation={userLocation}
                          onSelect={onSelectPharmacy}
                          isFavorite={favoriteIds.includes(pharmacy.id)}
                          onToggleFavorite={onToggleFavorite}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
