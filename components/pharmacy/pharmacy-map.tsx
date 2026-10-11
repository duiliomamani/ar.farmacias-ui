'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { cn } from '@/lib/utils'
import { Bike, Car, CheckCircle2, AlertTriangle, ExternalLink, Footprints, Navigation, X, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommunityReportActions } from './community-report-actions'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

function RoutingControl({
  origin,
  destination,
  travelMode,
  onSummary,
}: {
  origin: [number, number]
  destination: [number, number]
  travelMode: TravelMode
  onSummary: (summary: RouteSummary) => void
}) {
  // Leaflet Routing Machine is browser-only and augments the Leaflet namespace.
  const map = require('react-leaflet').useMap()

  useEffect(() => {
    const L = require('leaflet')
    require('leaflet-routing-machine')
    const routerConfig = travelMode === 'driving'
      ? {
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
        }
      : {
          serviceUrl: `https://routing.openstreetmap.de/routed-${travelMode === 'walking' ? 'foot' : 'bike'}/route/v1`,
          profile: 'driving',
        }
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(origin[0], origin[1]), L.latLng(destination[0], destination[1])],
      router: L.Routing.osrmv1({
        ...routerConfig,
        language: 'es',
      }),
      lineOptions: {
        styles: [{ color: '#16a34a', opacity: 0.9, weight: 6 }],
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
      createMarker: () => null,
    }).addTo(map)

    // Hide the native itinerary UI container so our custom bottom sheet/card is the only interface
    const container = routingControl.getContainer()
    if (container) {
      container.style.display = 'none'
    }

    let isActive = true
    const handleRoutesFound = (event: any) => {
      if (!isActive) return
      const summary = event.routes?.[0]?.summary
      if (summary) {
        onSummary({
          distanceKm: summary.totalDistance / 1000,
          durationMinutes: Math.max(1, Math.round(summary.totalTime / 60)),
          instructions: (event.routes?.[0]?.instructions || []).map((instruction: any) => ({
            text: instruction.text || 'Continuar por la ruta',
            distanceMeters: instruction.distance || 0,
            timeSeconds: instruction.time || 0,
          })),
        })
      }
    }

    routingControl.on('routesfound', handleRoutesFound)

    return () => {
      isActive = false
      routingControl.off('routesfound', handleRoutesFound)

      // Routing Machine may finish an async OSRM request while React is
      // already unmounting/replacing the map. Invalidate that request before
      // removing the control to avoid Leaflet trying to remove a null layer.
      const control = routingControl as any
      control._requestCount = (control._requestCount || 0) + 1
      if (control._pendingRequest?.abort) {
        control._pendingRequest.abort()
        control._pendingRequest = null
      }

      try {
        if ((map as any)._container) {
          map.removeControl(routingControl)
        }
      } catch (error) {
        // Leaflet can already have removed the routing layers during a
        // concurrent map unmount. At that point there is nothing left to do.
        console.debug('[PharmacyMap] Routing cleanup skipped', error)
      }
    }
  }, [map, origin[0], origin[1], destination[0], destination[1], travelMode, onSummary])

  return null
}

function FitPharmacyBounds({ pharmacies, enabled }: { pharmacies: Pharmacy[]; enabled: boolean }) {
  const map = require('react-leaflet').useMap()

  useEffect(() => {
    if (!enabled || pharmacies.length === 0) return
    const L = require('leaflet')
    const bounds = L.latLngBounds(pharmacies.map((pharmacy) => [pharmacy.lat, pharmacy.lng]))
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 })
  }, [enabled, pharmacies, map])

  return null
}

type TravelMode = 'driving' | 'walking' | 'cycling'

interface RouteInstruction {
  text: string
  distanceMeters: number
  timeSeconds: number
}

interface RouteSummary {
  distanceKm: number
  durationMinutes: number
  instructions: RouteInstruction[]
}

interface PharmacyMapProps {
  pharmacies: Pharmacy[]
  center: [number, number]
  selectedPharmacy?: Pharmacy | null
  onSelectPharmacy?: (pharmacy: Pharmacy | null) => void
  userLocation?: [number, number] | null
  fitToPharmacies?: boolean
  travelMode: TravelMode
  onTravelModeChange: (mode: TravelMode) => void
  favoriteIds?: string[]
  onToggleFavorite?: (pharmacy: Pharmacy) => void
  className?: string
}

function PharmacyMapContent({
  pharmacies,
  center,
  selectedPharmacy,
  onSelectPharmacy,
  userLocation,
  fitToPharmacies = false,
  travelMode,
  onTravelModeChange,
  favoriteIds = [],
  onToggleFavorite,
  className,
}: PharmacyMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // Some official records share the same geocoded point. Keep their real
  // coordinates for routing, but fan the visual markers out so none is hidden.
  const displayPositions = useMemo(() => {
    const groups = new Map<string, Pharmacy[]>()
    pharmacies.forEach((pharmacy) => {
      const key = `${pharmacy.lat.toFixed(5)}-${pharmacy.lng.toFixed(5)}`
      const group = groups.get(key) || []
      group.push(pharmacy)
      groups.set(key, group)
    })

    const positions = new Map<string, [number, number]>()
    groups.forEach((group) => {
      group.forEach((pharmacy, index) => {
        if (group.length === 1) {
          positions.set(pharmacy.id, [pharmacy.lat, pharmacy.lng])
          return
        }

        const angle = (2 * Math.PI * index) / group.length
        const offset = 0.00022
        positions.set(pharmacy.id, [
          pharmacy.lat + Math.sin(angle) * offset,
          pharmacy.lng + Math.cos(angle) * offset,
        ])
      })
    })

    return positions
  }, [pharmacies])

  useEffect(() => {
    if (mapRef.current && selectedPharmacy) {
      mapRef.current.setView([selectedPharmacy.lat, selectedPharmacy.lng], 16)
    }
    setShowInstructions(false)
  }, [selectedPharmacy])

  useEffect(() => {
    setRouteSummary(null)
    setShowInstructions(false)
  }, [selectedPharmacy?.id, userLocation?.[0], userLocation?.[1], travelMode])

  // Update map center when the center prop changes (e.g., from geolocation)
  useEffect(() => {
    if (mapRef.current && !selectedPharmacy) {
      mapRef.current.setView(center, 14)
    }
  }, [center[0], center[1], selectedPharmacy])

  // Create custom icons based on center type and status
  const createCustomIcon = (pharmacy: Pharmacy, isSelected: boolean) => {
    if (typeof window === 'undefined') return undefined
    
    const L = require('leaflet')
    
    const size = isSelected ? 48 : 40
    let color = '#ef4444' // Default Red (Closed)
    let iconPath = '<path d="M18 6 6 18M6 6l12 12"/>' // X icon for closed
    let extraClass = ''

    // Community Report Logic for Icon
    const latestReport = pharmacy.communityReports?.[0];
    let badgeHtml = '';
    
    if (latestReport && !latestReport.isOnDuty) {
      // Reported closed recently
      badgeHtml = `
        <div style="
          position: absolute; 
          top: -4px; 
          right: -4px; 
          background: #f97316; 
          border: 1.5px solid white; 
          border-radius: 50%; 
          width: 18px; 
          height: 18px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 10; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          animation: pulse-danger 2s infinite;
        ">
          <span style="color: white; font-size: 11px; font-weight: 900; line-height: 1;">!</span>
        </div>
      `;
      extraClass += ' reported-closed-glow';
    } else {
      const recentVerifiedReport = pharmacy.communityReports?.find(
        (r) => r.isOnDuty && (Date.now() - new Date(r.createdAt).getTime()) < 2 * 60 * 60 * 1000
      );
      if (recentVerifiedReport) {
        // Confirmed open recently
        badgeHtml = `
          <div style="
            position: absolute; 
            top: -4px; 
            right: -4px; 
            background: #22c55e; 
            border: 1.5px solid white; 
            border-radius: 50%; 
            width: 18px; 
            height: 18px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            z-index: 10; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        `;
      }
    }

    if (pharmacy.isOnDuty) {
      color = '#22c55e' // Green (Open)
      iconPath = '<path d="M12 2v20M2 12h20"/>' // Cross
    }

    if (pharmacy.isVoluntary) {
      color = '#2563eb' // Blue (Voluntary, availability not guaranteed)
      iconPath = '<path d="M12 2v20M2 12h20"/>' // Cross
      extraClass += ' voluntary-marker'
    }

    if (pharmacy.verificationStatus === 'community_verified') {
      color = '#3b82f6' // Blue
      iconPath = '<path d="M20 6 9 17l-5-5"/>' // Check icon
    } else if (pharmacy.verificationStatus === 'pending') {
      color = '#f59e0b' // Amber
      iconPath = '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    }

    if (pharmacy.isPermanentlyOnDuty && pharmacy.isOnDuty) {
      color = '#0284c7'
      iconPath = '<path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>'
    }

    if (pharmacy.activityLevel > 70) {
      extraClass += ' high-activity-aura'
    }

    if (pharmacy.isOnDuty) {
      extraClass += ' on-duty-marker'
    }
    
    return L.divIcon({
      className: `custom-marker ${extraClass}`,
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: 2px solid oklch(1 0 0 / 0.5);
          border-radius: 50%;
          box-shadow: 0 4px 14px oklch(0.1 0.05 240 / 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
          transition: transform 0.2s ease-out;
          position: relative;
          z-index: 1;
        ">
          <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${iconPath}
          </svg>
          ${badgeHtml}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    })
  }

  const createUserLocationIcon = () => {
    if (typeof window === 'undefined') return undefined
    const L = require('leaflet')
    
    return L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-25"></div>
          <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  }

  const handleNavigate = (pharmacy: Pharmacy) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}&travelmode=${travelMode}`
    window.open(url, '_blank')
  }

  const handleStreetView = (pharmacy: Pharmacy) => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pharmacy.lat},${pharmacy.lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={cn('relative w-full h-full bg-muted', className)}>
      <MapContainer
        center={center}
        zoom={14}
        ref={(map) => {
          if (map) mapRef.current = map
        }}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; Google Maps"
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={20}
        />

        <FitPharmacyBounds pharmacies={pharmacies} enabled={fitToPharmacies} />

        {userLocation && selectedPharmacy && (
          <RoutingControl
            origin={userLocation}
            destination={[selectedPharmacy.lat, selectedPharmacy.lng]}
            travelMode={travelMode}
            onSummary={setRouteSummary}
          />
        )}

        {userLocation && (
          <Marker position={userLocation} icon={createUserLocationIcon()} zIndexOffset={1000} />
        )}

        {pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            position={displayPositions.get(pharmacy.id) || [pharmacy.lat, pharmacy.lng]}
            icon={createCustomIcon(pharmacy, selectedPharmacy?.id === pharmacy.id)}
            eventHandlers={{
              click: () => onSelectPharmacy?.(pharmacy),
            }}
          />
        ))}
      </MapContainer>
      {selectedPharmacy && (
        <div className="absolute bottom-3 inset-x-3 sm:bottom-auto sm:inset-x-auto sm:right-4 sm:top-4 z-[500] sm:w-[380px] max-h-[70dvh] overflow-y-auto rounded-2xl border bg-card/98 p-4 shadow-2xl backdrop-blur-md flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <Badge
                  className={cn(
                    'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 h-4.5',
                    selectedPharmacy.isVoluntary
                      ? 'bg-blue-600 text-white'
                      : selectedPharmacy.isOnDuty
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {selectedPharmacy.isVoluntary
                    ? 'Turno voluntario'
                    : selectedPharmacy.isOnDuty
                      ? 'De Turno'
                      : 'Cerrada'}
                </Badge>
                {selectedPharmacy.isPermanentlyOnDuty && (
                  <Badge className="h-4.5 border border-sky-500/30 bg-sky-500/10 px-1.5 py-0 text-[9px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">
                    Permanente
                  </Badge>
                )}
                {selectedPharmacy.distance !== undefined && (
                  <span className="text-[10px] font-bold text-muted-foreground ml-1">
                    {selectedPharmacy.distance.toFixed(1)} km
                  </span>
                )}
              </div>
              <h3 className="text-base font-heading font-black text-foreground truncate uppercase tracking-tight">
                {selectedPharmacy.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {selectedPharmacy.address}
              </p>
              {selectedPharmacy.openingHours && (
                <p className="text-[11px] text-muted-foreground/90 font-medium truncate mt-0.5">
                  🕒 Horario: {selectedPharmacy.openingHours}
                </p>
              )}
              {selectedPharmacy.isVoluntary && (
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  ⚠️ Atención no garantizada. Llamar antes de ir.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                onClick={() => onToggleFavorite?.(selectedPharmacy)}
                aria-label={favoriteIds.includes(selectedPharmacy.id) ? `Quitar ${selectedPharmacy.name} de favoritas` : `Guardar ${selectedPharmacy.name} como favorita`}
                aria-pressed={favoriteIds.includes(selectedPharmacy.id)}
              >
                <Star className={cn('h-4 w-4', favoriteIds.includes(selectedPharmacy.id) && 'fill-amber-400 text-amber-500')} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                onClick={() => onSelectPharmacy?.(null)}
                aria-label="Cerrar detalles de ruta"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedPharmacy.isVoluntary && (
            <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <CommunityReportActions pharmacy={selectedPharmacy} />
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {([
              ['driving', Car, 'Auto'],
              ['walking', Footprints, 'A pie'],
              ['cycling', Bike, 'Bici'],
            ] as const).map(([mode, Icon, label]) => (
              <Button
                key={mode}
                size="sm"
                variant={travelMode === mode ? 'default' : 'ghost'}
                className={cn(
                  "h-8 gap-1.5 px-2 text-xs font-bold rounded-lg transition-all",
                  travelMode === mode ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onTravelModeChange(mode)}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </Button>
            ))}
          </div>

          {routeSummary ? (
            <>
              <div className="mt-2.5 flex items-center justify-between">
                <div>
                  <span className="text-base font-black text-foreground">
                    {routeSummary.durationMinutes} min
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground ml-1.5">
                    ({routeSummary.distanceKm.toFixed(1)} km)
                  </span>
                </div>
                {routeSummary.instructions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowInstructions((prev) => !prev)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-md hover:bg-primary/5 transition-colors"
                  >
                    <span>{showInstructions ? 'Ocultar pasos' : `${routeSummary.instructions.length} indicaciones`}</span>
                    {showInstructions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>

              {showInstructions && routeSummary.instructions.length > 0 && (
                <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto border-t pt-2 pr-1">
                  {routeSummary.instructions.map((instruction, index) => (
                    <div key={`${index}-${instruction.text}`} className="flex gap-2 text-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="leading-tight text-foreground text-xs">{instruction.text}</p>
                        {instruction.distanceMeters > 0 && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDistance(instruction.distanceMeters)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  className="flex-1 h-10 gap-2 font-black text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-xl"
                  onClick={() => handleNavigate(selectedPharmacy)}
                >
                  <Navigation className="h-4 w-4" strokeWidth={2.5} /> Iniciar navegación
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() => handleStreetView(selectedPharmacy)}
                  title="Ver en Street View"
                  aria-label="Ver calle"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : userLocation ? (
            <div className="mt-3 flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
              <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Calculando la mejor ruta...</span>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Habilitá tu ubicación para calcular el tiempo y las indicaciones exactas.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1 h-10 gap-2 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
                  onClick={() => handleNavigate(selectedPharmacy)}
                >
                  <Navigation className="h-3.5 w-3.5" /> Abrir en Google Maps
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() => handleStreetView(selectedPharmacy)}
                  title="Ver en Street View"
                  aria-label="Ver calle"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

export function PharmacyMap(props: PharmacyMapProps) {
  return <PharmacyMapContent {...props} />
}
