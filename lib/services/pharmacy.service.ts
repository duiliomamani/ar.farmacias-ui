import type { Pharmacy } from '../pharmacy-data';
import { ApiService } from '../api-service';

export interface ReportPayload {
  pharmacyId: string;
  isOnDuty: boolean;
  lat: number;
  lng: number;
  deviceId: string;
}

const formatISO = (dateStr?: string) => {
  if (!dateStr) return undefined;
  try {
    return new Date(dateStr).toISOString();
  } catch (e) {
    return dateStr;
  }
};

// Mapper function to handle backend response differences
function mapBackendPharmacy(item: any): Pharmacy {
  return {
    id: item.id || item._id,
    name: item.name,
    address: item.address || item.city || 'Dirección no disponible',
    lat: item.location?.coordinates?.[1] || 0,
    lng: item.location?.coordinates?.[0] || 0,
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
    distance: item.distance ? item.distance / 1000 : 0, 
    veracityScore: item.veracityScore || 100,
    city: item.city,
    shifts: item.shifts || [],
  };
}

export class PharmacyService {
  static async getNearby(lat: number, lng: number, radius = 5000, date?: string): Promise<Pharmacy[]> {
    const isoDate = formatISO(date);
    const data = await ApiService.getAll<any[]>('/api/pharmacies/nearby', { lat, lng, radius, date: isoDate });
    return data.map(mapBackendPharmacy);
  }

  static async getByDate(date: string, city?: string): Promise<Pharmacy[]> {
    const isoDate = formatISO(date);
    const data = await ApiService.getAll<any[]>('/api/pharmacies/by-date', { date: isoDate, city });
    return data.map(mapBackendPharmacy);
  }

  static async reportStatus(payload: ReportPayload): Promise<void> {
    await ApiService.post('/api/pharmacies/report', payload);
  }
}

export default PharmacyService;
