"use client"

import * as React from "react"
import { Camera, CheckCircle2, Loader2, MapPin, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

import type { Pharmacy } from "@/lib/pharmacy-data"
import { PharmacyService, AuthService } from "@/lib/api"

import { useAuth } from "@/components/auth/auth-context"

type LocationState = {
  lat: number
  lng: number
} | null

type LocationStatus = "idle" | "loading" | "success" | "error"

interface ReportPharmacyModalProps {
  pharmacy: Pharmacy
  trigger?: React.ReactNode
}

export function ReportPharmacyModal({ pharmacy, trigger }: ReportPharmacyModalProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()
  const { isAuthenticated } = useAuth()

  // 1. Silent Fingerprinting
  const [deviceId, setDeviceId] = React.useState<string>("")
  
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("farmaya_device_id")
      if (!id) {
        id = window.crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem("farmaya_device_id", id)
      }
      setDeviceId(id)
    }
  }, [])

  // 2. Strict Geolocation
  const [location, setLocation] = React.useState<LocationState>(null)
  const [locationStatus, setLocationStatus] = React.useState<LocationStatus>("idle")

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La geolocalización no es compatible con tu navegador.")
      setLocationStatus("error")
      return
    }

    setLocationStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationStatus("success")
        toast.success("Ubicación obtenida correctamente")
      },
      (error) => {
        console.error("Geo error:", error)
        let message = "No se pudo obtener la ubicación"
        if (error.code === 1) message = "Permiso de ubicación denegado"
        else if (error.code === 3) message = "Tiempo de espera agotado"
        
        toast.error(message)
        setLocationStatus("error")
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  // 4. Form Submission
  const [isOnDuty, setIsOnDuty] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location) {
      toast.error("Primero debes verificar tu ubicación")
      return
    }

    setIsSubmitting(true)
    
    try {
      await PharmacyService.reportStatus({
        pharmacyId: pharmacy.id,
        isOnDuty,
        lat: location.lat,
        lng: location.lng,
        deviceId,
      })

      toast.success("¡Reporte enviado! Validando datos...", {
        description: "Tu aporte ayuda a la comunidad. El estado se actualizará pronto.",
      })
      setOpen(false)
    } catch (error) {
      toast.error("No se pudo enviar el reporte", {
        description: "Inténtalo de nuevo más tarde."
      })
    } finally {
      setIsSubmitting(false)
      setLocation(null)
      setLocationStatus("idle")
    }
  }

  const ModalContent = (
    <div className="grid gap-6 py-4">
      <div className="grid gap-2 px-4 md:px-0 text-center">
        <h4 className="font-bold text-lg">{pharmacy.name}</h4>
        <p className="text-sm text-muted-foreground">{pharmacy.address}</p>
      </div>

      <div className="grid gap-3 px-4 md:px-0">
        <Label>Estado de Turno</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isOnDuty ? "default" : "outline"}
            className={cn("flex-1 h-12 gap-2", isOnDuty && "bg-green-600 hover:bg-green-700")}
            onClick={() => setIsOnDuty(true)}
          >
            <CheckCircle2 className="h-5 w-5" />
            Está de Turno
          </Button>
          <Button
            type="button"
            variant={!isOnDuty ? "destructive" : "outline"}
            className="flex-1 h-12 gap-2"
            onClick={() => setIsOnDuty(false)}
          >
            <X className="h-5 w-5" />
            Cerrada
          </Button>
        </div>
      </div>

      <div className="grid gap-3 px-4 md:px-0">
        <Label>Validación de Ubicación</Label>
        <div 
          className={cn(
            "flex items-center justify-between p-4 rounded-lg border bg-muted/30 transition-colors",
            locationStatus === "success" && "border-green-500/50 bg-green-50/10",
            locationStatus === "error" && "border-red-500/50 bg-red-50/10"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              locationStatus === "success" ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
            )}>
              {locationStatus === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : locationStatus === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium leading-none">
                {locationStatus === "success" ? "Ubicación verificada" : "Ubicación requerida"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {locationStatus === "success" 
                  ? `${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}`
                  : "Debes estar cerca de la farmacia (100m)"}
              </p>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleGetLocation}
            disabled={locationStatus === "loading" || locationStatus === "success"}
          >
            {locationStatus === "success" ? "Actualizar" : "Obtener GPS"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center italic">
          El sistema valida que estés a menos de 100 metros para aceptar el reporte.
        </p>
      </div>
    </div>
  )

  const Footer = (
    <Button 
      type="button" 
      className="w-full sm:w-auto font-bold" 
      disabled={!location || isSubmitting}
      onClick={handleSubmit}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enviando...
        </>
      ) : (
        "Confirmar Estado"
      )}
    </Button>
  )

  if (isMobile) {
    return (
      <Drawer 
        open={open} 
        onOpenChange={(v) => {
          if (v && !isAuthenticated) {
            toast.error("Debes iniciar sesión", {
              description: "Identifícate para reportar y sumar puntos de confianza.",
              action: {
                label: "Ingresar",
                onClick: () => window.location.href = AuthService.getGoogleLoginUrl()
              }
            })
            return
          }
          setOpen(v)
        }}
      >
        <DrawerTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/5">
              <Camera className="h-4 w-4" />
              Reportar Estado
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Reportar Estado</DrawerTitle>
            <DrawerDescription>
              Informa si esta farmacia está atendiendo de turno.
            </DrawerDescription>
          </DrawerHeader>
          {ModalContent}
          <DrawerFooter className="pt-2">
            {Footer}
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(v) => {
        if (v && !isAuthenticated) {
          toast.error("Debes iniciar sesión", {
            description: "Identifícate para reportar y sumar puntos de confianza.",
            action: {
              label: "Ingresar",
              onClick: () => window.location.href = AuthService.getGoogleLoginUrl()
            }
          })
          return
        }
        setOpen(v)
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
            <Camera className="h-4 w-4" />
            Reportar Estado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reportar Estado</DialogTitle>
          <DialogDescription>
            Ayuda a la comunidad informando si esta farmacia está abierta.
          </DialogDescription>
        </DialogHeader>
        {ModalContent}
        <DialogFooter>
          {Footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

