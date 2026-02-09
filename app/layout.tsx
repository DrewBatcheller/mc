import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { UserProvider } from "@/contexts/v2/user-context"

const inter = Inter({ subsets: ["latin"], preload: true })

export const metadata: Metadata = {
  title: "More Conversions - Operations Dashboard",
  description: "Comprehensive operations dashboard for conversion optimization",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS to prevent FOUC */
            html { background-color: oklch(1 0 0); }
            body { margin: 0; padding: 0; background-color: oklch(1 0 0); }
            #__next { display: flex; min-height: 100vh; }
          `
        }} />
      </head>
      <body className={`${inter.className} bg-background`} style={{ margin: 0, padding: 0 }}>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}
