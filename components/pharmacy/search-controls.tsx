'use client'

import { CalendarDays, Crosshair, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { normalizeLocalityName } from '@/lib/locality-utils'

export interface LocalityOption {
  name: string
  count?: number
}

interface SearchControlsProps {
  radius: number
  onRadiusChange: (value: number) => void
  onUseMyLocation: () => void
  isLocating: boolean
  searchMode: 'nearby' | 'locality'
  onSearchModeChange: (value: 'nearby' | 'locality') => void
  selectedCity: string
  onCityChange: (value: string) => void
  selectedDate: string
  onDateChange: (value: string) => void
  cities: (string | LocalityOption)[]
  activeTab?: 'pharmacies' | 'health' | 'fire' | 'police'
  className?: string
}

export function SearchControls({
  radius,
  onRadiusChange,
  onUseMyLocation,
  isLocating,
  searchMode,
  onSearchModeChange,
  selectedCity,
  onCityChange,
  selectedDate,
  onDateChange,
  cities,
  activeTab = 'pharmacies',
  className,
}: SearchControlsProps) {
  // Normalizar opciones de localidad con formato Capitalize y conteos
  const normalizedOptions: LocalityOption[] = cities.map((c) => {
    if (typeof c === 'string') {
      return { name: normalizeLocalityName(c) }
    }
    return { name: normalizeLocalityName(c.name), count: c.count }
  })

  // Deduplicar si diferentes nombres originales se mapearon a la misma cabecera (ej: Barrio El Milagro -> Monterrico)
  const uniqueOptionsMap = new Map<string, LocalityOption>()
  normalizedOptions.forEach((opt) => {
    const existing = uniqueOptionsMap.get(opt.name)
    if (existing) {
      existing.count = (existing.count || 0) + (opt.count || 0)
    } else {
      uniqueOptionsMap.set(opt.name, { ...opt })
    }
  })
  const uniqueOptions = [...uniqueOptionsMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const currentNormalizedCity = selectedCity ? normalizeLocalityName(selectedCity) : ''

  return (
    <div className={cn('space-y-3', className)}>
      {/* Location Actions Row */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 justify-start text-left font-normal h-10 bg-card border-border"
          onClick={onUseMyLocation}
          disabled={isLocating}
        >
          <Crosshair className={cn('mr-2 h-4 w-4 text-primary', isLocating && 'animate-spin')} />
          <span className="text-xs font-bold">
            {isLocating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
          </span>
        </Button>
      </div>

      {/* Locality Search Controls */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-card/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Buscar por localidad
            </Label>
          </div>
          <Switch
            checked={searchMode === 'locality'}
            onCheckedChange={(checked) => onSearchModeChange(checked ? 'locality' : 'nearby')}
            aria-label="Buscar por localidad"
          />
        </div>

        {searchMode === 'locality' && (
          <div className={cn('grid gap-2', activeTab === 'pharmacies' ? 'sm:grid-cols-2' : 'grid-cols-1')}>
            <Select
              value={currentNormalizedCity || 'TODAS'}
              onValueChange={(value) => onCityChange(!value || value === 'TODAS' ? '' : value)}
            >
              <SelectTrigger className="w-full bg-background text-xs">
                <SelectValue placeholder="Todas las localidades" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="TODAS">
                  Todas las localidades
                </SelectItem>
                {uniqueOptions.map((option) => (
                  <SelectItem key={option.name} value={option.name}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fecha sólo para Farmacias (turnos rotativos) */}
            {activeTab === 'pharmacies' && (
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => onDateChange(event.target.value)}
                  className="h-9 pl-9 text-xs"
                  aria-label="Fecha de turnos de farmacia"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Radius Slider */}
      {searchMode === 'nearby' && (
        <div className="space-y-3 bg-card/50 p-3 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
              Radio de búsqueda
            </Label>
            <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {radius < 1 ? `${radius * 1000}m` : `${radius} km`}
            </span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={(value) => {
              if (Array.isArray(value) && typeof value[0] === 'number') {
                onRadiusChange(value[0])
              } else if (typeof value === 'number') {
                onRadiusChange(value)
              }
            }}
            min={0.5}
            max={20}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
            <span>0.5 km</span>
            <span>10 km</span>
            <span>20 km</span>
          </div>
        </div>
      )}
    </div>
  )
}
