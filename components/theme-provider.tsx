'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  attribute?: 'class'
}

const STORAGE_KEY = 'theme'
const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function preferredTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  // Keep the server and the browser's first render identical. Browser-only
  // preferences are loaded after hydration.
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>('light')
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  const applyTheme = React.useCallback((nextTheme: ResolvedTheme) => {
    const root = document.documentElement
    let transitionStyle: HTMLStyleElement | null = null

    if (disableTransitionOnChange) {
      transitionStyle = document.createElement('style')
      transitionStyle.textContent = '*,*::before,*::after{transition:none!important}'
      document.head.appendChild(transitionStyle)
    }

    root.classList.toggle('dark', nextTheme === 'dark')
    root.style.colorScheme = nextTheme

    if (transitionStyle) {
      window.getComputedStyle(document.body)
      window.setTimeout(() => transitionStyle?.remove(), 0)
    }
  }, [disableTransitionOnChange])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    const normalizedTheme = !enableSystem && nextTheme === 'system' ? 'light' : nextTheme
    localStorage.setItem(STORAGE_KEY, normalizedTheme)
    setThemeState(normalizedTheme)
  }, [enableSystem])

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const storedTheme = localStorage.getItem(STORAGE_KEY)
    const initialTheme: Theme = storedTheme === 'light' || storedTheme === 'dark' || (enableSystem && storedTheme === 'system')
      ? storedTheme
      : defaultTheme

    setSystemTheme(media.matches ? 'dark' : 'light')
    setThemeState(initialTheme)

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const nextTheme = event.newValue
      if (nextTheme === 'light' || nextTheme === 'dark' || (enableSystem && nextTheme === 'system')) {
        setThemeState(nextTheme)
      }
    }

    media.addEventListener('change', handleSystemThemeChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      media.removeEventListener('change', handleSystemThemeChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [defaultTheme, enableSystem])

  React.useEffect(() => {
    applyTheme(theme === 'system' ? preferredTheme() : theme)
  }, [applyTheme, systemTheme, theme])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider')
  return context
}
