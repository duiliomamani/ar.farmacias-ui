'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MapPin, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Pharmacy } from '@/lib/pharmacy-data'
import { PharmacyService } from '@/lib/api'
import { getDeviceId } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TurnstileWidget } from '@/components/turnstile-widget'

interface CommunityReportActionsProps {
  pharmacy: Pharmacy
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu navegador no permite obtener la ubicación.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  })
}

export function CommunityReportActions({ pharmacy }: CommunityReportActionsProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isOpenReport, setIsOpenReport] = useState(true)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()

  const handleTokenChange = useCallback((token: string) => setTurnstileToken(token), [])
  const startReport = (value: boolean) => {
    setIsOpenReport(value)
    setError('')
    setTurnstileToken('')
    setOpen(true)
  }

  const submit = async () => {
    if (!pharmacy.id) return
    if (siteKey && !turnstileToken) {
      setError('Completá la verificación de seguridad.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const position = await getCurrentPosition()
      await PharmacyService.submitCommunityReport(pharmacy.id, {
        isOpen: isOpenReport,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        deviceId: getDeviceId(),
        turnstileToken,
      })
      await queryClient.invalidateQueries({ queryKey: ['pharmacies'] })
      toast.success('Gracias por confirmar el estado de esta farmacia.')
      setOpen(false)
    } catch (caught) {
      const message = caught instanceof Error && caught.message
        ? caught.message
        : 'No se pudo registrar el reporte.'
      setError(message)
    } finally {
      setSubmitting(false)
      setTurnstileToken('')
      setCaptchaResetKey((value) => value + 1)
    }
  }

  return (
    <div className="space-y-1.5" onClick={(event) => event.stopPropagation()}>
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">¿Está atendiendo ahora?</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Button type="button" variant="outline" size="sm" className="border-green-600/30 text-green-700 hover:bg-green-500/10 dark:text-green-300" onClick={() => startReport(true)}>
          <CheckCircle2 /> Sí, atiende
        </Button>
        <Button type="button" variant="outline" size="sm" className="border-red-600/30 text-red-700 hover:bg-red-500/10 dark:text-red-300" onClick={() => startReport(false)}>
          <XCircle /> Está cerrada
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirmar atención voluntaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-bold uppercase">{pharmacy.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {pharmacy.address}</p>
            </div>
            <p className="text-sm">
              Vas a informar que la farmacia <strong>{isOpenReport ? 'está atendiendo' : 'está cerrada'}</strong> en este momento.
              Necesitamos tu ubicación para comprobar que estás cerca.
            </p>
            <TurnstileWidget action="pharmacy_report" resetKey={captchaResetKey} onTokenChange={handleTokenChange} />
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button className="w-full" disabled={submitting || Boolean(siteKey && !turnstileToken)} onClick={submit}>
              {submitting ? 'Verificando ubicación…' : 'Enviar confirmación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
