'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { SearchControls } from './search-controls'
import { PharmacyList } from './pharmacy-list'
import { BottomSheet } from './bottom-sheet'
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
import { useIsMobile } from '@/hooks/use-mobile'
import { Pill, HeartPulse } from 'lucide-react'
import { getDeviceId, calculateDistance, getEffectiveDutyDate } from '@/lib/utils'
import { toast } from 'sonner'

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
  const isMobile = useIsMobile()
  const [radius, setRadius] = useState(5)
  const [isLocating, setIsLocating] = useState(false)
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-24.1858, -65.2995])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true)
  const [searchMode, setSearchMode] = useState<'nearby' | 'locality'>('nearby')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateInputValue(getEffectiveDutyDate()))
  const [travelMode, setTravelMode] = useState<TravelMode>('driving')

  // New Filter States
  const [onlyOnDuty, setOnlyOnDuty] = useState(true)

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
    const grouped = groupPharmacies(rawPharmacies);
    const center = userLocation || mapCenter

    // Recalculate distance based on actual user location
    return grouped.map(p => ({
      ...p,
      distance: calculateDistance(center[0], center[1], p.lat, p.lng)
    }));
  }, [rawPharmacies, userLocation, mapCenter]);

  // Filter and sort pharmacies (local filtering for on-duty and radius)
  const filteredPharmacies = useMemo(() => {
    let result = searchMode === 'locality'
      ? groupedPharmacies
      : filterPharmacies(groupedPharmacies, radius)

    if (onlyOnDuty) {
      result = result.filter(p => p.isOnDuty);
    }

    return sortPharmacies(result);
  }, [groupedPharmacies, radius, onlyOnDuty, searchMode]);

  const isLoading = isDataLoading || isLocating

  const handleSelectPharmacy = useCallback((pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy)
    setMapCenter([pharmacy.lat, pharmacy.lng])
  }, [])

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-background flex flex-col">
        {/* Mobile Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
                <HeartPulse className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="font-heading font-black text-foreground tracking-tighter text-lg">FarmaYa AR</span>
            </div>
            <div className="flex items-center gap-1">
              <JujuyDevLinks />
              <Feedback inline />
              <ThemeToggle />
            </div>
          </div>
        </div>

        <>
            {/* Floating Search Bar */}
            <div className="absolute top-[56px] left-0 right-0 z-40 p-3 pb-2">
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
                className="bg-card/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-border/50"
              />
            </div>

            {/* Full Screen Map */}
            <div className="absolute inset-0 z-0">
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
            </div>

            {/* Bottom Sheet with Pharmacy List */}
            <BottomSheet isOpen={isBottomSheetOpen} onOpenChange={setIsBottomSheetOpen}>
              <PharmacyList
                pharmacies={filteredPharmacies}
                selectedPharmacy={selectedPharmacy}
                userLocation={userLocation}
                onSelectPharmacy={handleSelectPharmacy}
                isLoading={isLoading}
                viewMode="map"
              />
            </BottomSheet>

        </>
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      {/* Top Navbar */}
      <header className="h-16 border-b bg-card shadow-sm z-50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-md ring-4 ring-primary/5">
            <HeartPulse className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-heading font-black text-foreground tracking-tighter leading-tight">FarmaYa AR</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <JujuyDevLinks />
            <Feedback inline />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Search & List Panel (Desktop) */}
        <div className="flex w-[380px] flex-col border-r bg-card/50 backdrop-blur-sm z-40 shadow-xl">
          {/* Search Controls Container */}
          <div className="p-4 border-b bg-muted/20">
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

        {/* Map Panel (Desktop) */}
        <div className="flex-1 relative z-0">
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
        </div>
      </main>

    </div>
  )
}
