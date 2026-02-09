"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/v2/app-shell"
import { useUser } from "@/contexts/v2/user-context"
import { Loader2 } from "lucide-react"
import { Reserves } from "@/components/v2/financial/reserves"

export default function ReservesPage() {
  const router = useRouter()
  const { currentUser, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && currentUser?.role !== "management") {
      router.push("/")
    }
  }, [currentUser, isLoading, router])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  if (currentUser?.role !== "management") {
    return null
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reserves</h1>
          <p className="text-sm text-muted-foreground mt-2">
            View the current reserve balance and a ledger-style list of reserve movements over time. Provides transparency into reserve allocations and activity. Simple presentation for executive review.
          </p>
        </div>
        <Reserves />
      </div>
    </AppShell>
  )
}
