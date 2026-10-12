import type { Pharmacy } from '../pharmacy-data';
import { BffClient } from '../bff-client';

const formatISO = (dateStr?: string) => {
  if (!dateStr) return undefined;
  try {
    return new Date(dateStr).toISOString();
  } catch (e) {
    return dateStr;
  }
};

const JUJUY_CITY_FALLBACKS: Record<string, [number, number]> = {
  'LA QUIACA': [-22.1025, -65.5975],
  'ABRA PAMPA': [-22.7214, -65.6964],
  'HUMAHUACA': [-23.2054, -65.3503],
  'TILCARA': [-23.5775, -65.3925],
  'PURMAMARCA': [-23.7475, -65.4988],
  'MAIMARA': [-23.6231, -65.4092],
  'SAN SALVADOR DE JUJUY': [-24.1856, -65.2995],
  'PALPALA': [-24.2564, -65.2117],
  'PERICO': [-24.3826, -65.1171],
  'CIUDAD DE PERICO': [-24.3826, -65.1171],
  'EL CARMEN': [-24.3875, -65.2594],
  'MONTERRICO': [-24.4382, -65.1622],
  'SAN PEDRO DE JUJUY': [-24.2333, -64.8667],
  'SAN PEDRO': [-24.2333, -64.8667],
  'LA ESPERANZA': [-24.2258, -64.8383],
  'LA MENDIETA': [-24.3183, -64.9658],
  'LIBERTADOR GRAL. SAN MARTÍN': [-23.8064, -64.7876],
  'LIBERTADOR GRAL SAN MARTIN': [-23.8064, -64.7876],
  'LDOR. GRAL SAN MARTIN': [-23.8064, -64.7876],
  'LEDESMA': [-23.8064, -64.7876],
  'CALILEGUA': [-23.7744, -64.7709],
  'FRAILE PINTADO': [-23.9408, -64.7992],
  'YUTO': [-23.6394, -64.4727],
  'CAIMANCITO': [-23.7431, -64.5956],
  'PALMA SOLA': [-23.9786, -64.3056],
  'SANTA CLARA': [-24.3167, -64.6667],
  'SUSQUES': [-23.4000, -66.3667],
};

function isValidJujuyCoordinate(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return lat <= -21.0 && lat >= -26.0 && lng <= -64.0 && lng >= -68.5;
}

function getCityFallback(city?: string): { lat: number; lng: number } {
  if (!city) return { lat: -24.1856, lng: -65.2995 };
  const normalized = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  for (const [name, coords] of Object.entries(JUJUY_CITY_FALLBACKS)) {
    const normName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (normName === normalized || normalized.includes(normName) || normName.includes(normalized)) {
      return { lat: coords[0], lng: coords[1] };
    }
  }
  return { lat: -24.1856, lng: -65.2995 };
}

// Mapper function to handle backend response differences
function mapBackendPharmacy(item: any): Pharmacy {
  let rawLat = Number(item.location?.coordinates?.[1] ?? item.lat);
  let rawLng = Number(item.location?.coordinates?.[0] ?? item.lng);

  if (!isValidJujuyCoordinate(rawLat, rawLng)) {
    const fallback = getCityFallback(item.city);
    rawLat = fallback.lat;
    rawLng = fallback.lng;
  }

  return {
    id: item.id || item._id,
    name: item.name,
    address: item.address || item.city || 'Dirección no disponible',
    lat: rawLat,
    lng: rawLng,
    phone: item.phone || 'Sin teléfono',
    isOnDuty: item.isOnDuty ?? false,
    type: item.type || 'pharmacy',
    verificationStatus: item.verificationStatus || 'verified',
    activityLevel: item.activityLevel || 50,
    closingTime: item.dutyUntil || item.closingTime, // Maintain compatibility
    openingHours: item.openingHours,
    dutyUntil: item.dutyUntil,
    dutyFrom: item.dutyFrom,
    isPermanentlyOnDuty: item.isPermanentlyOnDuty,
    isVoluntary: item.isVoluntary,
    distance: item.distance ? item.distance / 1000 : 0, 
    veracityScore: item.veracityScore || 100,
    city: item.city,
    shifts: item.shifts || [],
    communityReports: item.communityReports || [],
  };
}

export class PharmacyService {
  static async getNearby(lat: number, lng: number, radius = 5000, date?: string): Promise<Pharmacy[]> {
    const isoDate = formatISO(date);
    const data = await BffClient.get<any[]>('/api/pharmacies/nearby', { lat, lng, radius, date: isoDate });
    return data.map(mapBackendPharmacy);
  }

  static async getByDate(date: string, city?: string): Promise<Pharmacy[]> {
    const isoDate = formatISO(date);
    const data = await BffClient.get<any[]>('/api/pharmacies/by-date', { date: isoDate, city });
    return data.map(mapBackendPharmacy);
  }

  static async submitCommunityReport(pharmacyId: string, report: {
    isOpen: boolean;
    lat: number;
    lng: number;
    deviceId: string;
    turnstileToken: string;
  }): Promise<{ accepted: boolean; expiresAt: string }> {
    return BffClient.post(
      `/api/pharmacies/${encodeURIComponent(pharmacyId)}/community-reports`,
      report,
      { showToast: false },
    );
  }

}

export default PharmacyService;
