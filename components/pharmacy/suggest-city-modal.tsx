'use client'

import { useState } from 'react'
import { MapPin, Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PROVINCES = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
]

interface SuggestCityModalProps {
  variant?: 'default' | 'compact'
}

export function SuggestCityModal({ variant = 'default' }: SuggestCityModalProps) {
  const [open, setOpen] = useState(false)
  const [cityName, setCityName] = useState('')
  const [province, setProvince] = useState('')
  const [sourceLink, setSourceLink] = useState('')
  const [fileName, setFileName] = useState('')
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // Reset form
    setCityName('')
    setProvince('')
    setSourceLink('')
    setFileName('')
    setComments('')
    setIsSubmitting(false)
    setOpen(false)
  }

  const isValid = cityName.trim() && province && (sourceLink.trim() || fileName)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'compact' ? (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="sr-only">Suggest City</span>
          </Button>
        ) : (
          <Button variant="outline" className="gap-2 font-semibold">
            <MapPin className="h-4 w-4" strokeWidth={2.5} />
            <span>Suggest City</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading tracking-tight">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={2.5} />
            Suggest City / Submit Data Source
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Help us expand coverage by suggesting a new city or submitting a data source for pharmacy schedules.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="cityName" className="font-semibold">City Name *</Label>
            <Input
              id="cityName"
              placeholder="Enter city name"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province" className="font-semibold">Province *</Label>
            <Select value={province} onValueChange={setProvince} required>
              <SelectTrigger id="province">
                <SelectValue placeholder="Select province" />
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
            <Label htmlFor="sourceLink" className="font-semibold">Link to Data Source</Label>
            <Input
              id="sourceLink"
              type="url"
              placeholder="https://municipality.gov.ar/pharmacies"
              value={sourceLink}
              onChange={(e) => setSourceLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              PDF, website, or official source with pharmacy schedule
            </p>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Or Upload a Photo</Label>
            <div className="relative">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center gap-2 border border-dashed border-input rounded-lg p-3 hover:border-primary/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
                <span className="text-sm text-muted-foreground">
                  {fileName || 'Click to upload pharmacy schedule photo'}
                </span>
                {fileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFileName('')
                    }}
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments" className="font-semibold">Additional Comments</Label>
            <Textarea
              id="comments"
              placeholder="Any additional information..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="bg-primary hover:bg-primary/90 font-semibold"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
