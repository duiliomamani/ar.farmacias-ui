'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, Download, EllipsisVertical, Share } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PwaActionsProps {
  notificationsEnabled: boolean
  notificationsSupported: boolean
  onToggleNotifications: () => Promise<boolean>
}

export function PwaActions({
  notificationsEnabled,
  notificationsSupported,
  onToggleNotifications,
}: PwaActionsProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    setIsMobileDevice(
      /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    )

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined)
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setShowInstallHelp(false)
      setIsStandalone(true)
      toast.success('FarmaJUY se instaló correctamente.')
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const install = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt()
        await installPrompt.userChoice
        setInstallPrompt(null)
        return
      } catch {
        setInstallPrompt(null)
      }
    }

    setShowInstallHelp(true)
  }

  const toggleNotifications = async () => {
    const enabled = await onToggleNotifications()
    if (enabled) toast.success('Te avisaremos cuando una favorita aparezca de turno.')
    else if (Notification.permission === 'denied') toast.error('Los avisos están bloqueados en la configuración del navegador.')
    else toast.success('Avisos de favoritas desactivados.')
  }

  const canInstall = !isStandalone && (Boolean(installPrompt) || isMobileDevice)

  return (
    <>
      <div className="flex items-center gap-1">
        {canInstall && (
          <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-xl" onClick={install} aria-label="Instalar FarmaJUY" title="Instalar FarmaJUY">
            <Download className="h-4 w-4" />
          </Button>
        )}
        {notificationsSupported && (
          <Button
            type="button"
            size="icon"
            variant={notificationsEnabled ? 'default' : 'outline'}
            className="h-8 w-8 rounded-xl"
            onClick={toggleNotifications}
            aria-label={notificationsEnabled ? 'Desactivar avisos de favoritas' : 'Activar avisos de favoritas'}
            aria-pressed={notificationsEnabled}
            title={notificationsEnabled ? 'Avisos activados' : 'Activar avisos de favoritas'}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Dialog open={showInstallHelp} onOpenChange={setShowInstallHelp}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar FarmaJUY</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Desde el menú de tu navegador, seguí estos pasos:</p>
            <ol className="space-y-2">
              <li className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 text-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">1</span>
                <span className="flex items-center gap-2">
                  Tocá <Share className="h-4 w-4 text-primary" aria-hidden="true" /> <strong>Compartir</strong> o <EllipsisVertical className="h-4 w-4 text-primary" aria-hidden="true" /> <strong>Menú</strong>
                </span>
              </li>
              <li className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 text-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">2</span>
                <span>Elegí <strong>Agregar a inicio</strong> o <strong>Instalar aplicación</strong></span>
              </li>
              <li className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 text-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">3</span>
                <span className="flex items-center gap-2">Confirmá con <strong>Agregar</strong> o <strong>Instalar</strong> <Check className="h-4 w-4 text-primary" aria-hidden="true" /></span>
              </li>
            </ol>
            <p className="text-xs">Si no aparece la opción, abrí FarmaJUY en una pestaña normal (no privada) y volvé a intentarlo.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

