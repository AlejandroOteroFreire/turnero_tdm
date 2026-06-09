import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Turnero TDM — Club Jorge Newbery',
  description: 'Gestión de turnos de tenis de mesa — Club Jorge Newbery, Sección Tenis de Mesa, Wilde',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Turnero TDM',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#1E7A34',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-club-black text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
