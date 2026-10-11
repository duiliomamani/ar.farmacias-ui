'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { SearchControls } from './search-controls'
import { PharmacyList } from './pharmacy-list'
import { BottomSheet, type SheetState } from './bottom-sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { JujuyDevLinks } from '@/components/jujuy-dev-footer'
import { Feedback } from '@/components/feedback'
import {
  groupPharmacies,
  filterPharmacies,
  sortPharmacies,
  type Pharmacy,
} from '@/lib/pharmacy-data'
import { PharmacyService } from '@/lib/api'
import { Pill, HeartPulse, Crosshair, MapPin, SlidersHorizontal, List, Map as MapIcon, ArrowLeft } from 'lucide-react'
import { getDeviceId, calculateDistance, getEffectiveDutyDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const JUJUY_CITIES = [
  'ABRA PAMPA', 'CALILEGUA', 'EL CARMEN', 'FRAILE PINTADO', 'HUMAHUACA',
  'LA ESPERANZA', 'LA MENDIETA', 'LA QUIACA', 'LDOR. GRAL SAN MARTIN',
  'MONTERRICO', 'PALPALA', 'PERICO', 'SAN PEDRO DE JUJUY',
  'SAN SALVADOR DE JUJUY', 'TILCARA', 'YUTO',
]

const dateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type TravelMode = 'driving' | 'walking' | 'cycling'

// Dynamically import the map to avoid SSR issues with Leaflet
const PharmacyMap = dynamic(
  () => import('./pharmacy-map').then((mod) => mod.PharmacyMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse bg-primary/20 rounded-full p-4">
            <Pill className="h-8 w-8 text-primary" strokeWidth={2.5} />
          </div>
          <p className="text-muted-foreground text-sm font-medium italic">Cargando mapa nacional...</p>
        </div>
      </div>
    ),
  }
)

export function PharmacyFinder() {
  const [radius, setRadius] = useState(5)
  const [isLocating, setIsLocating] = useState(false)
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-24.1858, -65.2995])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [searchMode, setSearchMode] = useState<'nearby' | 'locality'>('nearby')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateInputValue(getEffectiveDutyDate()))
  const [travelMode, setTravelMode] = useState<TravelMode>('driving')
  // Mobile-specific UI states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [mobileSheetState, setMobileSheetState] = useState<SheetState>('collapsed')

  // Initialize device ID
  useEffect(() => {
    getDeviceId()
  }, [])

  // Auto-locate on mount
  useEffect(() => {
    handleUseMyLocation()
  }, [])

  const handleUseMyLocation = useCallback(() => {
    setIsLocating(true)

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setMapCenter(coords)
          setUserLocation(coords)
          setIsLocating(false)
        },
        (error) => {
          setIsLocating(false)
          const message = error.code === 1
            ? 'Para mostrarte las farmacias más cercanas, habilitá el permiso desde el candado del navegador y probá otra vez.'
            : error.code === 2
              ? 'No pudimos detectar tu ubicación. Revisá que el GPS o los servicios de ubicación estén activos.'
              : 'La ubicación tardó demasiado. Volvé a intentarlo cuando tengas una mejor señal.'

          toast.error(error.code === 1 ? '¿Activamos tu ubicación?' : 'No encontramos tu ubicación', {
            description: message,
            action: { label: 'Intentar de nuevo', onClick: handleUseMyLocation },
          })
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    } else {
      setIsLocating(false)
      toast.error('Ubicación no disponible', {
        description: 'Tu navegador no permite obtener la ubicación. Podés buscar por localidad y fecha.',
        action: { label: 'Intentar de nuevo', onClick: handleUseMyLocation },
      })
    }
  }, [])

  const handleSearchModeChange = useCallback((mode: 'nearby' | 'locality') => {
    setSearchMode(mode)
    if (mode === 'locality') {
      setUserLocation(null)
      setMapCenter([-24.1858, -65.2995])
    }
  }, [])

  // Data Fetching
  const { data: rawPharmacies = [], isLoading: isDataLoading } = useQuery({
    queryKey: ['pharmacies', searchMode, userLocation || mapCenter, radius, selectedCity, selectedDate],
    queryFn: async () => {
      // The duty calendar is Argentina-based. Keep the selected calendar day
      // stable even if the browser or server runs in another timezone.
      const effectiveDate = new Date(`${selectedDate}T12:00:00-03:00`).toISOString()
      if (searchMode === 'locality') {
        return PharmacyService.getByDate(effectiveDate, selectedCity || undefined)
      }
      const center = userLocation || mapCenter
      return PharmacyService.getNearby(center[0], center[1], radius * 1000, effectiveDate)
    },
    retry: false,
  })

  // Group pharmacies by location and calculate distance client-side for accuracy
  const groupedPharmacies = useMemo(() => {
    const grouped = groupPharmacies(rawPharmacies)
    const center = userLocation || mapCenter

    // Recalculate distance based on actual user location
    return grouped.map((p) => ({
      ...p,
      distance: calculateDistance(center[0], center[1], p.lat, p.lng),
    }))
  }, [rawPharmacies, userLocation, mapCenter])

  // Filter by radius when searching nearby, then sort all returned categories.
  const filteredPharmacies = useMemo(() => {
    const result = searchMode === 'locality'
      ? groupedPharmacies
      : filterPharmacies(groupedPharmacies, radius)

    return sortPharmacies(result)
  }, [groupedPharmacies, radius, searchMode])

  const isLoading = isDataLoading || isLocating

  const handleSelectPharmacy = useCallback((pharmacy: Pharmacy | null) => {
    setSelectedPharmacy(pharmacy)
    if (pharmacy) {
      setMapCenter([pharmacy.lat, pharmacy.lng])
      // On mobile, if a pharmacy was chosen from expanded sheet, collapse to partial to show map route
      setMobileSheetState('partial')
    }
  }, [])

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      {/* Top Navbar (Responsive for Mobile & Desktop) */}
      <header className="h-14 border-b bg-card/95 backdrop-blur-md shadow-sm z-50 flex items-center justify-between px-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-md ring-4 ring-primary/5 shrink-0">
            <HeartPulse className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
          </div>
          <h1 className="text-base sm:text-lg font-heading font-black text-foreground tracking-tighter leading-tight truncate">
            FarmaJUY
          </h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <JujuyDevLinks />
          <Feedback inline />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar: hidden on mobile (< md) */}
        <div className="hidden md:flex w-[380px] flex-col border-r bg-card/50 backdrop-blur-sm z-40 shadow-xl shrink-0">
          {/* Search Controls Container */}
          <div className="p-4 border-b bg-muted/20 space-y-3">
            <SearchControls
              radius={radius}
              onRadiusChange={setRadius}
              onUseMyLocation={handleUseMyLocation}
              isLocating={isLocating}
              searchMode={searchMode}
              onSearchModeChange={handleSearchModeChange}
              selectedCity={selectedCity}
              onCityChange={setSelectedCity}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              cities={JUJUY_CITIES}
            />
          </div>

          {/* Pharmacy List Container */}
          <div className="flex-1 overflow-hidden">
            <PharmacyList
              pharmacies={filteredPharmacies}
              selectedPharmacy={selectedPharmacy}
              userLocation={userLocation}
              onSelectPharmacy={handleSelectPharmacy}
              isLoading={isLoading}
              viewMode="map"
            />
          </div>
        </div>

        {/* Map Panel (Mobile & Desktop) */}
        <div className="flex-1 relative z-0 w-full h-full">
          <PharmacyMap
            pharmacies={filteredPharmacies}
            center={mapCenter}
            selectedPharmacy={selectedPharmacy}
            onSelectPharmacy={handleSelectPharmacy}
            userLocation={isLocating ? null : userLocation}
            fitToPharmacies={searchMode === 'locality'}
            travelMode={travelMode}
            onTravelModeChange={setTravelMode}
          />

          {/* Mobile-Only Overlays & Controls: hidden on md+ */}
          <div className="md:hidden">
            {/* Top Compact Search Pill or Back Button */}
            {!selectedPharmacy ? (
              <div className="absolute top-3 inset-x-3 z-30 pointer-events-auto">
                <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsFilterModalOpen(true)}
                    className="flex items-center gap-2.5 flex-1 text-left min-w-0 px-2 py-1 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-1.5 bg-primary/10 text-primary rounded-full shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground leading-tight truncate">
                        {searchMode === 'nearby'
                          ? (userLocation ? 'Cerca de mi ubicación' : 'Buscar por radio')
                          : (selectedCity || 'Todas las localidades')}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium truncate">
                        {searchMode === 'nearby' ? `Radio: ${radius} km` : `Turnos: ${selectedDate}`} · {filteredPharmacies.length} {filteredPharmacies.length === 1 ? 'farmacia' : 'farmacias'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg text-[10px] font-bold text-foreground shrink-0 border border-border/50">
                      <SlidersHorizontal className="h-3 w-3 text-primary" />
                      <span>Filtros</span>
                    </div>
                  </button>

                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0 rounded-xl bg-background"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    title="Usar mi ubicación actual"
                  >
                    <Crosshair className={cn("h-4 w-4 text-primary", isLocating && "animate-spin")} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="absolute top-3 left-3 z-30 pointer-events-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full bg-card/95 backdrop-blur-md shadow-md border border-border/80 text-xs font-bold gap-1.5 h-9 px-3.5 hover:bg-card active:scale-95 transition-all text-foreground"
                  onClick={() => handleSelectPharmacy(null)}
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                  <span>Volver a farmacias</span>
                </Button>
              </div>
            )}

            {/* Mobile Filter Modal */}
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
              <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto p-5">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    Buscar y filtrar farmacias
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <SearchControls
                    radius={radius}
                    onRadiusChange={setRadius}
                    onUseMyLocation={() => {
                      handleUseMyLocation()
                      setIsFilterModalOpen(false)
                    }}
                    isLocating={isLocating}
                    searchMode={searchMode}
                    onSearchModeChange={handleSearchModeChange}
                    selectedCity={selectedCity}
                    onCityChange={setSelectedCity}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    cities={JUJUY_CITIES}
                  />

                  <Button
                    className="w-full h-11 text-xs font-black uppercase tracking-wider shadow-md mt-2"
                    onClick={() => setIsFilterModalOpen(false)}
                  >
                    Ver {filteredPharmacies.length} {filteredPharmacies.length === 1 ? 'farmacia' : 'farmacias'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Floating Quick GPS Button on Map */}
            <div className={cn("absolute right-3.5 z-30 flex flex-col gap-2 pointer-events-auto transition-all", selectedPharmacy ? "bottom-[calc(55dvh+12px)] sm:bottom-24" : "bottom-24")}>
              <Button
                size="icon"
                variant="secondary"
                className="h-10 w-10 rounded-full shadow-lg border border-border/80 bg-card/95 backdrop-blur hover:bg-card text-primary active:scale-95 transition-all"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                aria-label="Centrar en mi ubicación"
              >
                <Crosshair className={cn("h-4.5 w-4.5", isLocating && "animate-spin")} />
              </Button>
            </div>

            {/* Floating Center Map/List Toggle Pill (only when not inspecting a single route) */}
            {!selectedPharmacy && (
              <div className="absolute bottom-[76px] inset-x-0 z-30 flex justify-center pointer-events-none">
                <Button
                  size="sm"
                  className="pointer-events-auto rounded-full shadow-xl bg-foreground text-background font-bold text-xs px-4 h-9 gap-1.5 hover:bg-foreground/90 transition-transform active:scale-95"
                  onClick={() => setMobileSheetState((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'))}
                >
                  {mobileSheetState === 'collapsed' ? (
                    <>
                      <List className="h-3.5 w-3.5" />
                      <span>Ver lista ({filteredPharmacies.length})</span>
                    </>
                  ) : (
                    <>
                      <MapIcon className="h-3.5 w-3.5" />
                      <span>Ver mapa</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Mobile Bottom Sheet for Pharmacy List (only when not inspecting a single route) */}
            {!selectedPharmacy && (
              <BottomSheet
                isOpen={true}
                sheetState={mobileSheetState}
                onStateChange={setMobileSheetState}
                peekTitle={
                  <div className="flex items-center justify-between w-full pr-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="font-heading font-black text-xs text-foreground uppercase tracking-tight">
                        {filteredPharmacies.length} {filteredPharmacies.length === 1 ? 'farmacia de turno' : 'farmacias de turno'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {mobileSheetState === 'expanded' ? 'Ver mapa' : 'Ver lista'}
                    </span>
                  </div>
                }
              >
                <PharmacyList
                  pharmacies={filteredPharmacies}
                  selectedPharmacy={selectedPharmacy}
                  userLocation={userLocation}
                  onSelectPharmacy={handleSelectPharmacy}
                  isLoading={isLoading}
                  viewMode="map"
                  hideHeader={true}
                />
              </BottomSheet>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
