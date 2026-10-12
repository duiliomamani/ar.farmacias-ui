'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

interface AdBannerProps {
  className?: string
  placement?: 'sidebar' | 'header'
}

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID

export function AdBanner({ className = '', placement = 'sidebar' }: AdBannerProps) {
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

  const isHeader = placement === 'header'

  return (
    <aside className={`${isHeader ? 'h-[50px] w-full max-w-[430px]' : 'h-[68px] w-full'} shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/20 ${className}`} aria-label="Publicidad">
      <p className={`${isHeader ? 'h-[13px] text-[8px] leading-[13px]' : 'h-[18px] text-[9px] leading-[18px]'} px-2 text-center font-medium uppercase tracking-wider text-muted-foreground/70`}>
        Publicidad
      </p>
      <ins
        ref={adRef}
        className={`adsbygoogle block w-full ${isHeader ? 'h-[37px]' : 'h-[50px]'}`}
        style={{ display: 'block', height: isHeader ? '37px' : '50px' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
    </aside>
  )
}
