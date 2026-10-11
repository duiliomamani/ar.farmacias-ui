'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BffClient } from '@/lib/bff-client'

type Topic = 'problem' | 'suggestion' | 'comment'

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string
  remove?: (widgetId: string) => void
  reset?: (widgetId?: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

interface FeedbackProps {
  inline?: boolean
}

export function Feedback({ inline = false }: FeedbackProps) {
  const [topic, setTopic] = useState<Topic>('problem')
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [turnstileLoadError, setTurnstileLoadError] = useState(false)
  const [turnstileRetry, setTurnstileRetry] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileContainer = useRef<HTMLDivElement>(null)
  const turnstileWidget = useRef<string | null>(null)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()

  useEffect(() => {
    if (!open || !turnstileSiteKey) return
    let cancelled = false
    let frame: number | undefined
    let loadTimeout: ReturnType<typeof setTimeout> | undefined
    const render = () => {
      if (cancelled || !window.turnstile || !turnstileContainer.current || turnstileWidget.current) return
      const renderWidget = () => {
        if (cancelled || !window.turnstile || !turnstileContainer.current || turnstileWidget.current) return
        try {
          turnstileWidget.current = window.turnstile.render(turnstileContainer.current, {
            sitekey: turnstileSiteKey,
            action: 'feedback',
            callback: setTurnstileToken,
            'expired-callback': () => setTurnstileToken(''),
            'error-callback': () => {
              setTurnstileToken('')
              setTurnstileLoadError(true)
              setError('No se pudo validar el captcha. Revisá la clave y el dominio configurado en Cloudflare.')
            },
          })
          if (loadTimeout) clearTimeout(loadTimeout)
        } catch {
          setTurnstileLoadError(true)
          setError('No se pudo cargar la verificación de seguridad. Recargá la página e intentá nuevamente.')
        }
      }
      renderWidget()
    }
    const initialize = () => {
      if (cancelled) return
      if (!turnstileContainer.current) {
        frame = window.requestAnimationFrame(initialize)
        return
      }

      const src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      const existing = document.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]')
      if (turnstileRetry > 0 && existing && !window.turnstile) {
        existing.remove()
      }
      if (window.turnstile && typeof window.turnstile.render === 'function') render()
      else if (existing && document.head.contains(existing)) {
        existing.addEventListener('load', () => {
          existing.dataset.farmayaTurnstileLoaded = 'true'
          render()
        }, { once: true })
      } else {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.defer = true
        script.dataset.farmayaTurnstile = 'true'
        script.addEventListener('load', () => {
          script.dataset.farmayaTurnstileLoaded = 'true'
          render()
        }, { once: true })
        script.addEventListener('error', () => {
          setTurnstileLoadError(true)
          setError('No se pudo cargar el captcha de Cloudflare.')
        })
        document.head.appendChild(script)
      }
    }

    frame = window.requestAnimationFrame(initialize)
    loadTimeout = setTimeout(() => {
      if (!turnstileWidget.current && !cancelled) {
        setTurnstileLoadError(true)
        setError('Cloudflare no pudo cargar en este navegador. Desactivá el bloqueador de anuncios o privacidad para localhost:3000 y permití challenges.cloudflare.com.')
      }
    }, 7000)
    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
      if (loadTimeout) clearTimeout(loadTimeout)
      if (turnstileWidget.current && window.turnstile?.remove) window.turnstile.remove(turnstileWidget.current)
      turnstileWidget.current = null
      setTurnstileToken('')
    }
  }, [open, turnstileSiteKey, turnstileRetry])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (message.trim().length < 5) {
      setError('Contanos un poco más para que podamos ayudarte.')
      return
    }
    if (turnstileSiteKey && !turnstileToken) {
      setError('Completá la verificación de seguridad antes de enviar.')
      return
    }
    setSending(true)
    setError('')
    try {
      await BffClient.post('/api/feedback', { topic, message, page: window.location.pathname, website: '', turnstileToken })
      setSent(true)
      setMessage('')
    } catch {
      setError('No se pudo enviar ahora. Probá de nuevo en unos segundos.')
    } finally {
      if (turnstileWidget.current && window.turnstile?.reset) {
        window.turnstile.reset(turnstileWidget.current)
      }
      setTurnstileToken('')
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value)
      if (value) {
        setSent(false)
        setError('')
        setTurnstileLoadError(false)
        setTurnstileToken('')
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          aria-label="Enviar Feedback"
          className={inline ? 'h-8 gap-1.5 px-2.5 sm:px-3 text-xs' : 'fixed bottom-4 left-4 z-[600] gap-2 rounded-full bg-card/95 shadow-lg'}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">✓</div>
            <DialogTitle>¡Gracias por escribirnos!</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">Leemos cada mensaje para mejorar FarmaYa AR.</p>
            <Button className="mt-5" onClick={() => setOpen(false)}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Ayudanos a mejorar</DialogTitle>
            </DialogHeader>
            <fieldset className="space-y-2">
              <Label>¿Qué querés contarnos?</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['problem', 'Problema'],
                  ['suggestion', 'Sugerencia'],
                  ['comment', 'Comentario'],
                ] as const).map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted">
                    <input
                      type="radio"
                      name="feedback-topic"
                      value={value}
                      checked={topic === value}
                      onChange={() => setTopic(value)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="feedback-message">Tu mensaje *</Label>
              <Textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Contanos qué podemos mejorar..." maxLength={2000} rows={5} autoFocus required />
            </div>
            {turnstileSiteKey && (
              <div
                ref={turnstileContainer}
                className="min-h-[65px]"
                aria-label="Verificación de seguridad"
              />
            )}
            {error && (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-destructive">{error}</p>
                {turnstileLoadError && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError('')
                      setTurnstileLoadError(false)
                      setTurnstileToken('')
                      setTurnstileRetry((value) => value + 1)
                    }}
                  >
                    Reintentar verificación
                  </Button>
                )}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={sending}>{sending ? 'Enviando…' : 'Enviar feedback'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
