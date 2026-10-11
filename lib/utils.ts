import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates or retrieves a unique device ID from localStorage.
 * Used for basic unauthenticated reputation tracking.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server-side'

  let deviceId = localStorage.getItem('farmaya_device_id')

  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('farmaya_device_id', deviceId)
  }

  return deviceId
}

/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns the effective date for pharmacy duties.
 * In Argentina, duties typically run from 8:00 AM to 8:00 AM the next day.
 * If the current local time is before 8:00 AM, we are still in the previous day's duty cycle.
 */
export function getEffectiveDutyDate(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const effectiveDate = new Date(Number(values.year), Number(values.month) - 1, Number(values.day), 12)

  // Duties run from 08:00 to 08:00 in Argentina.
  if (Number(values.hour) < 8) effectiveDate.setDate(effectiveDate.getDate() - 1)

  return effectiveDate
}
