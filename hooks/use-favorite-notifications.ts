'use client'

import { useEffect, useState } from 'react'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { isPharmacyAvailable } from '@/lib/pharmacy-ranking'

const ENABLED_KEY = 'farmajuy_notifications_enabled'
const NOTIFIED_KEY = 'farmajuy_notified_shifts'

function readNotified(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')
    return Array.isArray(stored) ? stored.filter((key): key is string => typeof key === 'string') : []
  } catch {
    return []
  }
}

function showFavoriteNotification(title: string, options: NotificationOptions) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        try {
          new Notification(title, options)
        } catch {
          // Some browsers only allow notifications through a service worker.
        }
      })
    return
  }

  try {
    new Notification(title, options)
  } catch {
    // Unsupported notification presentation; permission state remains intact.
  }
}

export function useFavoriteNotifications(
  pharmacies: Pharmacy[],
  favoriteIds: string[],
  selectedDate: string,
) {
  const [enabled, setEnabled] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const nextSupported = 'Notification' in window
    setSupported(nextSupported)
    setEnabled(nextSupported && Notification.permission === 'granted' && localStorage.getItem(ENABLED_KEY) === 'true')
  }, [])

  useEffect(() => {
    if (!enabled || !supported || Notification.permission !== 'granted' || favoriteIds.length === 0) return

    const notified = new Set(readNotified())
    const matches = pharmacies.filter(
      (pharmacy) => favoriteIds.includes(pharmacy.id) && isPharmacyAvailable(pharmacy),
    )

    matches.forEach((pharmacy) => {
      const shift = pharmacy.dutyFrom || pharmacy.dutyUntil || selectedDate
      const notificationKey = `${pharmacy.id}:${shift}`
      if (notified.has(notificationKey)) return

      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())
      const isFutureDuty = selectedDate > today
      const formattedDate = new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Argentina/Buenos_Aires',
      }).format(new Date(`${selectedDate}T12:00:00-03:00`))
      const options: NotificationOptions = {
        body: isFutureDuty
          ? `${pharmacy.name} aparece en los turnos del ${formattedDate}.`
          : `${pharmacy.name} aparece disponible${pharmacy.distance !== undefined ? ` a ${pharmacy.distance.toFixed(1)} km` : ''}.`,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: `favorite-${pharmacy.id}`,
        data: { url: '/' },
      }

      showFavoriteNotification(
        isFutureDuty ? 'Próximo turno de una farmacia favorita' : 'Una farmacia favorita está de turno',
        options,
      )

      notified.add(notificationKey)
    })

    const recent = Array.from(notified).slice(-100)
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(recent))
  }, [enabled, favoriteIds, pharmacies, selectedDate, supported])

  async function toggleNotifications() {
    if (!supported) return false
    if (enabled) {
      localStorage.setItem(ENABLED_KEY, 'false')
      setEnabled(false)
      return false
    }

    const permission = await Notification.requestPermission()
    const nextEnabled = permission === 'granted'
    localStorage.setItem(ENABLED_KEY, String(nextEnabled))
    setEnabled(nextEnabled)
    return nextEnabled
  }

  return { enabled, supported, toggleNotifications }
}

