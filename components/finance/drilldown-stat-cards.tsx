"use client"

import { DollarSign, Repeat, CreditCard, TrendingUp, BarChart3, Percent, PieChart } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

interface DrilldownStatCardsProps {
  month?: string
}

export function DrilldownStatCards({ month = "2025-01" }: DrilldownStatCardsProps) {
  const { data: revenue } = useAirtable('revenue', {
    fields: ['Amount USD', 'Date', 'Monthly Recurring Revenue'],
  })

  const { data: expenses } = useAirtable('expenses', {
    fields: ['Expense', 'Date'],
  })

  const { data: clients } = useAirtable('clients', {
    fields: ['Monthly Price'],
  })

  const monthlyStats = useMemo(() => {
    // Parse month string (e.g., "2025-01")
    const [year, monthNum] = month.split('-')
    const monthDate = new Date(`${year}-${monthNum}-01`)

    // Filter revenue for selected month
    const monthRevenue = (revenue ?? []).filter(r => {
      const d = r.fields['Date'] as string
      if (!d) return false
      const date = new Date(d)
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(monthNum) - 1
    })

    // Filter expenses for selected month
    const monthExpenses = (expenses ?? []).filter(r => {
      const d = r.fields['Date'] as string
      if (!d) return false
      const date = new Date(d)
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(monthNum) - 1
    })

    // Calculate totals
    const totalRevenue = monthRevenue.reduce((sum, r) => sum + parseCurrency(r.fields['Amount USD'] as string), 0)
    const totalExpenses = monthExpenses.reduce((sum, r) => sum + parseCurrency(r.fields['Expense'] as string), 0)
    const mrrRevenue = monthRevenue
      .filter(r => r.fields['Monthly Recurring Revenue'] || String(r.fields['Category (from Category)'] ?? '').toLowerCase().includes('mrr'))
      .reduce((sum, r) => sum + parseCurrency(r.fields['Amount USD'] as string), 0)

    const netProfit = totalRevenue - totalExpenses
    const ebitda = netProfit // Simplified - actual EBITDA would exclude other items
    const ebitdaMargin = totalRevenue > 0 ? ((ebitda / totalRevenue) * 100).toFixed(1) : "0"
    const grossMargin = totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : "0"

    return {
      revenue: totalRevenue,
      mrr: mrrRevenue,
      expenses: totalExpenses,
      profit: netProfit,
      ebitda,
      ebitdaMargin: `${ebitdaMargin}%`,
      grossMargin: `${grossMargin}%`,
    }
  }, [revenue, expenses, month])

  const getMonthlyStats = () => {
    const data = monthlyStats
    
    const row1 = [
      { label: "Total Revenue", value: data.revenue, icon: DollarSign, currency: true },
      { label: "Total MRR", value: data.mrr, icon: Repeat, currency: true },
      { label: "Total Expenses", value: data.expenses, icon: CreditCard, currency: true },
    ]

    const row2 = [
      { label: "Net Profit", value: data.profit, sub: "After Taxes & Reserve Allocations", icon: BarChart3, currency: true },
      { label: "EBITDA", value: data.ebitda, sub: "Before Taxes & Revenue Allocation", icon: TrendingUp, currency: true },
      { label: "EBITDA Margin %", value: data.ebitdaMargin, icon: Percent },
      { label: "Gross Margin %", value: data.grossMargin, icon: PieChart },
    ]

    return { row1, row2 }
  }

  const { row1, row2 } = getMonthlyStats()
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {row1.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  )
}
