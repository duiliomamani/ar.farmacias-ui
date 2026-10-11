'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PharmacyService } from '@/lib/api'

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  : 'Sin ejecuciones'

export function ScraperMonitor() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['scraper-status', 'turnos-jujuy'],
    queryFn: PharmacyService.getScrapingStatus,
    refetchInterval: 60_000,
    retry: false,
  })

  if (isLoading) return <div className="rounded-xl border bg-card/50 p-3 text-xs text-muted-foreground">Cargando estado del scraper...</div>
  if (isError || !data) return <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">No hay estado de scraping disponible.</div>

  const failed = data.status === 'failed'
  const running = data.status === 'running'
  const hasStructureWarning = data.structureChanges?.length > 0

  return (
    <div className="rounded-xl border bg-card/60 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 text-primary" /> Monitor del scraper
        </div>
        <Badge variant={failed || hasStructureWarning ? 'destructive' : 'secondary'} className="gap-1 text-[10px] uppercase">
          {failed ? <AlertTriangle className="h-3 w-3" /> : running ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {running ? 'Ejecutando' : failed ? 'Error' : hasStructureWarning ? 'Revisar' : 'Correcto'}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
        <span>Última ejecución</span><strong className="text-right text-foreground">{formatDate(data.finishedAt || data.startedAt)}</strong>
        <span>Encontrados</span><strong className="text-right text-foreground">{data.recordsFound}</strong>
        <span>Guardados</span><strong className="text-right text-foreground">{data.recordsSaved}</strong>
        <span>Eliminados viejos</span><strong className="text-right text-foreground">{data.staleRemoved}</strong>
      </div>
      {(failed || hasStructureWarning || data.errorMessages?.length > 0) && (
        <div className="mt-2 space-y-1 border-t pt-2 text-[11px] text-amber-700 dark:text-amber-300">
          {[...(data.errorMessages || []), ...(data.structureChanges || [])].map((message, index) => <p key={`${index}-${message}`}>• {message}</p>)}
        </div>
      )}
    </div>
  )
}
