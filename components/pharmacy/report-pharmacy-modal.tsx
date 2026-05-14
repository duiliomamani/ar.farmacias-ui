"use client"

import * as React from "react"
import { Camera, CheckCircle2, Loader2, MapPin, X, Flag } from "lucide-react"
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
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "No se pudo enviar el reporte";
      toast.error("Error al reportar", {
        description: errorMessage
      })
    } finally {
      setIsSubmitting(false)
      setLocation(null)
      setLocationStatus("idle")
    }
  }

  const ModalContent = (
    <div className="grid gap-4 py-2">
      <div className="grid gap-0.5 px-4 md:px-0 text-center">
        <h4 className="font-black text-base uppercase tracking-tight">{pharmacy.name}</h4>
        <p className="text-[11px] text-muted-foreground font-medium">{pharmacy.address}</p>
      </div>

      <div className="grid gap-2 px-4 md:px-0">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Estado Actual</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isOnDuty ? "default" : "outline"}
            className={cn("flex-1 h-10 gap-2 text-xs font-bold", isOnDuty && "bg-green-600 hover:bg-green-700 shadow-sm")}
            onClick={() => setIsOnDuty(true)}
          >
            <CheckCircle2 className="h-4 w-4" />
            Está de Turno
          </Button>
          <Button
            type="button"
            variant={!isOnDuty ? "destructive" : "outline"}
            className="flex-1 h-10 gap-2 text-xs font-bold shadow-sm"
            onClick={() => setIsOnDuty(false)}
          >
            <X className="h-4 w-4" />
            Cerrada
          </Button>
        </div>
      </div>

      <div className="grid gap-2 px-4 md:px-0">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Validación de Ubicación</Label>
        <div 
          className={cn(
            "flex items-center justify-between p-3 rounded-xl border bg-muted/30 transition-all shadow-inner",
            locationStatus === "success" && "border-green-500/30 bg-green-50/20",
            locationStatus === "error" && "border-red-500/30 bg-red-50/20"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full shadow-sm",
              locationStatus === "success" ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
            )}>
              {locationStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : locationStatus === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold leading-none">
                {locationStatus === "success" ? "GPS Verificado" : "GPS Requerido"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                {locationStatus === "success" 
                  ? `${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}`
                  : "Máximo 100 metros"}
              </p>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            className="h-8 text-[10px] font-black uppercase px-3 border-2"
            onClick={handleGetLocation}
            disabled={locationStatus === "loading" || locationStatus === "success"}
          >
            {locationStatus === "success" ? "Listo" : "Obtener"}
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/60 text-center font-bold uppercase tracking-tighter italic">
          Validación obligatoria por proximidad física
        </p>
      </div>
    </div>
  )

  const Footer = (
    <Button 
      type="button" 
      className="w-full sm:w-full font-black text-xs uppercase tracking-widest h-11 shadow-lg" 
      disabled={!location || isSubmitting}
      onClick={handleSubmit}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ENVIANDO...
        </>
      ) : (
        "Confirmar Reporte"
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
              <Flag className="h-4 w-4" />
              Reportar Estado
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left py-4">
            <DrawerTitle className="text-xl font-black uppercase tracking-tighter">Reportar Estado</DrawerTitle>
            <DrawerDescription className="text-xs font-medium">
              Ayuda a la comunidad informando si esta farmacia está abierta.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {ModalContent}
            <div className="mt-4">
              {Footer}
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cancelar</Button>
            </DrawerClose>
          </div>
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
            <Flag className="h-4 w-4" />
            Reportar Estado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
        <div className="bg-primary h-1.5 w-full" />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">Reportar Estado</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Tu reporte ayuda a mantener el mapa nacional actualizado.
            </DialogDescription>
          </DialogHeader>
          {ModalContent}
          <div className="mt-6">
            {Footer}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
