'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { SearchControls } from './search-controls'
import { PharmacyList } from './pharmacy-list'
import { BottomSheet } from './bottom-sheet'
import { ContributeDataModal } from './contribute-data-modal'
import { ThemeToggle } from '@/components/theme-toggle'
import { AuthButton } from '@/components/auth/auth-button'
import {
  groupPharmacies,
  filterPharmacies,
  sortPharmacies,
  type Pharmacy,
} from '@/lib/pharmacy-data'
import { PharmacyService } from '@/lib/api'
import { useIsMobile } from '@/hooks/use-mobile'
import { Pill, HeartPulse, Map as MapIcon, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getDeviceId } from '@/lib/utils'
import { format } from 'date-fns'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [radius, setRadius] = useState(5)
  const [isLocating, setIsLocating] = useState(false)
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-34.6037, -58.3816])
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  
  // New Filter States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
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
          setMapCenter([position.coords.latitude, position.coords.longitude])
          setIsLocating(false)
        },
        (error) => {
          console.error('Error getting location:', error)
          setIsLocating(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    } else {
      setIsLocating(false)
    }
  }, [])

  // Data Fetching
  const { data: rawPharmacies = [], isLoading: isDataLoading } = useQuery({
    queryKey: ['pharmacies', mapCenter, radius, format(selectedDate, 'yyyy-MM-dd'), searchQuery],
    queryFn: async () => {
      // If there's a search query, we might want to fetch by city or name
      // For now, let's stick to nearby or by date
      if (searchQuery.length > 3) {
        return PharmacyService.getByDate(format(selectedDate, 'yyyy-MM-dd'), searchQuery)
      }
      return PharmacyService.getNearby(mapCenter[0], mapCenter[1], radius * 1000, format(selectedDate, 'yyyy-MM-dd'))
    },
    // fallback to mock data if API fails or for dev
    retry: false,
  })

  // Group pharmacies by location to deduplicate
  const groupedPharmacies = useMemo(() => groupPharmacies(rawPharmacies), [rawPharmacies]);

  // Auto-center map on first result if doing a text search
  useEffect(() => {
    if (searchQuery.length > 3 && groupedPharmacies.length > 0 && !selectedPharmacy && !isLocating) {
      setMapCenter([groupedPharmacies[0].lat, groupedPharmacies[0].lng])
    }
  }, [groupedPharmacies, searchQuery, selectedPharmacy, isLocating])

  // Filter and sort pharmacies (local filtering for on-duty and radius)
  const filteredPharmacies = useMemo(() => {
    let result = filterPharmacies(groupedPharmacies, radius);
    
    if (onlyOnDuty) {
      result = result.filter(p => p.isOnDuty);
    }
    
    return sortPharmacies(result);
  }, [groupedPharmacies, radius, onlyOnDuty]);

  const isLoading = isDataLoading || isLocating

  const handleSelectPharmacy = useCallback((pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy)
    setMapCenter([pharmacy.lat, pharmacy.lng])
  }, [])

  const handleReportOpen = useCallback((pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy)
    console.log(`Reporting ${pharmacy.name} as open.`)
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
              >
                {viewMode === 'map' ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
              </Button>
              <AuthButton />
              <ThemeToggle />
            </div>
          </div>
        </div>

        {viewMode === 'map' ? (
          <>
            {/* Floating Search Bar */}
            <div className="absolute top-[56px] left-0 right-0 z-40 p-3 pb-2">
              <SearchControls
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                radius={radius}
                onRadiusChange={setRadius}
                            onUseMyLocation={handleUseMyLocation}
                            isLocating={isLocating}
                            selectedDate={selectedDate}                onDateChange={setSelectedDate}
                onlyOnDuty={onlyOnDuty}
                onOnlyOnDutyChange={setOnlyOnDuty}
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
              />
            </div>

            {/* Bottom Sheet with Pharmacy List */}
            <BottomSheet isOpen={isBottomSheetOpen} onOpenChange={setIsBottomSheetOpen}>
              <PharmacyList
                pharmacies={filteredPharmacies}
                selectedPharmacy={selectedPharmacy}
                onSelectPharmacy={handleSelectPharmacy}
                onReportOpen={handleReportOpen}
                isLoading={isLoading}
                viewMode="map"
              />
            </BottomSheet>

            {/* Floating Action Button */}
            <ContributeDataModal selectedPharmacy={selectedPharmacy} />
          </>
        ) : (
          <div className="pt-[56px] h-full flex flex-col bg-background relative z-10">
            <div className="p-4 border-b bg-card">
              <SearchControls
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                radius={radius}
                onRadiusChange={setRadius}
                            onUseMyLocation={handleUseMyLocation}
                            isLocating={isLocating}
                            selectedDate={selectedDate}                onDateChange={setSelectedDate}
                onlyOnDuty={onlyOnDuty}
                onOnlyOnDutyChange={setOnlyOnDuty}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <PharmacyList
                pharmacies={filteredPharmacies}
                selectedPharmacy={selectedPharmacy}
                onSelectPharmacy={handleSelectPharmacy}
                onReportOpen={handleReportOpen}
                isLoading={isLoading}
                viewMode="list"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background relative justify-center">
      {/* Search & List Panel */}
      <div className={cn(
        "flex flex-col border-r bg-card shadow-2xl z-10 transition-all duration-300",
        viewMode === 'map' ? "w-[380px]" : "w-full max-w-5xl"
      )}>
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-lg ring-4 ring-primary/10">
                <HeartPulse className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-heading font-black text-foreground tracking-tighter">FarmaYa AR</h1>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Centro de Emergencias Nacional</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-muted/50 rounded-lg p-1 mr-2 flex items-center">
                <Button 
                  variant={viewMode === 'map' ? 'default' : 'ghost'} 
                  size="sm" 
                  className={cn("h-8 px-3 gap-2", viewMode === 'map' && "shadow-sm")}
                  onClick={() => setViewMode('map')}
                >
                  <MapIcon className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-bold">Mapa</span>
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="sm" 
                  className={cn("h-8 px-3 gap-2", viewMode === 'list' && "shadow-sm")}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-bold">Lista</span>
                </Button>
              </div>
              <AuthButton />
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Search Controls */}
        <div className="p-4 border-b bg-muted/20">
          <SearchControls
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            radius={radius}
            onRadiusChange={setRadius}
            onUseMyLocation={handleUseMyLocation}
            isLocating={isLocating}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onlyOnDuty={onlyOnDuty}
            onOnlyOnDutyChange={setOnlyOnDuty}
          />
        </div>

        {/* Pharmacy List */}
        <div className="flex-1 overflow-hidden">
          <PharmacyList
            pharmacies={filteredPharmacies}
            selectedPharmacy={selectedPharmacy}
            onSelectPharmacy={handleSelectPharmacy}
            onReportOpen={handleReportOpen}
            isLoading={isLoading}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* Right Panel - Map */}
      {viewMode === 'map' && (
        <div className="flex-1 relative">
          <PharmacyMap
            pharmacies={filteredPharmacies}
            center={mapCenter}
            selectedPharmacy={selectedPharmacy}
            onSelectPharmacy={handleSelectPharmacy}
          />
        </div>
      )}

      {/* Floating Action Button */}
      <ContributeDataModal selectedPharmacy={selectedPharmacy} />
    </div>
  )
}
