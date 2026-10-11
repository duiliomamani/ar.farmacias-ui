'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Download, Share } from 'lucide-react'
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
  const [showIOSHelp, setShowIOSHelp] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined)
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') toast.success('FarmaJUY se instaló correctamente.')
      setInstallPrompt(null)
      return
    }
    setShowIOSHelp(true)
  }

  const toggleNotifications = async () => {
    const enabled = await onToggleNotifications()
    if (enabled) toast.success('Te avisaremos cuando una favorita aparezca de turno.')
    else if (Notification.permission === 'denied') toast.error('Los avisos están bloqueados en la configuración del navegador.')
    else toast.success('Avisos de favoritas desactivados.')
  }

  const canInstall = !isStandalone && (Boolean(installPrompt) || isIOS)

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

      <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar FarmaJUY</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>En Safari, tocá el botón <strong className="text-foreground">Compartir</strong> y luego elegí <strong className="text-foreground">Agregar a inicio</strong>.</p>
            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-3 text-foreground">
              <Share className="h-5 w-5 text-primary" /> Compartir → Agregar a inicio
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

