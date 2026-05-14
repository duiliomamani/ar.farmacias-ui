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
  title: 'FarmaYa AR - On-Duty Pharmacy Finder',
  description: 'Find nearby on-duty pharmacies open 24/7 across Argentina. Locate emergency pharmacies, get directions, and contact information instantly.',
  generator: 'v0.app',
  keywords: ['pharmacy', 'on-duty', 'emergency', 'farmacias de turno', '24/7', 'healthcare', 'argentina'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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

import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
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
