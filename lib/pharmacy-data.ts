export type HealthCenterType = 'pharmacy' | 'hospital' | 'community'
export type VerificationStatus = 'verified' | 'pending' | 'institutional' | 'community_verified'

export interface Shift {
  dutyUntil: string;
  isOnDuty: boolean;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  isOnDuty: boolean; // Represents if it's on duty for the *selected date*
  type: HealthCenterType;
  verificationStatus: VerificationStatus;
  activityLevel: number; // 0-100 (Heatmap)
  lastConfirmed?: string;
  closingTime?: string; // For the *current* or *selected* shift
  distance?: number;
  veracityScore?: number; // Percentage 0-100
  city?: string;
  shifts: Shift[]; // Array of all upcoming shifts
}

// ... (mockPharmacies remains the same for now, but will need updating to fit the new structure if used)

export function groupPharmacies(pharmacies: Pharmacy[]): Pharmacy[] {
  const pharmacyMap = new Map<string, Pharmacy>();

  pharmacies.forEach((pharmacy) => {
    const key = `${pharmacy.lat.toFixed(5)}-${pharmacy.lng.toFixed(5)}`;
    
    if (!pharmacyMap.has(key)) {
      // If it's the first time we see this pharmacy, initialize it with an empty shifts array
      pharmacyMap.set(key, { ...pharmacy, shifts: [] });
    }

    const existingPharmacy = pharmacyMap.get(key)!;

    // Add the current entry's shift information if it's not already added
    if (pharmacy.closingTime) {
      const shiftDate = new Date(pharmacy.closingTime).toLocaleDateString('es-AR', { 
        day: 'numeric', 
        month: 'short' 
      });
      
      const alreadyHasShift = existingPharmacy.shifts.some(s => {
        const existingDate = new Date(s.dutyUntil).toLocaleDateString('es-AR', { 
          day: 'numeric', 
          month: 'short' 
        });
        return existingDate === shiftDate;
      });

      if (!alreadyHasShift) {
        existingPharmacy.shifts.push({
          dutyUntil: pharmacy.closingTime,
          isOnDuty: pharmacy.isOnDuty,
        });
      }
    }

    // The main `isOnDuty` and `closingTime` should reflect the most relevant shift
    // (e.g., the one for the selected date, or the soonest one).
    // For now, we'll just inherit from the first record encountered.
    // This can be refined if needed.
  });

  return Array.from(pharmacyMap.values());
}

// Mock data for pharmacies and health centers in Buenos Aires area
export const mockPharmacies: Pharmacy[] = [
  {
    id: '1',
    name: 'Farmacia San Martín',
    address: 'Av. Corrientes 1234, CABA',
    lat: -34.6037,
    lng: -58.3816,
    phone: '+54 11 4567-8901',
    isOnDuty: true,
    type: 'pharmacy',
    verificationStatus: 'verified',
    activityLevel: 85,
    closingTime: '08:00 AM',
    distance: 0.3,
    veracityScore: 98,
    lastConfirmed: 'Hace 5 min',
    shifts: [],
  },
  {
    id: '9',
    name: 'Farmacia Comunitaria',
    address: 'Av. Callao 100, CABA',
    lat: -34.6090,
    lng: -58.3900,
    phone: '+54 11 4000-0000',
    isOnDuty: true,
    type: 'pharmacy',
    verificationStatus: 'community_verified',
    activityLevel: 40,
    closingTime: '08:00 AM',
    distance: 1.1,
    veracityScore: 95,
    lastConfirmed: 'Confirmado por la comunidad',
    shifts: [],
  },
  {
    id: '10',
    name: 'Farmacia Cerrada Test',
    address: 'Av. Pueyrredón 500, CABA',
    lat: -34.6000,
    lng: -58.4000,
    phone: '+54 11 4111-1111',
    isOnDuty: false,
    type: 'pharmacy',
    verificationStatus: 'verified',
    activityLevel: 10,
    distance: 2.5,
    veracityScore: 100,
    shifts: [],
  },
  {
    id: '3',
    name: 'Farmacia del Centro',
    address: 'Florida 567, CABA',
    lat: -34.6051,
    lng: -58.3772,
    phone: '+54 11 4321-0987',
    isOnDuty: true,
    type: 'pharmacy',
    verificationStatus: 'verified',
    activityLevel: 45,
    closingTime: '06:00 AM',
    distance: 0.8,
    veracityScore: 85,
    shifts: [],
  },
  {
    id: '4',
    name: 'Farmacia Comu (Validando)',
    address: 'Av. Rivadavia 1500, CABA',
    lat: -34.6089,
    lng: -58.3929,
    phone: '+54 11 4555-1234',
    isOnDuty: true,
    type: 'community',
    verificationStatus: 'pending',
    activityLevel: 10,
    distance: 1.2,
    veracityScore: 30,
    lastConfirmed: 'Pendiente',
    shifts: [],
  },
  {
    id: '5',
    name: 'Farmacia Norte',
    address: 'Av. Santa Fe 890, CABA',
    lat: -34.5956,
    lng: -58.3731,
    phone: '+54 11 4888-5678',
    isOnDuty: true,
    type: 'pharmacy',
    verificationStatus: 'verified',
    activityLevel: 65,
    closingTime: '10:00 AM',
    distance: 1.5,
    veracityScore: 92,
    shifts: [],
  },
  {
    id: '7',
    name: 'Farmacia La Estrella',
    address: 'Callao 789, CABA',
    lat: -34.6004,
    lng: -58.3925,
    phone: '+54 11 4111-7890',
    isOnDuty: true,
    type: 'pharmacy',
    verificationStatus: 'verified',
    activityLevel: 30,
    closingTime: '12:00 PM',
    distance: 2.8,
    veracityScore: 78,
    shifts: [],
  },
  {
    id: '8',
    name: 'Farmacia Palermo',
    address: 'Av. Las Heras 2890, CABA',
    lat: -34.5875,
    lng: -58.4035,
    phone: '+54 11 4666-8901',
    isOnDuty: true,
    type: 'pharmacy',
    verificationStatus: 'verified',
    activityLevel: 55,
    closingTime: '07:00 AM',
    distance: 4.2,
    veracityScore: 88,
    shifts: [],
  },
]
export function filterPharmacies(
  pharmacies: Pharmacy[],
  radiusKm: number
): Pharmacy[] {
  return pharmacies.filter((pharmacy) => {
    const isWithinRadius = (pharmacy.distance ?? 0) <= radiusKm;
    return isWithinRadius;
  });
}
export function sortPharmacies(pharmacies: Pharmacy[]): Pharmacy[] {
  return [...pharmacies].sort((a, b) => {
    // On-duty pharmacies first
    if (a.isOnDuty !== b.isOnDuty) return a.isOnDuty ? -1 : 1
    
    // Then by distance
    return (a.distance ?? 0) - (b.distance ?? 0)
  })
}
