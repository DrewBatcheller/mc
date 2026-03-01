"use client"

import { useState } from "react"
import { FinanceStatCards } from "@/components/finance/finance-stat-cards"
import { RevenueChart } from "@/components/finance/revenue-chart"
import { NetProfitChart } from "@/components/finance/net-profit-chart"
import { RevenueGrowthChart } from "@/components/finance/revenue-growth-chart"
import { MrrGrowthChart } from "@/components/finance/mrr-growth-chart"
import {
  RevenueByCategoryChart,
  ExpenseByCategoryChart,
} from "@/components/finance/category-charts"
import { DateRangeFilter } from "@/components/finance/date-range-filter"

export default function FinanceOverviewPage() {
  const [dateRange, setDateRange] = useState("All Time")

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Finance Overview
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            High-level financial summary and trends
          </p>
        </div>
        <DateRangeFilter 
          onRangeChange={setDateRange}
          selectedRange={dateRange}
        />
      </div>

      <FinanceStatCards dateRange={dateRange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart dateRange={dateRange} />
        <NetProfitChart dateRange={dateRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueGrowthChart dateRange={dateRange} />
        <MrrGrowthChart dateRange={dateRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueByCategoryChart dateRange={dateRange} />
        <ExpenseByCategoryChart dateRange={dateRange} />
      </div>
    </>
  )
}
