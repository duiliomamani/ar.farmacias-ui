'use client'
import { Crosshair, Search, MapPin, Pill, CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface SearchControlsProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  radius: number
  onRadiusChange: (value: number) => void
  onUseMyLocation: () => void
  isLocating: boolean
  selectedDate: Date
  onDateChange: (date: Date) => void
  onlyOnDuty: boolean
  className?: string
}

export function SearchControls({
  radius,
  onRadiusChange,
  onUseMyLocation,
  isLocating,
  selectedDate,
  onDateChange,
  onlyOnDuty,
  className,
}: Omit<SearchControlsProps, 'searchQuery' | 'onSearchChange'>) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Date & On-Duty Toggle Row */}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal h-10 bg-card border-border",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              <span className="text-xs font-bold">
                {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={onUseMyLocation}
          disabled={isLocating}
          className="h-10 w-10 shrink-0 bg-card border-border shadow-sm text-primary hover:bg-primary/5"
          title="Mi ubicación"
        >
          <Crosshair className={cn("h-5 w-5", isLocating && "animate-spin")} strokeWidth={2.5} />
        </Button>
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
