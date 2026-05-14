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

