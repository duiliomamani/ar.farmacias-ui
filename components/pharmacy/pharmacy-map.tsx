'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { cn } from '@/lib/utils'
import { Navigation, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import 'leaflet/dist/leaflet.css'

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

  useEffect(() => {
    if (mapRef.current && selectedPharmacy) {
      mapRef.current.setView([selectedPharmacy.lat, selectedPharmacy.lng], 16)
    }
  }, [selectedPharmacy])

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
        <div style="position: absolute; top: -2px; right: -2px; background: #ea580c; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; display: flex; items-center; justify-center; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <span style="color: white; font-size: 10px; font-weight: bold; transform: translateY(-1px);">!</span>
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
          <div style="position: absolute; top: -2px; right: -2px; background: #16a34a; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; display: flex; items-center; justify-center; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker position={userLocation} icon={createUserLocationIcon()} zIndexOffset={1000} />
        )}

        {pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            position={[pharmacy.lat, pharmacy.lng]}
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
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export function PharmacyMap(props: PharmacyMapProps) {
  return <PharmacyMapContent {...props} />
}
