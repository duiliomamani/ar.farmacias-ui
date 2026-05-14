'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/api'

interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  role: string
  trustScore: number
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await AuthService.getProfile()
      setUser(prev => prev ? { 
        ...prev, 
        displayName: profile.displayName,
        role: profile.role,
        trustScore: profile.trustScore 
      } : {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        trustScore: profile.trustScore
      })
    } catch (error) {
      console.error('Failed to fetch latest profile:', error)
    }
  }, [])

  const decodeAndSetUser = useCallback((token: string) => {
    try {
      const decoded: any = jwtDecode(token)
      setUser({
        id: decoded.sub,
        email: decoded.email,
        displayName: decoded.displayName,
        avatarUrl: decoded.avatarUrl,
        role: decoded.role,
        trustScore: decoded.trustScore || 0,
      })
      // Actualizar con datos frescos del servidor (incluyendo el trustScore real)
      refreshProfile()
      return true
    } catch (error) {
      console.error('Failed to decode token:', error)
      return false
    }
  }, [refreshProfile])

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const success = decodeAndSetUser(token)
      if (!success) {
        localStorage.removeItem('auth_token')
      }
    }
    setIsLoading(false)
  }, [decodeAndSetUser])

  const login = useCallback((token: string) => {
    localStorage.setItem('auth_token', token)
    decodeAndSetUser(token)
  }, [decodeAndSetUser])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setUser(null)
    router.push('/')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
