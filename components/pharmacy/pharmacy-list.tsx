'use client'

import { PharmacyCard } from './pharmacy-card'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { Pill, Search } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PharmacyListProps {
  pharmacies: Pharmacy[]
  selectedPharmacy?: Pharmacy | null
  onSelectPharmacy?: (pharmacy: Pharmacy) => void
  onReportOpen?: (pharmacy: Pharmacy) => void
  isLoading?: boolean
  viewMode?: 'map' | 'list'
}

export function PharmacyList({
  pharmacies,
  selectedPharmacy,
  onSelectPharmacy,
  onReportOpen,
  isLoading,
  viewMode = 'map',
}: PharmacyListProps) {
  const onDutyCount = pharmacies.filter((p) => p.isOnDuty || p.type === 'hospital').length

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      <div className="px-4 py-4 border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-black text-foreground flex items-center gap-2 tracking-tighter uppercase text-sm">
            <Pill className="h-4 w-4 text-primary" strokeWidth={3} />
            Centros Cercanos
          </h2>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              {onDutyCount} ACTIVOS
            </span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest flex items-center gap-1">
          <Search className="h-3 w-3" />
          Se encontraron {pharmacies.length} resultados
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="animate-spin bg-primary/10 rounded-full p-6 mb-4 ring-8 ring-primary/5">
              <Pill className="h-10 w-10 text-primary" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tighter text-lg animate-pulse">Buscando Farmacias...</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed italic">
              Conectando con el Centro de Emergencias Nacional
            </p>
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="bg-muted rounded-full p-6 mb-4 ring-8 ring-muted/30">
              <Pill className="h-10 w-10 text-muted-foreground/40" strokeWidth={2} />
            </div>
            <p className="text-foreground font-black uppercase tracking-tighter text-lg">No hay resultados</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
              Intentá aumentar el radio de búsqueda o cambiar los filtros de emergencia.
            </p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'list' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "flex flex-col space-y-4"
          )}>
            {pharmacies.map((pharmacy) => (
              <PharmacyCard
                key={pharmacy.id}
                pharmacy={pharmacy}
                isSelected={selectedPharmacy?.id === pharmacy.id}
                onSelect={onSelectPharmacy}
                onReportOpen={onReportOpen}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
