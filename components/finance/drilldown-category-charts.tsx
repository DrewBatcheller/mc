"use client"

import { DonutChart } from "@/components/shared/donut-chart"

type BreakdownEntry = { name: string; value: number; color: string }

const monthlyRevenueBreakdown: Record<string, BreakdownEntry[]> = {
  "2025-01": [
    { name: "CRO Retainer", value: 65, color: "hsl(195, 55%, 55%)" },
    { name: "Affiliate Software", value: 20, color: "hsl(262, 52%, 47%)" },
    { name: "Development", value: 15, color: "hsl(142, 72%, 40%)" },
  ],
  "2025-02": [
    { name: "CRO Retainer", value: 68, color: "hsl(195, 55%, 55%)" },
    { name: "Affiliate Software", value: 18, color: "hsl(262, 52%, 47%)" },
    { name: "Development", value: 14, color: "hsl(142, 72%, 40%)" },
  ],
  "2025-03": [
    { name: "CRO Retainer", value: 70, color: "hsl(195, 55%, 55%)" },
    { name: "Affiliate Software", value: 17, color: "hsl(262, 52%, 47%)" },
    { name: "Development", value: 13, color: "hsl(142, 72%, 40%)" },
  ],
  "2025-04": [
    { name: "CRO Retainer", value: 63, color: "hsl(195, 55%, 55%)" },
    { name: "Affiliate Software", value: 22, color: "hsl(262, 52%, 47%)" },
    { name: "Development", value: 15, color: "hsl(142, 72%, 40%)" },
  ],
  "2025-05": [
    { name: "CRO Retainer", value: 72, color: "hsl(195, 55%, 55%)" },
    { name: "Affiliate Software", value: 16, color: "hsl(262, 52%, 47%)" },
    { name: "Development", value: 12, color: "hsl(142, 72%, 40%)" },
  ],
  "2025-06": [
    { name: "CRO Retainer", value: 67, color: "hsl(195, 55%, 55%)" },
    { name: "Affiliate Software", value: 19, color: "hsl(262, 52%, 47%)" },
    { name: "Development", value: 14, color: "hsl(142, 72%, 40%)" },
  ],
}

const monthlyExpenseBreakdown: Record<string, BreakdownEntry[]> = {
  "2025-01": [
    { name: "Operations", value: 45, color: "hsl(220, 55%, 62%)" },
    { name: "Marketing", value: 30, color: "hsl(0, 50%, 62%)" },
    { name: "Payroll", value: 25, color: "hsl(25, 95%, 53%)" },
  ],
  "2025-02": [
    { name: "Operations", value: 42, color: "hsl(220, 55%, 62%)" },
    { name: "Marketing", value: 33, color: "hsl(0, 50%, 62%)" },
    { name: "Payroll", value: 25, color: "hsl(25, 95%, 53%)" },
  ],
  "2025-03": [
    { name: "Operations", value: 43, color: "hsl(220, 55%, 62%)" },
    { name: "Marketing", value: 32, color: "hsl(0, 50%, 62%)" },
    { name: "Payroll", value: 25, color: "hsl(25, 95%, 53%)" },
  ],
  "2025-04": [
    { name: "Operations", value: 46, color: "hsl(220, 55%, 62%)" },
    { name: "Marketing", value: 29, color: "hsl(0, 50%, 62%)" },
    { name: "Payroll", value: 25, color: "hsl(25, 95%, 53%)" },
  ],
  "2025-05": [
    { name: "Operations", value: 40, color: "hsl(220, 55%, 62%)" },
    { name: "Marketing", value: 35, color: "hsl(0, 50%, 62%)" },
    { name: "Payroll", value: 25, color: "hsl(25, 95%, 53%)" },
  ],
  "2025-06": [
    { name: "Operations", value: 44, color: "hsl(220, 55%, 62%)" },
    { name: "Marketing", value: 31, color: "hsl(0, 50%, 62%)" },
    { name: "Payroll", value: 25, color: "hsl(25, 95%, 53%)" },
  ],
}

interface DrilldownPieProps {
  title: string
  subtitle: string
  data: { name: string; value: number; color: string }[]
  month?: string
}

export function RevenueCategoryBreakdown({ month = "2025-01" }: { month?: string }) {
  const safeMonth = (month && monthlyRevenueBreakdown[month]) ? month : "2025-01"
  return (
    <DonutChart
      title="Revenue Category Breakdown"
      subtitle="Revenue distribution across categories for the selected month"
      data={monthlyRevenueBreakdown[safeMonth]}
    />
  )
}

export function ExpenseCategoryBreakdown({ month = "2025-01" }: { month?: string }) {
  const safeMonth = month && monthlyExpenseBreakdown[month] ? month : "2025-01"
  return (
    <DonutChart
      title="Expense Category Breakdown"
      subtitle="Expense distribution across categories for the selected month"
      data={monthlyExpenseBreakdown[safeMonth]}
    />
  )
}
