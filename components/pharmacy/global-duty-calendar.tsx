'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { es } from 'date-fns/locale'
import { CalendarDays, Clock3, MapPin, Pill, ShieldCheck, Sparkles } from 'lucide-react'
import { PharmacyService } from '@/lib/api'
import { groupPharmacies } from '@/lib/pharmacy-data'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface GlobalDutyCalendarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: string
  selectedCity: string
  cities: string[]
  onApply: (date: string, city: string) => void
}

function inputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inputDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function dayContext(date: string) {
  const today = inputValue(new Date())
  if (date === today) return 'Turnos de hoy'
  return date < today ? 'Historial de turnos' : 'Próximos turnos'
}

export function GlobalDutyCalendar({
  open,
  onOpenChange,
  selectedDate,
  selectedCity,
  cities,
  onApply,
}: GlobalDutyCalendarProps) {
  const [previewDate, setPreviewDate] = useState(selectedDate)
  const [previewCity, setPreviewCity] = useState(selectedCity)

  useEffect(() => {
    if (!open) return
    setPreviewDate(selectedDate)
    setPreviewCity(selectedCity)
  }, [open, selectedCity, selectedDate])

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['global-duty-calendar', previewDate, previewCity],
    queryFn: () => PharmacyService.getByDate(
      new Date(`${previewDate}T12:00:00-03:00`).toISOString(),
      previewCity || undefined,
    ),
    enabled: open,
    retry: false,
  })

  const pharmacies = useMemo(() => groupPharmacies(data), [data])
  const counts = useMemo(() => ({
    permanent: pharmacies.filter((pharmacy) => pharmacy.isPermanentlyOnDuty).length,
    official: pharmacies.filter((pharmacy) => pharmacy.isOnDuty && !pharmacy.isPermanentlyOnDuty && !pharmacy.isVoluntary).length,
    voluntary: pharmacies.filter((pharmacy) => pharmacy.isVoluntary).length,
  }), [pharmacies])
  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(inputDate(previewDate))
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-3xl">
        <div className="border-b bg-linear-to-br from-primary/15 via-card to-card px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="pr-9">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <CalendarDays className="h-5 w-5" />
            </div>
            <DialogTitle className="font-heading text-xl font-black tracking-tight">
              Calendario de turnos de Jujuy
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Elegí cualquier día del mes para consultar todas las farmacias conocidas, no solamente una farmacia particular.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-5 px-4 pb-2 sm:grid-cols-[minmax(280px,0.9fr)_minmax(300px,1.1fr)] sm:px-6">
          <div className="space-y-3">
            <Calendar
              mode="single"
              locale={es}
              selected={inputDate(previewDate)}
              defaultMonth={inputDate(previewDate)}
              onSelect={(date) => date && setPreviewDate(inputValue(date))}
              className="mx-auto w-full rounded-2xl border bg-card p-3 shadow-sm [--cell-size:--spacing(9)]"
              classNames={{ root: 'w-full', month: 'w-full flex flex-col gap-4' }}
            />

            <Select value={previewCity || 'TODAS'} onValueChange={(value) => setPreviewCity(!value || value === 'TODAS' ? '' : value)}>
              <SelectTrigger className="h-10 w-full bg-card text-xs font-bold" aria-label="Filtrar calendario por localidad">
                <SelectValue placeholder="Todas las localidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las localidades</SelectItem>
                {cities.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <section className="min-h-80 rounded-2xl border bg-muted/25 p-4" aria-live="polite">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{dayContext(previewDate)}</p>
            <h3 className="mt-1 font-heading text-lg font-black text-foreground">{displayDate}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {previewCity || 'Todas las localidades de Jujuy'}
            </p>

            {isLoading ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Pill className="h-7 w-7 animate-pulse text-primary" />
                </div>
                <p className="text-xs font-bold text-muted-foreground">Consultando turnos del día…</p>
              </div>
            ) : isError ? (
              <div className="mt-5 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs text-destructive">
                No pudimos consultar esa fecha. Probá nuevamente en unos segundos.
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Oficiales', value: counts.official, icon: Sparkles, color: 'text-primary' },
                    { label: 'Permanentes', value: counts.permanent, icon: ShieldCheck, color: 'text-sky-600' },
                    { label: 'Voluntarias', value: counts.voluntary, icon: Clock3, color: 'text-blue-600' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-xl border bg-card p-2.5 text-center shadow-xs">
                      <Icon className={cn('mx-auto h-4 w-4', color)} />
                      <p className="mt-1 text-lg font-black leading-none">{value}</p>
                      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider">{pharmacies.length} {pharmacies.length === 1 ? 'farmacia' : 'farmacias'}</p>
                    {pharmacies.length > 5 && <span className="text-[10px] text-muted-foreground">Primeras 5</span>}
                  </div>
                  {pharmacies.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-card/50 p-5 text-center">
                      <p className="text-sm font-bold">No hay turnos conocidos para este día</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Puede significar que todavía no fueron publicados por la fuente oficial.
                      </p>
                    </div>
                  ) : pharmacies.slice(0, 5).map((pharmacy) => (
                    <div key={pharmacy.id} className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5">
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white',
                        pharmacy.isVoluntary ? 'bg-blue-600' : pharmacy.isPermanentlyOnDuty ? 'bg-sky-600' : 'bg-primary',
                      )}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black uppercase">{pharmacy.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{pharmacy.city} · {pharmacy.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <DialogFooter className="mx-0 mb-0 px-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            type="button"
            className="gap-2 font-black"
            disabled={isLoading || isError}
            onClick={() => onApply(previewDate, previewCity)}
          >
            <CalendarDays className="h-4 w-4" />
            Ver {pharmacies.length} en mapa y lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
