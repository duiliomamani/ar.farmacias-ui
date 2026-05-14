"use client"

import * as React from "react"
import { 
  Building2, 
  FileText, 
  Loader2, 
  MapPin, 
  Plus, 
  Store, 
  UploadCloud, 
  User, 
  AlertCircle,
  ArrowLeft,
  Info,
  CheckCircle2,
  ShieldCheck,
  Upload,
  X,
  MessageSquare
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type Pharmacy } from "@/lib/pharmacy-data"
import { useAuth } from "@/components/auth/auth-context"

const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 
  'Tierra del Fuego', 'Tucumán',
]

type ContributionRole = "neighbor" | "professional" | "institution" | null
type Step = 1 | 2

interface ContributeDataModalProps {
  selectedPharmacy?: Pharmacy | null
}

export function ContributeDataModal({ selectedPharmacy }: ContributeDataModalProps) {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form State - Suggestion
  const [cityName, setCityName] = React.useState("")
  const [province, setProvince] = React.useState("")
  const [sourceLink, setSourceLink] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [comments, setComments] = React.useState("")

  const resetForm = () => {
    setCityName("")
    setProvince("")
    setSourceLink("")
    setFileName("")
    setComments("")
    setIsSubmitting(false)
  }

  const handleSuggestionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 2000))
    
    setIsSubmitting(false)
    setOpen(false)

    toast.success("¡Gracias por tu sugerencia!", {
      description: "Nuestro equipo revisará la información para agregarla pronto.",
    })
    resetForm()
  }

  const isSuggestionValid = cityName.trim() && province && (sourceLink.trim() || fileName)

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm() }}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-14 rounded-full shadow-2xl px-6 gap-3 z-[100] hover:scale-110 transition-transform bg-blue-600 hover:bg-blue-700 text-white border-4 border-background group">
          <MessageSquare className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
          <span className="font-black uppercase tracking-widest text-xs">Sugerencias</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="overflow-hidden rounded-3xl border-0 shadow-2xl p-0 sm:max-w-[425px]">
        <div className="bg-blue-600 h-2 w-full" />
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-2xl tracking-tighter uppercase">
              Sugerencias
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground/80 mt-1">
              Ayudanos a mejorar FarmaYa aportando datos de tu ciudad o sugiriendo nuevas fuentes oficiales.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 py-4 animate-in fade-in zoom-in duration-300">
            <div className="space-y-2">
              <Label htmlFor="cityName" className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Ciudad / Localidad *</Label>
              <Input
                id="cityName"
                placeholder="Ej: San Miguel de Tucumán"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                required
                className="h-12 bg-muted/30 focus-visible:ring-blue-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province" className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Provincia *</Label>
              <Select value={province} onValueChange={setProvince} required>
                <SelectTrigger id="province" className="h-12 bg-muted/30 focus-visible:ring-blue-500/20">
                  <SelectValue placeholder="Seleccionar provincia" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceLink" className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Enlace Oficial de Turnos</Label>
              <Input
                id="sourceLink"
                type="url"
                placeholder="https://municipio.gov.ar/farmacias"
                value={sourceLink}
                onChange={(e) => setSourceLink(e.target.value)}
                className="h-12 bg-muted/30 focus-visible:ring-blue-500/20"
              />
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                PDF, sitio web del municipio o colegio oficial
              </p>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">O subir archivo / imagen</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSuggestionFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center gap-3 border-2 border-dashed border-input rounded-xl p-4 hover:border-blue-500/50 transition-colors bg-muted/30">
                  <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
                  <span className="text-sm font-medium text-muted-foreground flex-1 truncate">
                    {fileName || 'Clic para subir el cronograma'}
                  </span>
                  {fileName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-auto z-20 relative"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setFileName('')
                      }}
                    >
                      <X className="h-4 w-4" strokeWidth={3} />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments" className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Comentarios adicionales</Label>
              <Textarea
                id="comments"
                placeholder="Cualquier información útil para el equipo..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="bg-muted/30 focus-visible:ring-blue-500/20 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={!isSuggestionValid || isSubmitting}
              className="w-full h-14 text-base font-black uppercase tracking-widest shadow-xl mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                "Enviar Sugerencia"
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RoleCard({ icon, title, description, onClick }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  onClick: () => void 
}) {
  return (
    <Card 
      className="flex items-center gap-5 p-5 cursor-pointer hover:bg-primary/5 transition-all border-2 border-muted hover:border-primary/40 group rounded-2xl shadow-sm hover:shadow-md"
      onClick={onClick}
    >
      <div className="bg-muted p-4 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300 shadow-inner">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-black text-lg uppercase tracking-tighter group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-muted-foreground font-medium leading-tight mt-1">{description}</p>
      </div>
    </Card>
  )
}
