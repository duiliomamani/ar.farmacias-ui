'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string
    action: string
    callback: (token: string) => void
    'expired-callback': () => void
    'error-callback': () => void
  }) => string
  remove?: (widgetId: string) => void
}

interface TurnstileWidgetProps {
  action: string
  resetKey: number
  onTokenChange: (token: string) => void
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export function TurnstileWidget({ action, resetKey, onTokenChange }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()

  useEffect(() => {
    if (!siteKey) {
      setError('La verificación de seguridad no está configurada.')
      return
    }

    let cancelled = false
    let frame: number | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined

    const getApi = () => (window as Window & { turnstile?: TurnstileApi }).turnstile
    const render = () => {
      const api = getApi()
      if (cancelled || !api || !container.current || widgetId.current) return
      try {
        widgetId.current = api.render(container.current, {
          sitekey: siteKey,
          action,
          callback: (token) => {
            setError('')
            onTokenChange(token)
          },
          'expired-callback': () => onTokenChange(''),
          'error-callback': () => {
            onTokenChange('')
            setError('No se pudo validar el captcha. Intentá nuevamente.')
          },
        })
        if (timeout) clearTimeout(timeout)
      } catch {
        setError('No se pudo cargar la verificación de seguridad.')
      }
    }

    const initialize = () => {
      if (cancelled) return
      if (!container.current) {
        frame = window.requestAnimationFrame(initialize)
        return
      }
      const existing = document.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]')
      if (getApi()) render()
      else if (existing) existing.addEventListener('load', render, { once: true })
      else {
        const script = document.createElement('script')
        script.src = SCRIPT_SRC
        script.async = true
        script.defer = true
        script.addEventListener('load', render, { once: true })
        script.addEventListener('error', () => setError('No se pudo cargar el captcha de Cloudflare.'), { once: true })
        document.head.appendChild(script)
      }
    }

    setError('')
    onTokenChange('')
    frame = window.requestAnimationFrame(initialize)
    timeout = setTimeout(() => {
      if (!widgetId.current && !cancelled) setError('La verificación tardó demasiado en cargar.')
    }, 7000)

    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
      if (timeout) clearTimeout(timeout)
      const api = getApi()
      if (widgetId.current && api?.remove) api.remove(widgetId.current)
      widgetId.current = null
      onTokenChange('')
    }
  }, [action, onTokenChange, resetKey, retry, siteKey])

  return (
    <div className="space-y-2">
      <div ref={container} className="min-h-[65px]" aria-label="Verificación de seguridad" />
      {error && (
        <div className="space-y-2" role="alert">
          <p className="text-xs text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
            Reintentar verificación
          </Button>
        </div>
      )}
    </div>
  )
}
