import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'CRO Dashboard',
  description: 'Conversion Rate Optimization Agency Dashboard',
}

export const viewport: Viewport = {
  themeColor: '#f8f8fa',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
