"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/v2/app-shell"
import { ClientDetailContent } from "@/components/v2/clients/client-detail-content"

export default function ClientDetailPage() {
  return (
    <TooltipProvider>
      <AppShell>
        <ClientDetailContent />
      </AppShell>
    </TooltipProvider>
  )
}
