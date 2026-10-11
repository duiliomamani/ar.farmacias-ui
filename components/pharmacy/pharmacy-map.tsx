'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { cn } from '@/lib/utils'
import { Navigation, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)
const LayersControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.LayersControl),
  { ssr: false }
)
const BaseLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.LayersControl.BaseLayer),
  { ssr: false }
)

function RoutingControl({
  origin,
  destination,
  onSummary,
}: {
  origin: [number, number]
  destination: [number, number]
  onSummary: (summary: { distanceKm: number; durationMinutes: number }) => void
}) {
  // Leaflet Routing Machine is browser-only and augments the Leaflet namespace.
  const map = require('react-leaflet').useMap()

  useEffect(() => {
    const L = require('leaflet')
    require('leaflet-routing-machine')
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(origin[0], origin[1]), L.latLng(destination[0], destination[1])],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
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

    let isActive = true
    const handleRoutesFound = (event: any) => {
      if (!isActive) return
      const summary = event.routes?.[0]?.summary
      if (summary) {
        onSummary({
          distanceKm: summary.totalDistance / 1000,
          durationMinutes: Math.max(1, Math.round(summary.totalTime / 60)),
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
  }, [map, origin[0], origin[1], destination[0], destination[1], onSummary])

  return null
}

interface PharmacyMapProps {
  pharmacies: Pharmacy[]
  center: [number, number]
  selectedPharmacy?: Pharmacy | null
  onSelectPharmacy?: (pharmacy: Pharmacy) => void
  userLocation?: [number, number] | null
  className?: string
}

function PharmacyMapContent({
  pharmacies,
  center,
  selectedPharmacy,
  onSelectPharmacy,
  userLocation,
  className,
}: PharmacyMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [routeSummary, setRouteSummary] = useState<{ distanceKm: number; durationMinutes: number } | null>(null)

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
  }, [selectedPharmacy])

  useEffect(() => {
    setRouteSummary(null)
  }, [selectedPharmacy?.id, userLocation?.[0], userLocation?.[1]])

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

    if (pharmacy.verificationStatus === 'community_verified') {
      color = '#3b82f6' // Blue
      iconPath = '<path d="M20 6 9 17l-5-5"/>' // Check icon
    } else if (pharmacy.verificationStatus === 'pending') {
      color = '#f59e0b' // Amber
      iconPath = '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
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
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`
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
        <LayersControl position="topright">
          <BaseLayer checked name="Google calles">
            <TileLayer
              attribution='&copy; Google Maps'
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              maxZoom={20}
            />
          </BaseLayer>
          <BaseLayer name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </BaseLayer>
        </LayersControl>

        {userLocation && selectedPharmacy && (
          <RoutingControl
            origin={userLocation}
            destination={[selectedPharmacy.lat, selectedPharmacy.lng]}
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
          >
            <Popup className="farmaya-popup">
              <div className="p-4 min-w-[240px] flex flex-col gap-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-heading font-black text-base leading-tight tracking-tight uppercase">{pharmacy.name}</h3>
                    <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">{pharmacy.address}</p>
                  </div>
                  {pharmacy.verificationStatus === 'verified' && (
                    <div className="bg-green-100 p-1 rounded-full shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  {pharmacy.verificationStatus === 'pending' && (
                    <div className="bg-amber-100 p-1 rounded-full shrink-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={pharmacy.isOnDuty ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5",
                        pharmacy.isOnDuty ? "bg-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {pharmacy.isOnDuty 
                        ? (pharmacy.isPermanentlyOnDuty || pharmacy.openingHours?.toLowerCase().includes('24hs')
                            ? 'Atención Permanente 24hs'
                            : (() => {
                                if (!pharmacy.dutyUntil) return 'Abierta ahora';
                                const until = new Date(pharmacy.dutyUntil);
                                const now = new Date();
                                const isTomorrow = until.getDate() !== now.getDate();
                                const timeStr = until.toLocaleTimeString('es-AR', { 
                                  timeZone: 'America/Argentina/Buenos_Aires', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) + 'hs';
                                return isTomorrow ? `De Turno hasta mañana ${timeStr}` : `De Turno hasta las ${timeStr}`;
                              })())
                        : 'Cerrada ahora'}
                    </Badge>
                  </div>

                  {pharmacy.openingHours && !pharmacy.openingHours.toLowerCase().includes('24hs') && (
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest -mt-1 px-1">
                      {pharmacy.openingHours}
                    </p>
                  )}

                  {/* Community Report Message in Popup */}
                  {(() => {
                    const latestReport = pharmacy.communityReports?.[0];
                    if (latestReport && !latestReport.isOnDuty) {
                      const minutes = Math.floor((Date.now() - new Date(latestReport.createdAt).getTime()) / 60000);
                      const timeStr = minutes >= 60 ? `${Math.floor(minutes / 60)} hs` : `${minutes} min`;
                      return (
                        <div className="bg-orange-50 text-orange-700 border-orange-200 border px-2 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1.5 animate-pulse">
                          <span>⚠️</span> Reportada como cerrada hace {timeStr}
                        </div>
                      );
                    }
                    const recentVerifiedReport = pharmacy.communityReports?.find(
                      (r) => r.isOnDuty && (Date.now() - new Date(r.createdAt).getTime()) < 2 * 60 * 60 * 1000
                    );
                    if (recentVerifiedReport) {
                      const minutes = Math.floor((Date.now() - new Date(recentVerifiedReport.createdAt).getTime()) / 60000);
                      const timeStr = minutes >= 60 ? `${Math.floor(minutes / 60)} hs` : `${minutes} min`;
                      return (
                        <div className="bg-green-50 text-green-700 border-green-200 border px-2 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1.5">
                          <span>✅</span> Confirmada por la comunidad hace {timeStr}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 bg-muted/30 px-2 py-1.5 rounded-lg border border-border/50">
                    <span>Distancia</span>
                    <span className="text-foreground">{pharmacy.distance?.toFixed(1)} km</span>
                  </div>

                  <Button 
                    size="sm"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest h-10 shadow-md gap-2"
                    onClick={() => handleNavigate(pharmacy)}
                  >
                    <Navigation className="h-3.5 w-3.5" strokeWidth={3} />
                    Navegar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-[10px] font-black uppercase tracking-widest h-9 gap-2"
                    onClick={() => handleStreetView(pharmacy)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver calle
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {routeSummary && selectedPharmacy && (
        <div className="absolute right-4 top-4 z-[500] rounded-xl border bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ruta hasta {selectedPharmacy.name}</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {routeSummary.durationMinutes} min · {routeSummary.distanceKm.toFixed(1)} km
          </p>
          <p className="text-[10px] text-muted-foreground">Estimación en auto</p>
        </div>
      )}
    </div>
  )
}

export function PharmacyMap(props: PharmacyMapProps) {
  return <PharmacyMapContent {...props} />
}
