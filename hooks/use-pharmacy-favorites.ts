'use client'

import { useCallback, useEffect, useState } from 'react'

const FAVORITES_KEY = 'farmajuy_favorite_pharmacies'

function readFavorites(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function usePharmacyFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  useEffect(() => {
    setFavoriteIds(readFavorites())
  }, [])

  const toggleFavorite = useCallback((pharmacyId: string) => {
    setFavoriteIds((current) => {
      const next = current.includes(pharmacyId)
        ? current.filter((id) => id !== pharmacyId)
        : [...current, pharmacyId]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { favoriteIds, toggleFavorite }
}

