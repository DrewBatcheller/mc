"use client"

import { Loader2 } from "lucide-react"

interface LoadingOverlayProps {
  isLoading: boolean
}

export function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-sm text-muted-foreground">Loading data...</p>
      </div>
    </div>
  )
}
