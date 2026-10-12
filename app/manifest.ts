import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CondorJUY — Servicios esenciales en Jujuy',
    short_name: 'CondorJUY',
    description: 'Farmacias de turno, centros de salud (CAPS, Nodos, CIC) y cuarteles de bomberos en Jujuy.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f8faf9',
    theme_color: '#16a34a',
    categories: ['medical', 'navigation', 'utilities'],
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

