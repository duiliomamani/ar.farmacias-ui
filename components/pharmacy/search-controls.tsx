'use client'

import { CalendarDays, Crosshair, MapPin, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { normalizeLocalityName, LOCALITY_CANONICAL_MAP, cleanText, toTitleCase } from '@/lib/locality-utils'

export interface LocalityOption {
  name: string
  count?: number
}

interface SearchControlsProps {
  searchQuery: string
  onSearchChange: (value: string) => void
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
  activeTab?: 'pharmacies' | 'health' | 'fire'
  className?: string
}

export function SearchControls({
  searchQuery,
  onSearchChange,
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
  const searchPlaceholder = activeTab === 'health'
    ? 'Buscar hospital, CAPS, nodo o salita...'
    : activeTab === 'fire'
      ? 'Buscar cuartel de bomberos o localidad...'
      : 'Buscar por nombre, dirección o localidad'

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

  // Detección predictiva de paraje o barrio hacia municipio cabecera
  const cleanQ = cleanText(searchQuery)
  const suggestedCanonical = (() => {
    if (!cleanQ || cleanQ.length < 3) return null

    for (const [key, canonical] of Object.entries(LOCALITY_CANONICAL_MAP)) {
      if (key === cleanQ || (cleanQ.length >= 4 && key.includes(cleanQ)) || cleanQ.includes(key)) {
        if (cleanText(canonical) !== cleanQ && cleanText(currentNormalizedCity) !== cleanText(canonical)) {
          return { match: toTitleCase(key), canonical }
        }
      }
    }
    return null
  })()

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

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 bg-card pl-9 pr-9 text-xs font-medium"
          aria-label={searchPlaceholder}
        />
        {searchQuery && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
            onClick={() => onSearchChange('')}
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Predictive Canonical Locality Resolution Banner */}
      {suggestedCanonical && (
        <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-2 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-1.5 text-primary min-w-0 font-medium">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              <strong>{suggestedCanonical.match}</strong> es parte de <strong>{suggestedCanonical.canonical}</strong>
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider shrink-0 rounded-lg ml-2 shadow-xs"
            onClick={() => {
              onCityChange(suggestedCanonical.canonical)
              onSearchModeChange('locality')
              onSearchChange('')
            }}
          >
            Filtrar {suggestedCanonical.canonical}
          </Button>
        </div>
      )}

      {/* Locality Search Controls */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-card/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-primary" />
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
                  Todas las localidades ({uniqueOptions.reduce((acc, curr) => acc + (curr.count || 0), 0) || 'Todas'})
                </SelectItem>
                {uniqueOptions.map((opt) => (
                  <SelectItem key={opt.name} value={opt.name}>
                    <span className="flex items-center justify-between w-full gap-2">
                      <span>{opt.name}</span>
                      {opt.count !== undefined && (
                        <span className="text-[10px] text-muted-foreground font-semibold">({opt.count})</span>
                      )}
                    </span>
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
