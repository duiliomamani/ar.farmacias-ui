'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { SearchControls } from './search-controls'
import { PharmacyList } from './pharmacy-list'
import { HealthFacilityList } from './health-facility-list'
import { FireStationList } from './fire-station-list'
import { PoliceStationList } from './police-station-list'
import { GlobalDutyCalendar } from './global-duty-calendar'
import { BottomSheet, type SheetState } from './bottom-sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { JujuyDevLinks } from '@/components/jujuy-dev-footer'
import { Feedback } from '@/components/feedback'
import { PwaActions } from '@/components/pwa-actions'
import { usePharmacyFavorites } from '@/hooks/use-pharmacy-favorites'
import { useFavoriteNotifications } from '@/hooks/use-favorite-notifications'
import {
  groupPharmacies,
  filterPharmacies,
  sortPharmacies,
  type Pharmacy,
} from '@/lib/pharmacy-data'
import type { HealthFacility } from '@/lib/health-facility-data'
import type { FireStation } from '@/lib/fire-station-data'
import type { PoliceStation } from '@/lib/police-station-data'
import { FireStationService, HealthFacilityService, PharmacyService, PoliceStationService } from '@/lib/api'
import {
  Pill,
  HeartPulse,
  Flame,
  Shield,
  Crosshair,
  MapPin,
  SlidersHorizontal,
  List,
  Map as MapIcon,
  ArrowLeft,
  CalendarDays,
} from 'lucide-react'
import { getDeviceId, calculateDistance, getEffectiveDutyDate, cn } from '@/lib/utils'
import { normalizeLocalityName, localityKey, toTitleCase } from '@/lib/locality-utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const JUJUY_CANONICAL_CITIES = [
  'Abra Pampa',
  'Calilegua',
  'El Carmen',
  'Fraile Pintado',
  'Humahuaca',
  'La Esperanza',
  'La Mendieta',
  'La Quiaca',
  'Libertador Gral. San Martín',
  'Monterrico',
  'Palpalá',
  'Perico',
  'San Pedro de Jujuy',
  'San Salvador de Jujuy',
  'Tilcara',
  'Yuto',
]

const dateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


type TravelMode = 'driving' | 'walking' | 'cycling'
type ActiveFinderTab = 'pharmacies' | 'health' | 'fire' | 'police'

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
          <p className="text-muted-foreground text-sm font-medium italic">Cargando mapa provincial...</p>
        </div>
      </div>
    ),
  }
)

export function PharmacyFinder() {
  const [activeTab, setActiveTab] = useState<ActiveFinderTab>('pharmacies')
  const [radius, setRadius] = useState(5)
  const [isLocating, setIsLocating] = useState(false)
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null)
  const [selectedHealthFacility, setSelectedHealthFacility] = useState<HealthFacility | null>(null)
  const [selectedFireStation, setSelectedFireStation] = useState<FireStation | null>(null)
  const [selectedPoliceStation, setSelectedPoliceStation] = useState<PoliceStation | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-24.1858, -65.2995])
  const [searchCenter, setSearchCenter] = useState<[number, number]>([-24.1858, -65.2995])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [searchMode, setSearchMode] = useState<'nearby' | 'locality'>('nearby')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateInputValue(getEffectiveDutyDate()))
  const [travelMode, setTravelMode] = useState<TravelMode>('driving')

  // Mobile-specific UI states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [mobileSheetState, setMobileSheetState] = useState<SheetState>('collapsed')
  const { favoriteIds, toggleFavorite } = usePharmacyFavorites()

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
          setSearchCenter(coords)
          setUserLocation(coords)
          setIsLocating(false)
        },
        (error) => {
          setIsLocating(false)
          const message = error.code === 1
            ? 'Para mostrarte los servicios más cercanos, habilitá el permiso de ubicación en el navegador.'
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
        description: 'Tu navegador no permite obtener la ubicación. Podés buscar por localidad.',
        action: { label: 'Intentar de nuevo', onClick: handleUseMyLocation },
      })
    }
  }, [])

  const handleSearchModeChange = useCallback((mode: 'nearby' | 'locality') => {
    setSearchMode(mode)
    if (mode === 'locality') {
      setMapCenter([-24.1858, -65.2995])
    }
  }, [])

  // Data Fetching: Pharmacies
  const { data: rawPharmacies = [], isLoading: isDataLoading } = useQuery({
    queryKey: searchMode === 'locality'
      ? ['pharmacies', 'locality', selectedDate]
      : ['pharmacies', 'nearby', searchCenter[0], searchCenter[1], radius, selectedDate],
    queryFn: async () => {
      const effectiveDate = new Date(`${selectedDate}T12:00:00-03:00`).toISOString()
      if (searchMode === 'locality') {
        // Cargar todas las farmacias del día para preservar contadores en vivo de todas las ciudades
        return PharmacyService.getByDate(effectiveDate)
      }
      const center = userLocation || searchCenter
      return PharmacyService.getNearby(center[0], center[1], radius * 1000, effectiveDate)
    },
    retry: false,
  })

  // Data Fetching: Health Facilities (Unified IDEJuy datasets 45, 46, 47, 48)
  const { data: rawHealthFacilities = [], isLoading: isHealthLoading } = useQuery({
    queryKey: ['health-facilities', 'idejuy'],
    queryFn: () => HealthFacilityService.getAll(),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  })

  // Data Fetching: Fire Stations (IDEJuy dataset 151)
  const { data: rawFireStations = [], isLoading: isFireLoading } = useQuery({
    queryKey: ['fire-stations', 'idejuy'],
    queryFn: () => FireStationService.getAll(),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  })

  // Data Fetching: Police Stations (IDEJuy dataset 150)
  const { data: rawPoliceStations = [], isLoading: isPoliceLoading } = useQuery({
    queryKey: ['police-stations', 'idejuy'],
    queryFn: () => PoliceStationService.getAll(),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  })

  // Group pharmacies by location and calculate distance
  const groupedPharmacies = useMemo(() => {
    const grouped = groupPharmacies(rawPharmacies)

    if (!userLocation) {
      return grouped.map((pharmacy) => ({ ...pharmacy, distance: undefined }))
    }

    return grouped.map((pharmacy) => ({
      ...pharmacy,
      distance: calculateDistance(userLocation[0], userLocation[1], pharmacy.lat, pharmacy.lng),
    }))
  }, [rawPharmacies, userLocation])

  const {
    enabled: notificationsEnabled,
    supported: notificationsSupported,
    toggleNotifications,
  } = useFavoriteNotifications(groupedPharmacies, favoriteIds, selectedDate)

  // Enriched Health Facilities with distances
  const enrichedHealthFacilities = useMemo<HealthFacility[]>(() => {
    if (!userLocation) {
      return rawHealthFacilities.map((facility) => ({ ...facility, distance: undefined }))
    }
    return rawHealthFacilities
      .map((facility) => ({
        ...facility,
        distance: calculateDistance(userLocation[0], userLocation[1], facility.lat, facility.lng),
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }, [rawHealthFacilities, userLocation])

  // Enriched Fire Stations with distances
  const enrichedFireStations = useMemo<FireStation[]>(() => {
    if (!userLocation) {
      return rawFireStations.map((station) => ({ ...station, distance: undefined }))
    }
    return rawFireStations
      .map((station) => ({
        ...station,
        distance: calculateDistance(userLocation[0], userLocation[1], station.lat, station.lng),
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }, [rawFireStations, userLocation])

  // Enriched Police Stations with distances
  const enrichedPoliceStations = useMemo<PoliceStation[]>(() => {
    if (!userLocation) {
      return rawPoliceStations.map((station) => ({ ...station, distance: undefined }))
    }
    return rawPoliceStations
      .map((station) => ({
        ...station,
        distance: calculateDistance(userLocation[0], userLocation[1], station.lat, station.lng),
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }, [rawPoliceStations, userLocation])

  // Filter Pharmacies
  const filteredPharmacies = useMemo(() => {
    let result: Pharmacy[] = groupedPharmacies

    if (searchMode === 'locality' && selectedCity) {
      const selectedKey = localityKey(selectedCity)
      result = result.filter((pharmacy) => localityKey(pharmacy.city || '') === selectedKey)
    } else if (searchMode === 'nearby') {
      result = filterPharmacies(groupedPharmacies, radius)
    }

    return sortPharmacies(result)
  }, [groupedPharmacies, radius, searchMode, selectedCity])

  // Filter Health Facilities
  const filteredHealthFacilities = useMemo(() => {
    let list: HealthFacility[] = enrichedHealthFacilities

    if (searchMode === 'locality' && selectedCity) {
      const selectedKey = localityKey(selectedCity)
      list = list.filter((facility) => localityKey(facility.locality) === selectedKey)
    } else if (searchMode === 'nearby' && userLocation) {
      list = list.filter((facility) => facility.distance !== undefined && facility.distance <= radius)
    }

    return list
  }, [enrichedHealthFacilities, searchMode, selectedCity, userLocation, radius])

  // Filter Fire Stations
  const filteredFireStations = useMemo(() => {
    let list: FireStation[] = enrichedFireStations

    if (searchMode === 'locality' && selectedCity) {
      const selectedKey = localityKey(selectedCity)
      list = list.filter((station) => localityKey(station.locality) === selectedKey)
    } else if (searchMode === 'nearby' && userLocation) {
      list = list.filter((station) => station.distance !== undefined && station.distance <= radius)
    }

    return list
  }, [enrichedFireStations, searchMode, selectedCity, userLocation, radius])

  // Filter Police Stations
  const filteredPoliceStations = useMemo(() => {
    let list: PoliceStation[] = enrichedPoliceStations

    if (searchMode === 'locality' && selectedCity) {
      const selectedKey = localityKey(selectedCity)
      list = list.filter((station) => localityKey(station.locality) === selectedKey)
    } else if (searchMode === 'nearby' && userLocation) {
      list = list.filter((station) => station.distance !== undefined && station.distance <= radius)
    }

    return list
  }, [enrichedPoliceStations, searchMode, selectedCity, userLocation, radius])

  // Available Cities for the Active Tab (with real-time count badges)
  const availableCitiesForActiveTab = useMemo(() => {
    if (activeTab === 'pharmacies') {
      const countsMap = new Map<string, number>()
      groupedPharmacies.forEach((pharmacy) => {
        const canonical = normalizeLocalityName(pharmacy.city || '')
        countsMap.set(canonical, (countsMap.get(canonical) || 0) + 1)
      })

      return JUJUY_CANONICAL_CITIES.map((name) => ({
        name,
        count: countsMap.get(name),
      }))
    }

    if (activeTab === 'health') {
      const countsMap = new Map<string, number>()
      rawHealthFacilities.forEach((facility) => {
        const canonical = normalizeLocalityName(facility.locality)
        countsMap.set(canonical, (countsMap.get(canonical) || 0) + 1)
      })

      const list: Array<{ name: string; count: number }> = []
      countsMap.forEach((count, name) => {
        list.push({ name, count })
      })
      return list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }

    if (activeTab === 'fire') {
      const countsMap = new Map<string, number>()
      rawFireStations.forEach((station) => {
        const canonical = normalizeLocalityName(station.locality)
        countsMap.set(canonical, (countsMap.get(canonical) || 0) + 1)
      })

      const list: Array<{ name: string; count: number }> = []
      countsMap.forEach((count, name) => {
        list.push({ name, count })
      })
      return list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }

    // activeTab === 'police'
    const countsMap = new Map<string, number>()
    rawPoliceStations.forEach((station) => {
      const canonical = normalizeLocalityName(station.locality)
      countsMap.set(canonical, (countsMap.get(canonical) || 0) + 1)
    })

    const list: Array<{ name: string; count: number }> = []
    countsMap.forEach((count, name) => {
      list.push({ name, count })
    })
    return list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [activeTab, groupedPharmacies, rawHealthFacilities, rawFireStations, rawPoliceStations])

  const isLoading = isDataLoading || isLocating || (activeTab === 'health' && isHealthLoading) || (activeTab === 'fire' && isFireLoading) || (activeTab === 'police' && isPoliceLoading)

  const handleSelectPharmacy = useCallback((pharmacy: Pharmacy | null) => {
    setSelectedPharmacy(pharmacy)
    if (pharmacy) {
      setSelectedHealthFacility(null)
      setSelectedFireStation(null)
      setSelectedPoliceStation(null)
      setMapCenter([pharmacy.lat, pharmacy.lng])
      setMobileSheetState('partial')
    }
  }, [])

  const handleSelectHealthFacility = useCallback((facility: HealthFacility | null) => {
    setSelectedHealthFacility(facility)
    if (facility) {
      setSelectedPharmacy(null)
      setSelectedFireStation(null)
      setSelectedPoliceStation(null)
      setMapCenter([facility.lat, facility.lng])
      setMobileSheetState('partial')
    }
  }, [])

  const handleSelectFireStation = useCallback((station: FireStation | null) => {
    setSelectedFireStation(station)
    if (station) {
      setSelectedPharmacy(null)
      setSelectedHealthFacility(null)
      setSelectedPoliceStation(null)
      setMapCenter([station.lat, station.lng])
      setMobileSheetState('partial')
    }
  }, [])

  const handleSelectPoliceStation = useCallback((station: PoliceStation | null) => {
    setSelectedPoliceStation(station)
    if (station) {
      setSelectedPharmacy(null)
      setSelectedHealthFacility(null)
      setSelectedFireStation(null)
      setMapCenter([station.lat, station.lng])
      setMobileSheetState('partial')
    }
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedPharmacy(null)
    setSelectedHealthFacility(null)
    setSelectedFireStation(null)
    setSelectedPoliceStation(null)
  }, [])

  const handleToggleFavorite = useCallback((pharmacy: Pharmacy) => {
    const wasFavorite = favoriteIds.includes(pharmacy.id)
    toggleFavorite(pharmacy.id)
    toast.success(wasFavorite ? 'Farmacia eliminada de favoritas.' : 'Farmacia guardada en favoritas.')
  }, [favoriteIds, toggleFavorite])

  const handleApplyCalendarDate = useCallback((date: string, city: string) => {
    setSelectedDate(date)
    setSelectedCity(city)
    setSearchMode('locality')
    handleClearSelection()
    setMapCenter([-24.1858, -65.2995])
    setMobileSheetState('expanded')
    setIsCalendarOpen(false)
  }, [handleClearSelection])

  const isAnyEntitySelected = Boolean(selectedPharmacy || selectedHealthFacility || selectedFireStation || selectedPoliceStation)

  // Tab Selector Bar
  const renderTabSwitcher = () => (
    <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-2xl border border-border/50">
      <button
        type="button"
        onClick={() => {
          setActiveTab('pharmacies')
          handleClearSelection()
        }}
        className={cn(
          'flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all',
          activeTab === 'pharmacies'
            ? 'bg-card text-emerald-700 dark:text-emerald-400 shadow-sm font-black'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-selected={activeTab === 'pharmacies'}
      >
        <Pill className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="truncate">Farmacias</span>
        <span className="text-[10px] font-semibold opacity-80 shrink-0">({filteredPharmacies.length})</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setActiveTab('health')
          handleClearSelection()
        }}
        className={cn(
          'flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all',
          activeTab === 'health'
            ? 'bg-card text-rose-700 dark:text-rose-400 shadow-sm font-black'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-selected={activeTab === 'health'}
      >
        <HeartPulse className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
        <span className="truncate">Salud</span>
        <span className="text-[10px] font-semibold opacity-80 shrink-0">({filteredHealthFacilities.length})</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setActiveTab('fire')
          handleClearSelection()
        }}
        className={cn(
          'flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all',
          activeTab === 'fire'
            ? 'bg-card text-orange-700 dark:text-orange-400 shadow-sm font-black'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-selected={activeTab === 'fire'}
      >
        <Flame className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
        <span className="truncate">Bomberos</span>
        <span className="text-[10px] font-semibold opacity-80 shrink-0">({filteredFireStations.length})</span>
      </button>
    </div>
  )

  // Dynamic Card List Content
  const renderActiveList = (isMobileSheet = false) => {
    if (activeTab === 'pharmacies') {
      return (
        <PharmacyList
          pharmacies={filteredPharmacies}
          selectedPharmacy={selectedPharmacy}
          userLocation={userLocation}
          onSelectPharmacy={handleSelectPharmacy}
          isLoading={isLoading}
          viewMode="map"
          hideHeader={isMobileSheet}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
        />
      )
    }

    if (activeTab === 'health') {
      return (
        <HealthFacilityList
          facilities={filteredHealthFacilities}
          selectedFacility={selectedHealthFacility}
          userLocation={userLocation}
          onSelectFacility={handleSelectHealthFacility}
          isLoading={isLoading}
        />
      )
    }

    return (
      <FireStationList
        stations={filteredFireStations}
        selectedStation={selectedFireStation}
        userLocation={userLocation}
        onSelectStation={handleSelectFireStation}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      {/* Top Navbar */}
      <header className="h-14 border-b bg-card/95 backdrop-blur-md shadow-sm z-50 flex items-center justify-between px-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 w-10 shrink-0" aria-hidden="true">
            <Image
              src="/farmajuy-icon.png"
              alt="Logo SaludJUY"
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain drop-shadow-sm"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-heading font-black text-foreground tracking-tight leading-none truncate">
                SaludJUY
              </h1>
              <span className="hidden sm:inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Jujuy Esencial
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold leading-tight truncate">
              Farmacias de turno · Centros de Salud · Bomberos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-xl px-2 sm:px-3"
            onClick={() => setIsCalendarOpen(true)}
            aria-label="Abrir calendario global de turnos"
          >
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="hidden text-xs font-bold lg:inline">Calendario</span>
          </Button>
          <PwaActions
            notificationsEnabled={notificationsEnabled}
            notificationsSupported={notificationsSupported}
            onToggleNotifications={toggleNotifications}
          />
          <JujuyDevLinks />
          <Feedback inline />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-[390px] flex-col border-r bg-card/50 backdrop-blur-sm z-40 shadow-xl shrink-0">
          {/* Search Controls Container */}
          <div className="p-3.5 border-b bg-muted/20 space-y-3">
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
              cities={availableCitiesForActiveTab}
              activeTab={activeTab}
            />

            {/* Category Navigation Tabs */}
            {renderTabSwitcher()}
          </div>

          {/* Cards List Container */}
          <div className="flex-1 overflow-hidden">
            {renderActiveList(false)}
          </div>
        </div>

        {/* Map Panel (Mobile & Desktop) */}
        <div className="flex-1 relative z-0 w-full h-full">
          <PharmacyMap
            pharmacies={filteredPharmacies}
            healthFacilities={filteredHealthFacilities}
            fireStations={filteredFireStations}
            center={mapCenter}
            selectedPharmacy={selectedPharmacy}
            onSelectPharmacy={handleSelectPharmacy}
            selectedHealthFacility={selectedHealthFacility}
            onSelectHealthFacility={handleSelectHealthFacility}
            selectedFireStation={selectedFireStation}
            onSelectFireStation={handleSelectFireStation}
            userLocation={isLocating ? null : userLocation}
            fitToResults={searchMode === 'locality'}
            travelMode={travelMode}
            onTravelModeChange={setTravelMode}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />

          {/* Mobile-Only Overlays & Controls: hidden on md+ */}
          <div className="md:hidden">
            {/* Top Compact Search Pill or Back Button */}
            {!isAnyEntitySelected ? (
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
                          : (selectedCity ? normalizeLocalityName(selectedCity) : 'Todas las localidades')}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium truncate">
                        {searchMode === 'nearby' ? `Radio: ${radius} km` : `Turnos: ${selectedDate}`} · {filteredPharmacies.length} farmacias · {filteredHealthFacilities.length} salud · {filteredFireStations.length} cuarteles
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
                  onClick={handleClearSelection}
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                  <span>Volver a la lista</span>
                </Button>
              </div>
            )}

            {/* Mobile Filter Modal */}
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
              <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto p-5">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    Buscar y filtrar servicios
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
                    cities={availableCitiesForActiveTab}
                    activeTab={activeTab}
                  />

                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Categoría
                    </p>
                    {renderTabSwitcher()}
                  </div>

                  <Button
                    className="w-full h-11 text-xs font-black uppercase tracking-wider shadow-md mt-2"
                    onClick={() => setIsFilterModalOpen(false)}
                  >
                    Ver {activeTab === 'pharmacies'
                      ? `${filteredPharmacies.length} farmacias`
                      : activeTab === 'health'
                        ? `${filteredHealthFacilities.length} efectores de salud`
                        : `${filteredFireStations.length} cuarteles`
                    }
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Floating Quick GPS Button on Map */}
            <div className={cn("absolute right-3.5 z-30 flex flex-col gap-2 pointer-events-auto transition-all", isAnyEntitySelected ? "bottom-[calc(55dvh+12px)] sm:bottom-24" : "bottom-24")}>
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

            {/* Floating Center Map/List Toggle Pill */}
            {!isAnyEntitySelected && (
              <div className="absolute bottom-[76px] inset-x-0 z-30 flex justify-center pointer-events-none">
                <Button
                  size="sm"
                  className="pointer-events-auto rounded-full shadow-xl bg-foreground text-background font-bold text-xs px-4 h-9 gap-1.5 hover:bg-foreground/90 transition-transform active:scale-95"
                  onClick={() => setMobileSheetState((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'))}
                >
                  {mobileSheetState === 'collapsed' ? (
                    <>
                      <List className="h-3.5 w-3.5" />
                      <span>
                        Ver lista ({activeTab === 'pharmacies'
                          ? filteredPharmacies.length
                          : activeTab === 'health'
                            ? filteredHealthFacilities.length
                            : filteredFireStations.length
                        })
                      </span>
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

            {/* Mobile Bottom Sheet for Active Category List */}
            {!isAnyEntitySelected && (
              <BottomSheet
                isOpen={true}
                sheetState={mobileSheetState}
                onStateChange={setMobileSheetState}
                peekTitle={
                  <div className="flex items-center justify-between w-full pr-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-2 w-2 rounded-full animate-pulse",
                        activeTab === 'pharmacies' ? "bg-emerald-500" : activeTab === 'health' ? "bg-rose-500" : "bg-orange-500"
                      )} />
                      <span className="font-heading font-black text-xs text-foreground uppercase tracking-tight">
                        {activeTab === 'pharmacies'
                          ? `${filteredPharmacies.length} ${filteredPharmacies.length === 1 ? 'farmacia de turno' : 'farmacias de turno'}`
                          : activeTab === 'health'
                            ? `${filteredHealthFacilities.length} ${filteredHealthFacilities.length === 1 ? 'centro de salud' : 'centros de salud'}`
                            : `${filteredFireStations.length} ${filteredFireStations.length === 1 ? 'cuartel de bomberos' : 'cuarteles de bomberos'}`
                        }
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {mobileSheetState === 'expanded' ? 'Ver mapa' : 'Ver lista'}
                    </span>
                  </div>
                }
              >
                <div className="p-2 border-b bg-card">
                  {renderTabSwitcher()}
                </div>
                <div className="flex-1 overflow-hidden">
                  {renderActiveList(true)}
                </div>
              </BottomSheet>
            )}
          </div>
        </div>
      </main>

      <GlobalDutyCalendar
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
        selectedDate={selectedDate}
        selectedCity={selectedCity}
        cities={JUJUY_CANONICAL_CITIES}
        onApply={handleApplyCalendarDate}
      />
    </div>
  )
}
