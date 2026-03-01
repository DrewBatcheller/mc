"use client"

import { useState } from "react"
import { MonthSelector } from "@/components/finance/month-selector"
import { DrilldownStatCards } from "@/components/finance/drilldown-stat-cards"
import { RevenueVsExpensesChart } from "@/components/finance/revenue-vs-expenses-chart"
import {
  RevenueCategoryBreakdown,
  ExpenseCategoryBreakdown,
} from "@/components/finance/drilldown-category-charts"

export default function MonthlyDrilldownPage() {
  const [selectedMonth, setSelectedMonth] = useState("2025-01")

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Monthly Drilldown
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Track all key metrics for each month: Total Revenue, Total Expenses,
            Net Profit, EBITDA, and Gross Margin %.
          </p>
        </div>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <DrilldownStatCards month={selectedMonth} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueVsExpensesChart month={selectedMonth} />
        <RevenueCategoryBreakdown month={selectedMonth} />
      </div>

      <ExpenseCategoryBreakdown month={selectedMonth} />
    </>
  )
}
