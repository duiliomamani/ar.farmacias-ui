'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

interface AdBannerProps {
  className?: string
}

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID

export function AdBanner({ className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    if (!clientId || !slotId || !adRef.current || adRef.current.dataset.adInitialized) return

    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      adRef.current.dataset.adInitialized = 'true'
    } catch {
      // AdSense puede no estar disponible durante bloqueos de anuncios o desarrollo local.
    }
  }, [])

  if (!clientId || !slotId) return null

  return (
    <aside className={`h-[68px] w-full shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/20 ${className}`} aria-label="Publicidad">
      <p className="h-[18px] px-2 text-center text-[9px] font-medium uppercase tracking-wider leading-[18px] text-muted-foreground/70">
        Publicidad
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle block h-[50px] w-full"
        style={{ display: 'block', height: '50px' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
    </aside>
  )
}
