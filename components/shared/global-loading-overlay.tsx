'use client'

import { Loader2 } from 'lucide-react'

export function GlobalLoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <Loader2 className="h-12 w-12 text-foreground animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">Loading</p>
          <p className="text-xs text-muted-foreground">Processing your data...</p>
        </div>
      </div>
    </div>
  )
}
