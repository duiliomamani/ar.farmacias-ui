'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, Download } from 'lucide-react'
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

type InstallEnvironment =
  | 'android-chrome'
  | 'android-edge'
  | 'android-firefox'
  | 'android-opera'
  | 'android-samsung'
  | 'android-vivaldi'
  | 'android-webview'
  | 'android-other'
  | 'ios-chrome'
  | 'ios-safari'
  | 'ios-other'
  | 'mac-safari'
  | 'desktop-chrome'
  | 'desktop-edge'
  | 'mac-other'
  | 'windows-other'
  | 'desktop-other'

interface InstallGuide {
  title: string
  intro: string
  steps: string[]
  note?: string
}

function detectInstallEnvironment(): InstallEnvironment {
  const userAgent = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isIOS) {
    if (/CriOS/i.test(userAgent)) return 'ios-chrome'
    if (!/FxiOS|EdgiOS|OPiOS/i.test(userAgent)) return 'ios-safari'
    return 'ios-other'
  }
  if (/Android/i.test(userAgent)) {
    if (/; wv\)|Version\/4\.0.*Chrome|FBAN|FBAV|Instagram/i.test(userAgent)) return 'android-webview'
    if (/SamsungBrowser/i.test(userAgent)) return 'android-samsung'
    if (/EdgA|Edg\//i.test(userAgent)) return 'android-edge'
    if (/Firefox|Fennec/i.test(userAgent)) return 'android-firefox'
    if (/OPR|Opera/i.test(userAgent)) return 'android-opera'
    if (/Vivaldi/i.test(userAgent)) return 'android-vivaldi'
    if (/Chrome|Chromium/i.test(userAgent)) return 'android-chrome'
    return 'android-other'
  }
  if (/Edg\//i.test(userAgent)) return 'desktop-edge'
  if (/Chrome|Chromium/i.test(userAgent) && !/OPR|Opera/i.test(userAgent)) return 'desktop-chrome'

  const isMac = /Macintosh|Mac OS X/i.test(userAgent)
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(userAgent)
  if (isMac && isSafari) return 'mac-safari'
  if (isMac) return 'mac-other'
  if (/Windows/i.test(userAgent)) return 'windows-other'
  return 'desktop-other'
}

function getInstallGuide(environment: InstallEnvironment): InstallGuide {
  switch (environment) {
    case 'ios-chrome':
      return {
        title: 'Instalar con Google Chrome',
        intro: 'En Chrome para iPhone o iPad:',
        steps: ['Tocá Compartir, a la derecha de la barra de direcciones.', 'Elegí Agregar a pantalla principal.', 'Confirmá tocando Agregar.'],
        note: 'Si no aparece la opción, usá una pestaña normal y actualizá Chrome.',
      }
    case 'ios-safari':
      return {
        title: 'Instalar con Safari',
        intro: 'En Safari para iPhone o iPad:',
        steps: ['Tocá Compartir.', 'Elegí Agregar a inicio.', 'Confirmá tocando Agregar.'],
        note: 'Si no aparece la opción, usá una pestaña normal y actualizá Safari.',
      }
    case 'ios-other':
      return {
        title: 'Instalar en iPhone o iPad',
        intro: 'Desde el navegador donde abriste CondorJUY:',
        steps: ['Abrí el menú del navegador y tocá Compartir.', 'Elegí Agregar a pantalla principal.', 'Confirmá tocando Agregar.'],
        note: 'La ubicación de Compartir puede variar según el navegador.',
      }
    case 'android-chrome':
      return {
        title: 'Instalar con Google Chrome',
        intro: 'En Chrome para Android:',
        steps: ['Tocá el menú de tres puntos (⋮).', 'Entrá en Instalar y crear acceso directo.', 'Elegí Instalar y seguí las indicaciones.'],
        note: 'La opción puede llamarse Agregar a pantalla principal en versiones anteriores.',
      }
    case 'android-edge':
      return {
        title: 'Instalar con Microsoft Edge',
        intro: 'En Edge para Android:',
        steps: ['Abrí el menú (⋯).', 'Elegí Agregar al teléfono.', 'Tocá Instalar o Crear acceso directo y confirmá.'],
        note: 'El nombre de la última opción depende de la versión de Edge.',
      }
    case 'android-firefox':
      return {
        title: 'Instalar con Firefox',
        intro: 'En Firefox para Android:',
        steps: ['Tocá el menú de tres puntos (⋮).', 'Elegí Instalar.', 'Tocá Agregar automáticamente o ubicá el ícono en la pantalla.'],
        note: 'Si aparece Agregar a pantalla principal, esa opción crea un acceso directo.',
      }
    case 'android-samsung':
      return {
        title: 'Instalar con Samsung Internet',
        intro: 'En Samsung Internet:',
        steps: ['Tocá el menú de tres líneas (☰).', 'Elegí Añadir página a.', 'Seleccioná Pantalla de inicio y confirmá.'],
      }
    case 'android-opera':
      return {
        title: 'Instalar con Opera',
        intro: 'En Opera para Android:',
        steps: ['Abrí el menú junto a la barra de direcciones.', 'Elegí Añadir a.', 'Seleccioná Pantalla de inicio y confirmá.'],
      }
    case 'android-vivaldi':
      return {
        title: 'Instalar con Vivaldi',
        intro: 'En Vivaldi para Android:',
        steps: ['Abrí el menú de Vivaldi.', 'Elegí Añadir página a y luego Pantalla de inicio.', 'Tocá Instalar y confirmá.'],
      }
    case 'android-webview':
      return {
        title: 'Abrir en un navegador para instalar',
        intro: 'Abriste CondorJUY dentro de otra aplicación:',
        steps: ['Abrí el menú de esta pantalla.', 'Elegí Abrir en Chrome, Abrir en el navegador o una opción similar.', 'En el navegador, volvé a tocar Instalar CondorJUY.'],
        note: 'Los navegadores internos de algunas aplicaciones no permiten instalar aplicaciones web.',
      }
    case 'android-other':
      return {
        title: 'Instalar en Android',
        intro: 'Desde el navegador donde abriste CondorJUY:',
        steps: ['Abrí el menú del navegador.', 'Buscá Instalar, Añadir a o Agregar a pantalla principal.', 'Elegí la opción disponible y confirmá.'],
        note: 'Algunos navegadores crean un acceso directo en lugar de instalar la aplicación completa.',
      }
    case 'mac-safari':
      return {
        title: 'Instalar en macOS con Safari',
        intro: 'En Safari para macOS Sonoma 14 o posterior:',
        steps: ['Hacé clic en Compartir o abrí el menú Archivo.', 'Elegí Agregar al Dock.', 'Confirmá haciendo clic en Agregar.'],
      }
    case 'desktop-edge':
      return {
        title: 'Instalar con Microsoft Edge',
        intro: 'En Windows o macOS:',
        steps: ['Abrí el menú de tres puntos (⋯).', 'Entrá en Aplicaciones.', 'Elegí Instalar este sitio como una aplicación y confirmá.'],
      }
    case 'desktop-chrome':
      return {
        title: 'Instalar con Google Chrome',
        intro: 'En Windows, macOS o Linux:',
        steps: ['Abrí el menú de tres puntos (⋮).', 'Entrá en Enviar, guardar y compartir.', 'Elegí Instalar página como aplicación y confirmá.'],
      }
    case 'mac-other':
      return {
        title: 'Instalar en macOS',
        intro: 'Abrí CondorJUY con Safari o Google Chrome para instalarla:',
        steps: ['En Safari: Compartir o Archivo → Agregar al Dock.', 'En Chrome: menú ⋮ → Enviar, guardar y compartir.', 'Elegí Instalar página como aplicación y confirmá.'],
        note: 'Safari requiere macOS Sonoma 14 o posterior.',
      }
    case 'windows-other':
      return {
        title: 'Instalar en Windows',
        intro: 'Abrí CondorJUY con Microsoft Edge o Google Chrome:',
        steps: ['Abrí el menú de tres puntos del navegador.', 'En Edge elegí Aplicaciones; en Chrome, Enviar, guardar y compartir.', 'Elegí Instalar este sitio/página como aplicación y confirmá.'],
        note: 'Algunos navegadores de escritorio no permiten instalar aplicaciones PWA.',
      }
    default:
      return {
        title: 'Instalar en la computadora',
        intro: 'Abrí CondorJUY con Google Chrome o Microsoft Edge:',
        steps: ['Abrí el menú de tres puntos del navegador.', 'Buscá la sección Aplicaciones o Enviar, guardar y compartir.', 'Elegí Instalar este sitio/página como aplicación y confirmá.'],
        note: 'Algunos navegadores de escritorio no permiten instalar aplicaciones PWA.',
      }
  }
}

export function PwaActions({
  notificationsEnabled,
  notificationsSupported,
  onToggleNotifications,
}: PwaActionsProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [installEnvironment, setInstallEnvironment] = useState<InstallEnvironment>('desktop-other')
  const [isClientReady, setIsClientReady] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    setInstallEnvironment(detectInstallEnvironment())
    setIsClientReady(true)

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
      toast.success('CondorJUY se instaló correctamente.')
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

  const canInstall = isClientReady && !isStandalone
  const installGuide = getInstallGuide(installEnvironment)

  return (
    <>
      <div className="flex items-center gap-1">
        {canInstall && (
          <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-xl" onClick={install} aria-label="Instalar CondorJUY" title="Instalar CondorJUY">
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
            <DialogTitle>{installGuide.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{installGuide.intro}</p>
            <ol className="space-y-2">
              {installGuide.steps.map((step, index) => (
                <li key={step} className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 text-foreground">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{index + 1}</span>
                  <span className="flex-1">{step}</span>
                  {index === installGuide.steps.length - 1 && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            {installGuide.note && <p className="text-xs">{installGuide.note}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

