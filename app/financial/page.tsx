"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/v2/app-shell"
import { useUser } from "@/contexts/v2/user-context"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinanceOverview } from "@/components/v2/financial/finance-overview"
import { MonthlyDrilldown } from "@/components/v2/financial/monthly-drilldown"
import { PnL } from "@/components/v2/financial/pnl"
import { Revenue } from "@/components/v2/financial/revenue"
import { Expenses } from "@/components/v2/financial/expenses"
import { Dividends } from "@/components/v2/financial/dividends"
import { Reserves } from "@/components/v2/financial/reserves"

export default function FinancialPage() {
  const router = useRouter()
  const { currentUser, isLoading } = useUser()
  const [activeTab, setActiveTab] = useState("overview")

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
          <h1 className="text-3xl font-bold text-foreground">Financial Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Finance Overview</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Drilldown</TabsTrigger>
            <TabsTrigger value="pnl">P&L</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="dividends">Dividends</TabsTrigger>
            <TabsTrigger value="reserves">Reserves</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Annual executive summary with filter for Year. Includes KPI tiles for Total Revenue YTD, Total Expenses YTD, Net Profit YTD, EBITDA YTD, Gross Margin %, Expense to Revenue Ratio, and charts for Revenue by Month, Net Profit by Month, and EBITDA by Month. All elements are filtered by the selected year.</p>
            </div>
            <FinanceOverview />
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Track all key metrics for each month: Total Revenue, Total Expenses, Net Profit, EBITDA, and Gross Margin %. Includes all trend and breakdown charts for financial context.</p>
            </div>
            <MonthlyDrilldown />
          </TabsContent>

          <TabsContent value="pnl" className="space-y-6">
            <PnL />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <Revenue />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <Expenses />
          </TabsContent>

          <TabsContent value="dividends" className="space-y-6">
            <Dividends />
          </TabsContent>

          <TabsContent value="reserves" className="space-y-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">View the current reserve balance and a ledger-style list of reserve movements over time. Provides transparency into reserve allocations and activity. Simple presentation for executive review.</p>
            </div>
            <Reserves />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
