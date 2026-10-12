'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Pharmacy } from '@/lib/pharmacy-data'
import type { FireStation } from '@/lib/fire-station-data'
import { IDEJUY_FIRE_STATIONS_URL } from '@/lib/fire-station-data'
import type { PoliceStation } from '@/lib/police-station-data'
import { IDEJUY_POLICE_STATIONS_URL } from '@/lib/police-station-data'
import type { HealthFacility, HealthFacilityType } from '@/lib/health-facility-data'
import { getHealthDatasetUrl, getHealthDatasetDescription, IDEJUY_HEALTH_MAP_URL } from '@/lib/health-facility-data'
import { toTitleCase } from '@/lib/locality-utils'
import { cn, formatDuration } from '@/lib/utils'
import {
  Bike,
  Building2,
  Car,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Flame,
  Footprints,
  HeartPulse,
  Hospital,
  Navigation,
  Pill,
  Phone,
  Shield,
  ShieldAlert,
  Stethoscope,
  Users,
  Cross,
  X,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react'
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

function FitResultBounds({ points, enabled }: { points: Array<{ lat: number; lng: number }>; enabled: boolean }) {
  const map = require('react-leaflet').useMap()

  useEffect(() => {
    if (!enabled || points.length === 0) return
    const validPoints = points.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        (point.lat !== 0 || point.lng !== 0) &&
        point.lat <= -21.0 &&
        point.lat >= -26.0 &&
        point.lng <= -64.0 &&
        point.lng >= -68.5
    )
    if (validPoints.length === 0) return
    const L = require('leaflet')
    const bounds = L.latLngBounds(validPoints.map((point) => [point.lat, point.lng]))
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 })
  }, [enabled, points, map])

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
  healthFacilities?: HealthFacility[]
  fireStations?: FireStation[]
  policeStations?: PoliceStation[]
  center: [number, number]
  selectedPharmacy?: Pharmacy | null
  onSelectPharmacy?: (pharmacy: Pharmacy | null) => void
  selectedHealthFacility?: HealthFacility | null
  onSelectHealthFacility?: (facility: HealthFacility | null) => void
  selectedFireStation?: FireStation | null
  onSelectFireStation?: (station: FireStation | null) => void
  selectedPoliceStation?: PoliceStation | null
  onSelectPoliceStation?: (station: PoliceStation | null) => void
  userLocation?: [number, number] | null
  fitToResults?: boolean
  travelMode: TravelMode
  onTravelModeChange: (mode: TravelMode) => void
  favoriteIds?: string[]
  onToggleFavorite?: (pharmacy: Pharmacy) => void
  className?: string
}

function PharmacyMapContent({
  pharmacies,
  healthFacilities = [],
  fireStations = [],
  policeStations = [],
  center,
  selectedPharmacy,
  onSelectPharmacy,
  selectedHealthFacility: propSelectedHealthFacility,
  onSelectHealthFacility,
  selectedFireStation: propSelectedFireStation,
  onSelectFireStation,
  selectedPoliceStation: propSelectedPoliceStation,
  onSelectPoliceStation,
  userLocation,
  fitToResults = false,
  travelMode,
  onTravelModeChange,
  favoriteIds = [],
  onToggleFavorite,
  className,
}: PharmacyMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showPharmacies, setShowPharmacies] = useState(true)
  const [showHealthFacilities, setShowHealthFacilities] = useState(true)
  const [showFireStations, setShowFireStations] = useState(true)
  const [showPoliceStations, setShowPoliceStations] = useState(true)
  const [internalHealthFacility, setInternalHealthFacility] = useState<HealthFacility | null>(null)
  const [internalFireStation, setInternalFireStation] = useState<FireStation | null>(null)
  const [internalPoliceStation, setInternalPoliceStation] = useState<PoliceStation | null>(null)

  const selectedHealthFacility = propSelectedHealthFacility !== undefined ? propSelectedHealthFacility : internalHealthFacility
  const selectedFireStation = propSelectedFireStation !== undefined ? propSelectedFireStation : internalFireStation
  const selectedPoliceStation = propSelectedPoliceStation !== undefined ? propSelectedPoliceStation : internalPoliceStation

  const updateSelectedHealthFacility = (facility: HealthFacility | null) => {
    setInternalHealthFacility(facility)
    onSelectHealthFacility?.(facility)
  }

  const updateSelectedFireStation = (station: FireStation | null) => {
    setInternalFireStation(station)
    onSelectFireStation?.(station)
  }

  const updateSelectedPoliceStation = (station: PoliceStation | null) => {
    setInternalPoliceStation(station)
    onSelectPoliceStation?.(station)
  }

  const visibleResults = useMemo(() => [
    ...(showPharmacies ? pharmacies : []),
    ...(showHealthFacilities ? healthFacilities : []),
    ...(showFireStations ? fireStations : []),
    ...(showPoliceStations ? policeStations : []),
  ], [showPharmacies, pharmacies, showHealthFacilities, healthFacilities, showFireStations, fireStations, showPoliceStations, policeStations])

  useEffect(() => {
    if (selectedHealthFacility && !healthFacilities.some((facility) => facility.id === selectedHealthFacility.id)) {
      updateSelectedHealthFacility(null)
    }
    if (selectedFireStation && !fireStations.some((station) => station.id === selectedFireStation.id)) {
      updateSelectedFireStation(null)
    }
    if (selectedPoliceStation && !policeStations.some((station) => station.id === selectedPoliceStation.id)) {
      updateSelectedPoliceStation(null)
    }
  }, [healthFacilities, fireStations, policeStations, selectedHealthFacility, selectedFireStation, selectedPoliceStation])

  useEffect(() => {
    if (selectedHealthFacility && mapRef.current) {
      mapRef.current.setView([selectedHealthFacility.lat, selectedHealthFacility.lng], Math.max(mapRef.current.getZoom(), 15))
    }
  }, [selectedHealthFacility])

  useEffect(() => {
    if (selectedFireStation && mapRef.current) {
      mapRef.current.setView([selectedFireStation.lat, selectedFireStation.lng], Math.max(mapRef.current.getZoom(), 15))
    }
  }, [selectedFireStation])

  useEffect(() => {
    if (selectedPoliceStation && mapRef.current) {
      mapRef.current.setView([selectedPoliceStation.lat, selectedPoliceStation.lng], Math.max(mapRef.current.getZoom(), 15))
    }
  }, [selectedPoliceStation])

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
      updateSelectedHealthFacility(null)
      updateSelectedFireStation(null)
      updateSelectedPoliceStation(null)
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

    const width = isSelected ? 42 : 34
    const height = isSelected ? 52 : 44

    // Status colors
    let pinColor = '#475569' // Closed: slate-600
    let crossOpacity = 0.75
    let extraClass = ''
    let statusBadge = ''

    if (pharmacy.isOnDuty) {
      pinColor = '#16a34a' // Green
      crossOpacity = 1
      extraClass += ' on-duty-marker'
    }

    if (pharmacy.isVoluntary) {
      pinColor = '#2563eb' // Blue
      crossOpacity = 1
      extraClass += ' voluntary-marker'
    }

    if (pharmacy.isPermanentlyOnDuty && pharmacy.isOnDuty) {
      pinColor = '#0284c7' // Electric Sky Blue
      crossOpacity = 1
      statusBadge = `
        <div style="
          position: absolute;
          top: -4px;
          right: -6px;
          background: #0284c7;
          color: #ffffff;
          font-size: 8px;
          font-weight: 900;
          padding: 1px 4px;
          border-radius: 999px;
          border: 1.5px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          line-height: 1.1;
          letter-spacing: 0.3px;
        ">24h</div>
      `
    }

    if (pharmacy.activityLevel > 70) {
      extraClass += ' high-activity-aura'
    }

    if (isSelected) {
      extraClass += ' is-selected'
    }

    // Community Report Logic for Icon
    const latestReport = pharmacy.communityReports?.[0]

    if (latestReport && !latestReport.isOnDuty) {
      statusBadge = `
        <div style="
          position: absolute; 
          top: -4px; 
          right: -6px; 
          background: #ea580c; 
          color: white; 
          border: 1.5px solid white; 
          border-radius: 50%; 
          width: 17px; 
          height: 17px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 10px; 
          font-weight: 900; 
          z-index: 10; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          animation: pulse-danger 2s infinite;
        ">!</div>
      `
      extraClass += ' reported-closed-glow'
    } else {
      const recentVerifiedReport = pharmacy.communityReports?.find(
        (r) => r.isOnDuty && (Date.now() - new Date(r.createdAt).getTime()) < 2 * 60 * 60 * 1000
      )
      if (recentVerifiedReport) {
        statusBadge = `
          <div style="
            position: absolute; 
            top: -4px; 
            right: -6px; 
            background: #16a34a; 
            border: 1.5px solid white; 
            border-radius: 50%; 
            width: 17px; 
            height: 17px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            z-index: 10; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          ">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        `
      }
    }

    return L.divIcon({
      className: `pharmacy-marker ${extraClass}`,
      html: `
        <div style="
          width: ${width}px;
          height: ${height}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
          transition: transform 0.2s ease-out;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
        ">
          <svg width="${width}" height="${height}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 43C17 43 31.5 28.5 31.5 16C31.5 8 25 1.5 17 1.5C9 1.5 2.5 8 2.5 16C2.5 28.5 17 43 17 43Z" fill="${pinColor}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="17" cy="16" r="11" fill="rgba(255,255,255,0.18)"/>
            <rect x="14.2" y="8" width="5.6" height="16" rx="2" fill="#ffffff" fill-opacity="${crossOpacity}"/>
            <rect x="9" y="13.2" width="16" height="5.6" rx="2" fill="#ffffff" fill-opacity="${crossOpacity}"/>
          </svg>
          ${statusBadge}
        </div>
      `,
      iconSize: [width, height],
      iconAnchor: [width / 2, height - 1],
      popupAnchor: [0, -height],
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

  const createHealthFacilityIcon = (facility: HealthFacility, isSelected: boolean) => {
    if (typeof window === 'undefined') return undefined
    const L = require('leaflet')
    const width = isSelected ? 42 : 34
    const height = isSelected ? 52 : 44

    let pinColor = '#dc2626'
    let tag = 'SALUD'
    let innerSvg = ''

    switch (facility.type) {
      case 'NODO SANITARIO':
        pinColor = '#dc2626' // Red
        tag = 'NODO'
        innerSvg = `
          <rect x="9.5" y="8.5" width="15" height="15" rx="3" fill="rgba(255,255,255,0.2)"/>
          <path d="M12.5 11v10M21.5 11v10M12.5 16h9" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"/>
        `
        break
      case 'CAPS':
        pinColor = '#e11d48' // Rose
        tag = 'CAPS'
        innerSvg = `
          <path d="M17 22.5s-6.2-4.2-6.2-8.2a3.8 3.8 0 0 1 6.2-3.1 3.8 3.8 0 0 1 6.2 3.1c0 4-6.2 8.2-6.2 8.2z" fill="#ffffff"/>
          <path d="M17 11.8v6.4M13.8 15h6.4" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round"/>
        `
        break
      case 'CIC':
        pinColor = '#0d9488' // Teal
        tag = 'CIC'
        innerSvg = `
          <circle cx="14" cy="11.5" r="2.2" fill="#ffffff"/>
          <circle cx="20" cy="13" r="1.8" fill="#ffffff"/>
          <path d="M10 20v-1a4 4 0 0 1 7.2-1.8" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M16 20v-.8a3 3 0 0 1 5.2-1.5" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M17 9v2.5M15.8 10.2h2.4" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
        `
        break
      case 'PUESTO DE SALUD':
      default:
        pinColor = '#ea580c' // Coral
        tag = 'PUESTO'
        innerSvg = `
          <rect x="10" y="11.5" width="14" height="10" rx="2.5" fill="#ffffff"/>
          <path d="M14 11.5V10a1.2 1.2 0 0 1 1.2-1.2h3.6a1.2 1.2 0 0 1 1.2 1.2v1.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M17 13.5v6M14 16.5h6" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round"/>
        `
        break
    }

    return L.divIcon({
      className: 'health-facility-marker',
      html: `
        <div style="
          width: ${width}px;
          height: ${height}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
          transition: transform 0.2s ease-out;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
        ">
          <div style="
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: #ffffff;
            font-size: 8px;
            font-weight: 900;
            padding: 1px 4.5px;
            border-radius: 999px;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.4);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            letter-spacing: 0.5px;
            line-height: 1.1;
            z-index: 5;
          ">${tag}</div>
          <svg width="${width}" height="${height}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 43C17 43 31.5 28.5 31.5 16C31.5 8 25 1.5 17 1.5C9 1.5 2.5 8 2.5 16C2.5 28.5 17 43 17 43Z" fill="${pinColor}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="17" cy="16" r="11" fill="rgba(255,255,255,0.18)"/>
            ${innerSvg}
          </svg>
        </div>
      `,
      iconSize: [width, height],
      iconAnchor: [width / 2, height - 1],
      popupAnchor: [0, -height],
    })
  }

  const handleSelectHealthFacility = (facility: HealthFacility) => {
    onSelectPharmacy?.(null)
    updateSelectedFireStation(null)
    updateSelectedPoliceStation(null)
    updateSelectedHealthFacility(facility)
    mapRef.current?.setView([facility.lat, facility.lng], Math.max(mapRef.current.getZoom(), 15))
  }

  const createFireStationIcon = (station: FireStation, isSelected: boolean) => {
    if (typeof window === 'undefined') return undefined
    const L = require('leaflet')
    const width = isSelected ? 42 : 34
    const height = isSelected ? 52 : 44
    const pinColor = '#ea580c'

    return L.divIcon({
      className: 'fire-station-marker',
      html: `
        <div style="
          width: ${width}px;
          height: ${height}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
          transition: transform 0.2s ease-out;
          filter: drop-shadow(0 4px 10px rgba(194, 65, 12, 0.45));
        ">
          <div style="
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            background: #7c2d12;
            color: #ffedd5;
            font-size: 8px;
            font-weight: 900;
            padding: 1px 4.5px;
            border-radius: 999px;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.4);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            letter-spacing: 0.5px;
            line-height: 1.1;
            z-index: 5;
          ">BOMBEROS</div>
          <svg width="${width}" height="${height}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 43C17 43 31.5 28.5 31.5 16C31.5 8 25 1.5 17 1.5C9 1.5 2.5 8 2.5 16C2.5 28.5 17 43 17 43Z" fill="${pinColor}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="17" cy="16" r="11" fill="rgba(255,255,255,0.18)"/>
            <path d="M17 8.5l6 2.8v5c0 4.2-2.7 7.2-6 8.2-3.3-1-6-4-6-8.2v-5l6-2.8z" fill="#ffffff"/>
            <path d="M17 11.5c1.4 1.8 2.2 3.2 2.2 4.5 0 1.2-.9 2.2-2.2 2.2s-2.2-1-2.2-2.2c0-1.1.8-2 1.4-2.8.3.8.7 1.3 1.2 1.3.4 0 .7-.3.7-.7 0-.7-.5-1.4-1.1-2.3z" fill="#ea580c"/>
          </svg>
        </div>
      `,
      iconSize: [width, height],
      iconAnchor: [width / 2, height - 1],
      popupAnchor: [0, -height],
    })
  }

  const handleSelectFireStation = (station: FireStation) => {
    onSelectPharmacy?.(null)
    updateSelectedHealthFacility(null)
    updateSelectedPoliceStation(null)
    updateSelectedFireStation(station)
    mapRef.current?.setView([station.lat, station.lng], Math.max(mapRef.current.getZoom(), 15))
  }

  const createPoliceStationIcon = (station: PoliceStation, isSelected: boolean) => {
    if (typeof window === 'undefined') return undefined
    const L = require('leaflet')
    const width = isSelected ? 42 : 34
    const height = isSelected ? 52 : 44
    const pinColor = '#2563eb'

    let tag = 'COMISARÍA'
    if (station.type === 'Sub Comisaría') tag = 'SUB-COM.'
    else if (station.type === 'Destacamento') tag = 'DESTAC.'
    else if (station.type === 'Unidad Regional') tag = 'UR'

    return L.divIcon({
      className: 'police-station-marker',
      html: `
        <div style="
          width: ${width}px;
          height: ${height}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transform: ${isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)'};
          transition: transform 0.2s ease-out;
          filter: drop-shadow(0 4px 10px rgba(37, 99, 235, 0.45));
        ">
          <div style="
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            background: #1e3a8a;
            color: #dbeafe;
            font-size: 8px;
            font-weight: 900;
            padding: 1px 4.5px;
            border-radius: 999px;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.4);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            letter-spacing: 0.5px;
            line-height: 1.1;
            z-index: 5;
          ">${tag}</div>
          <svg width="${width}" height="${height}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 43C17 43 31.5 28.5 31.5 16C31.5 8 25 1.5 17 1.5C9 1.5 2.5 8 2.5 16C2.5 28.5 17 43 17 43Z" fill="${pinColor}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="17" cy="16" r="11" fill="rgba(255,255,255,0.18)"/>
            <path d="M17 8.5l6.5 3v5.5c0 4.5-2.8 7.5-6.5 8.5-3.7-1-6.5-4-6.5-8.5v-5.5l6.5-3z" fill="#ffffff"/>
            <path d="M17 11.2l4.2 2v3.6c0 2.9-1.8 4.9-4.2 5.5-2.4-.6-4.2-2.6-4.2-5.5v-3.6l4.2-2z" fill="#2563eb"/>
          </svg>
        </div>
      `,
      iconSize: [width, height],
      iconAnchor: [width / 2, height - 1],
      popupAnchor: [0, -height],
    })
  }

  const handleSelectPoliceStation = (station: PoliceStation) => {
    onSelectPharmacy?.(null)
    updateSelectedHealthFacility(null)
    updateSelectedFireStation(null)
    updateSelectedPoliceStation(station)
    mapRef.current?.setView([station.lat, station.lng], Math.max(mapRef.current.getZoom(), 15))
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

        <FitResultBounds points={visibleResults} enabled={fitToResults} />

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

        {showHealthFacilities && healthFacilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.lat, facility.lng]}
            icon={createHealthFacilityIcon(facility, selectedHealthFacility?.id === facility.id)}
            zIndexOffset={selectedHealthFacility?.id === facility.id ? 800 : 150}
            alt={`Centro de salud: ${facility.name}`}
            title={facility.name}
            eventHandlers={{ click: () => handleSelectHealthFacility(facility) }}
          />
        ))}

        {showFireStations && fireStations.map((station) => (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createFireStationIcon(station, selectedFireStation?.id === station.id)}
            zIndexOffset={selectedFireStation?.id === station.id ? 800 : 200}
            alt={`Cuartel de bomberos: ${station.name}`}
            title={station.name}
            eventHandlers={{ click: () => handleSelectFireStation(station) }}
          />
        ))}

        {showPoliceStations && policeStations.map((station) => (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createPoliceStationIcon(station, selectedPoliceStation?.id === station.id)}
            zIndexOffset={selectedPoliceStation?.id === station.id ? 800 : 200}
            alt={`Comisaría / Seguridad: ${station.name}`}
            title={station.name}
            eventHandlers={{ click: () => handleSelectPoliceStation(station) }}
          />
        ))}

        {showPharmacies && pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            position={displayPositions.get(pharmacy.id) || [pharmacy.lat, pharmacy.lng]}
            icon={createCustomIcon(pharmacy, selectedPharmacy?.id === pharmacy.id)}
            zIndexOffset={selectedPharmacy?.id === pharmacy.id ? 900 : 300}
            eventHandlers={{
              click: () => {
                updateSelectedHealthFacility(null)
                updateSelectedFireStation(null)
                updateSelectedPoliceStation(null)
                onSelectPharmacy?.(pharmacy)
              },
            }}
          />
        ))}
      </MapContainer>
      <div className="absolute inset-x-2 top-[72px] z-[400] md:right-auto md:top-3 md:w-[490px]">
        <div className="grid grid-cols-4 gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-lg backdrop-blur-md" aria-label="Filtrar puntos del mapa">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn('h-9 min-w-0 gap-1 rounded-xl px-1 text-[9px] font-bold sm:text-xs', showPharmacies ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold' : 'text-muted-foreground opacity-65')}
            onClick={() => {
              setShowPharmacies((visible) => !visible)
              if (showPharmacies) onSelectPharmacy?.(null)
            }}
            aria-pressed={showPharmacies}
          >
            <Pill className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Farmacias</span>
            <span className="rounded-full bg-background/80 px-1 py-0.5 text-[9px] shrink-0">{pharmacies.length}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn('h-9 min-w-0 gap-1 rounded-xl px-1 text-[9px] font-bold sm:text-xs', showHealthFacilities ? 'bg-red-500/10 text-red-700 dark:text-red-300 font-extrabold' : 'text-muted-foreground opacity-65')}
            onClick={() => {
              setShowHealthFacilities((visible) => !visible)
              if (showHealthFacilities) updateSelectedHealthFacility(null)
            }}
            aria-pressed={showHealthFacilities}
          >
            <HeartPulse className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
            <span className="truncate">Salud</span>
            <span className="rounded-full bg-background/80 px-1 py-0.5 text-[9px] shrink-0">{healthFacilities.length}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn('h-9 min-w-0 gap-1 rounded-xl px-1 text-[9px] font-bold sm:text-xs', showFireStations ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 font-extrabold' : 'text-muted-foreground opacity-65')}
            onClick={() => {
              setShowFireStations((visible) => !visible)
              if (showFireStations) updateSelectedFireStation(null)
            }}
            aria-pressed={showFireStations}
          >
            <Flame className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="truncate">Bomberos</span>
            <span className="rounded-full bg-background/80 px-1 py-0.5 text-[9px] shrink-0">{fireStations.length}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn('h-9 min-w-0 gap-1 rounded-xl px-1 text-[9px] font-bold sm:text-xs', showPoliceStations ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-extrabold' : 'text-muted-foreground opacity-65')}
            onClick={() => {
              setShowPoliceStations((visible) => !visible)
              if (showPoliceStations) updateSelectedPoliceStation(null)
            }}
            aria-pressed={showPoliceStations}
          >
            <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">Comisarías</span>
            <span className="rounded-full bg-background/80 px-1 py-0.5 text-[9px] shrink-0">{policeStations.length}</span>
          </Button>
        </div>
      </div>
      {selectedHealthFacility && (
        <div className="absolute inset-x-3 top-[128px] z-[500] rounded-2xl border border-red-500/20 bg-card/98 p-4 shadow-2xl backdrop-blur-md md:inset-x-auto md:right-4 md:top-4 md:w-[360px]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60" aria-hidden="true">
              {selectedHealthFacility.type === 'NODO SANITARIO' ? (
                <Hospital className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : selectedHealthFacility.type === 'CAPS' ? (
                <HeartPulse className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              ) : selectedHealthFacility.type === 'CIC' ? (
                <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              ) : (
                <Cross className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Badge className={cn(
                'mb-1 text-[9px] font-black uppercase tracking-widest text-white',
                selectedHealthFacility.type === 'NODO SANITARIO' ? 'bg-red-600' :
                selectedHealthFacility.type === 'CAPS' ? 'bg-rose-600' :
                selectedHealthFacility.type === 'CIC' ? 'bg-teal-600' : 'bg-orange-600'
              )}>
                {selectedHealthFacility.type}
              </Badge>
              <h3 className="font-heading text-sm font-black uppercase leading-tight tracking-tight text-foreground">
                {toTitleCase(selectedHealthFacility.name)}
              </h3>
              <p className="mt-0.5 text-[11px] leading-snug font-medium text-foreground/80">
                {getHealthDatasetDescription(selectedHealthFacility.type)}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                {selectedHealthFacility.locality} · {selectedHealthFacility.authority} · Jurisdicción {selectedHealthFacility.jurisdiction.toLocaleLowerCase('es')}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={() => updateSelectedHealthFacility(null)}
              aria-label="Cerrar información del centro de salud"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              className="h-10 flex-1 gap-2 rounded-xl bg-red-600 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700 shadow-sm"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedHealthFacility.lat},${selectedHealthFacility.lng}`, '_blank', 'noopener,noreferrer')}
            >
              <Navigation className="h-4 w-4" /> Cómo llegar
            </Button>
            <Button asChild type="button" size="icon" variant="outline" className="h-10 w-10 rounded-xl" title="Ver fuente oficial en IDEJuy">
              <a
                href={selectedHealthFacility.datasetUrl || getHealthDatasetUrl(selectedHealthFacility.type, selectedHealthFacility.datasetId)}
                target="_blank"
                rel="noreferrer"
                aria-label="Ver datos en IDEJuy"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Fuente oficial: IDEJuy {selectedHealthFacility.datasetId ? `(Dataset #${selectedHealthFacility.datasetId})` : ''} · Ministerio de Salud de Jujuy
          </p>
        </div>
      )}
      {selectedFireStation && (
        <div className="absolute inset-x-3 top-[128px] z-[500] rounded-2xl border border-orange-500/25 bg-card/98 p-4 shadow-2xl backdrop-blur-md md:inset-x-auto md:right-4 md:top-4 md:w-[360px]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" aria-hidden="true">
              <Flame className="h-6 w-6 text-orange-600 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <Badge className="mb-1 bg-orange-600 text-[9px] font-black uppercase tracking-widest text-white">
                {selectedFireStation.type}
              </Badge>
              <h3 className="font-heading text-sm font-black uppercase leading-tight tracking-tight text-foreground">
                {toTitleCase(selectedFireStation.name)}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {[selectedFireStation.description, selectedFireStation.authority].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={() => updateSelectedFireStation(null)}
              aria-label="Cerrar información del cuartel de bomberos"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              className="h-10 flex-1 gap-2 rounded-xl bg-orange-600 text-xs font-black uppercase tracking-wider text-white hover:bg-orange-700 shadow-sm"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedFireStation.lat},${selectedFireStation.lng}`, '_blank', 'noopener,noreferrer')}
            >
              <Navigation className="h-4 w-4" /> Cómo llegar
            </Button>
            <Button asChild type="button" variant="outline" className="h-10 gap-1.5 rounded-xl border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:text-orange-300 font-bold text-xs" title="Llamar al 100 de Bomberos">
              <a href="tel:100" aria-label="Llamar al 100 de Bomberos">
                <Phone className="h-4 w-4" /> 100
              </a>
            </Button>
            <Button asChild size="icon" variant="outline" className="h-10 w-10 rounded-xl" title="Ver fuente oficial en IDEJuy">
              <a href={IDEJUY_FIRE_STATIONS_URL} target="_blank" rel="noreferrer" aria-label="Ver cuarteles en IDEJuy">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Fuente: IDEJuy (Dataset #151) · Ministerio de Seguridad de Jujuy</p>
        </div>
      )}
      {selectedPoliceStation && (
        <div className="absolute inset-x-3 top-[128px] z-[500] rounded-2xl border border-blue-500/25 bg-card/98 p-4 shadow-2xl backdrop-blur-md md:inset-x-auto md:right-4 md:top-4 md:w-[360px]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" aria-hidden="true">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <Badge className="mb-1 bg-blue-600 text-[9px] font-black uppercase tracking-widest text-white">
                {selectedPoliceStation.type || 'COMISARÍA'}
              </Badge>
              <h3 className="font-heading text-sm font-black uppercase leading-tight tracking-tight text-foreground">
                {toTitleCase(selectedPoliceStation.name)}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {[selectedPoliceStation.description, selectedPoliceStation.authority, selectedPoliceStation.locality].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={() => updateSelectedPoliceStation(null)}
              aria-label="Cerrar información de la comisaría"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              className="h-10 flex-1 gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700 shadow-sm"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPoliceStation.lat},${selectedPoliceStation.lng}`, '_blank', 'noopener,noreferrer')}
            >
              <Navigation className="h-4 w-4" /> Cómo llegar
            </Button>
            <Button asChild type="button" variant="outline" className="h-10 gap-1.5 rounded-xl border-blue-500/30 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300 font-bold text-xs" title="Llamar al 911">
              <a href="tel:911" aria-label="Llamar al 911">
                <Phone className="h-4 w-4" /> 911
              </a>
            </Button>
            <Button asChild size="icon" variant="outline" className="h-10 w-10 rounded-xl" title="Ver fuente oficial en IDEJuy">
              <a href={IDEJUY_POLICE_STATIONS_URL} target="_blank" rel="noreferrer" aria-label="Ver comisarías en IDEJuy">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Fuente: IDEJuy (Dataset #150) · Ministerio de Seguridad de Jujuy</p>
        </div>
      )}
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
              <h3 className="text-base font-heading font-black text-foreground truncate tracking-tight">
                {toTitleCase(selectedPharmacy.name)}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {toTitleCase(selectedPharmacy.address)}
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
                    {formatDuration(routeSummary.durationMinutes)}
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
