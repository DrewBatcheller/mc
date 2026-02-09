"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/v2/app-shell"
import { useUser } from "@/contexts/v2/user-context"
import { Loader2 } from "lucide-react"
import { FinanceOverview } from "@/components/v2/financial/finance-overview"

export default function FinanceOverviewPage() {
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
          <h1 className="text-3xl font-bold text-foreground">Finance Overview</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Annual executive summary with filter for Year. Includes KPI tiles for Total Revenue YTD, Total Expenses YTD, Net Profit YTD, EBITDA YTD, Gross Margin %, Expense to Revenue Ratio, and charts for Revenue by Month, Net Profit by Month, and EBITDA by Month. All elements are filtered by the selected year.
          </p>
        </div>
        <FinanceOverview />
      </div>
    </AppShell>
  )
}
