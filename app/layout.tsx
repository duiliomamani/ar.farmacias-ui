import type { Metadata, Viewport } from 'next'
import { Open_Sans, Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme-provider'
import { Providers } from '@/components/providers'
import './globals.css'

const openSans = Open_Sans({ 
  subsets: ["latin"],
  variable: "--font-open-sans",
  weight: ['400', '500', '600', '700']
})

const poppins = Poppins({ 
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ['500', '600', '700']
})

export const metadata: Metadata = {
  applicationName: 'CondorJUY',
  title: 'CondorJUY - Servicios esenciales en Jujuy',
  description: 'Mapa interactivo de servicios esenciales en Jujuy: farmacias de turno, nodos sanitarios, CAPS, CIC, puestos de salud y cuarteles de bomberos.',
  keywords: ['farmacias de turno', 'centros de salud', 'CAPS', 'hospital', 'bomberos', 'emergencias', 'Jujuy', 'Argentina'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CondorJUY',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#22c55e' },
    { media: '(prefers-color-scheme: dark)', color: '#16a34a' },
  ],
}

import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background" suppressHydrationWarning>
      <body className={`${openSans.variable} ${poppins.variable} font-sans antialiased`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          />
        )}
      </body>
    </html>
  )
}
