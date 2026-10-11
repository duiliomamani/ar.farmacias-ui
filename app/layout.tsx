import type { Metadata, Viewport } from 'next'
import { Open_Sans, Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
  applicationName: 'FarmaJUY',
  title: 'FarmaJUY - Farmacias de turno en Jujuy',
  description: 'Encontrá farmacias de turno, permanentes y de atención voluntaria en Jujuy, con ubicación, indicaciones y reportes de la comunidad.',
  keywords: ['farmacias de turno', 'farmacias', 'salud', 'emergencias', 'Jujuy', 'Argentina'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FarmaJUY',
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
      </body>
    </html>
  )
}
