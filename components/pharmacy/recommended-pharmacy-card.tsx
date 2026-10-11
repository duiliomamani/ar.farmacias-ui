'use client'

import { Navigation, Phone, Sparkles, Star } from 'lucide-react'
import type { PharmacyRecommendation } from '@/lib/pharmacy-ranking'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RecommendedPharmacyCardProps {
  recommendation: PharmacyRecommendation
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}

export function RecommendedPharmacyCard({
  recommendation,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: RecommendedPharmacyCardProps) {
  const { pharmacy, reasons } = recommendation

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 shadow-sm">
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Mejor opción ahora
            </p>
            <h2 className="mt-1 truncate font-heading text-base font-black uppercase tracking-tight text-foreground">
              {pharmacy.name}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{pharmacy.address}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-full"
            aria-label={isFavorite ? `Quitar ${pharmacy.name} de favoritas` : `Guardar ${pharmacy.name} como favorita`}
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
          >
            <Star className={cn('h-4 w-4', isFavorite && 'fill-amber-400 text-amber-500')} />
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {reasons.map((reason) => (
            <Badge key={reason} variant="outline" className="border-emerald-600/20 bg-background/70 text-[9px] font-bold text-emerald-800 dark:text-emerald-200">
              {reason}
            </Badge>
          ))}
          {pharmacy.distance !== undefined && (
            <Badge variant="outline" className="bg-background/70 text-[9px] font-bold">
              {pharmacy.distance.toFixed(1)} km
            </Badge>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Button type="button" className="h-9 flex-1 gap-2 font-black" onClick={onSelect}>
            <Navigation className="h-4 w-4" /> Ver ruta
          </Button>
          {pharmacy.phone && pharmacy.phone !== 'Sin teléfono' && (
            <Button asChild type="button" variant="outline" className="h-9 gap-2 bg-background/70">
              <a href={`tel:${pharmacy.phone}`} aria-label={`Llamar a ${pharmacy.name}`}>
                <Phone className="h-4 w-4" /> Llamar
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

