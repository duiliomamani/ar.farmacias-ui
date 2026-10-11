'use client'
import { CalendarDays, Crosshair, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
  cities: string[]
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
  className,
}: Omit<SearchControlsProps, 'searchQuery' | 'onSearchChange'>) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Location Actions Row */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 justify-start text-left font-normal h-10 bg-card border-border"
          onClick={onUseMyLocation}
          disabled={isLocating}
        >
          <Crosshair className={cn("mr-2 h-4 w-4 text-primary", isLocating && "animate-spin")} />
          <span className="text-xs font-bold">
            {isLocating ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}
          </span>
        </Button>
      </div>

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
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={selectedCity || 'ALL'} onValueChange={(value) => onCityChange(value === 'ALL' ? '' : value)}>
              <SelectTrigger className="w-full bg-background text-xs">
                <SelectValue placeholder="Todas las localidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las localidades</SelectItem>
                {cities.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => onDateChange(event.target.value)}
                className="h-9 pl-9 text-xs"
                aria-label="Fecha de turnos"
              />
            </div>
          </div>
        )}
      </div>

      {/* Radius Slider */}
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
          onValueChange={(value) => onRadiusChange(value[0])}
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
    </div>
  )
}
