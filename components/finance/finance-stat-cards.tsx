'use client'

import { DollarSign, Repeat, CreditCard, Receipt, TrendingUp, BarChart3, Percent, PieChart } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"
import { useMemo } from "react"
import { parseCurrency } from "@/lib/transforms"

interface FinanceStatCardsProps {
  dateRange?: string
}

function getDateFilter(dateRange: string): string {
  const now = new Date()
  if (dateRange === 'Last Month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `IS_AFTER({Date}, "${lm.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 3 Months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 6 Months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  return ''
}

export function FinanceStatCards({ dateRange = "All Time" }: FinanceStatCardsProps) {
  const dateFilter = getDateFilter(dateRange)

  const { data: revenue, isLoading: revLoading } = useAirtable('revenue', {
    fields: ['Amount', 'Date', 'Category', 'Type'],
    ...(dateFilter ? { filterExtra: dateFilter } : {}),
  })

  const { data: expenses, isLoading: expLoading } = useAirtable('expenses', {
    fields: ['Amount', 'Date', 'Category'],
    ...(dateFilter ? { filterExtra: dateFilter } : {}),
  })

  const { data: clients, isLoading: clientsLoading } = useAirtable('clients', {
    fields: ['Client Status', 'Monthly Price'],
    filterExtra: '{Client Status} = "Active"',
  })

  const isLoading = revLoading || expLoading || clientsLoading

  const stats = useMemo(() => {
    const totalRev = (revenue ?? []).reduce((s, r) => s + parseCurrency(r.fields['Amount'] as string), 0)
    const totalExp = (expenses ?? []).reduce((s, r) => s + parseCurrency(r.fields['Amount'] as string), 0)
    const mrr = (clients ?? []).reduce((s, r) => s + parseCurrency(r.fields['Monthly Price'] as string), 0)

    const mrrRevenue = (revenue ?? [])
      .filter(r => String(r.fields['Type'] ?? '').includes('MRR') || String(r.fields['Category'] ?? '').includes('MRR'))
      .reduce((s, r) => s + parseCurrency(r.fields['Amount'] as string), 0)

    const ebitda = totalRev - totalExp
    const ebitdaMargin = totalRev > 0 ? ((ebitda / totalRev) * 100).toFixed(2) : '0.00'
    const grossMargin = totalRev > 0 ? (((totalRev - totalExp) / totalRev) * 100).toFixed(2) : '0.00'

    return { totalRev, totalExp, mrr, mrrRevenue, ebitda, ebitdaMargin, grossMargin }
  }, [revenue, expenses, clients])

  const fmt = (n: number) => {
    if (isLoading) return '\u2014'
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
    return `$${n.toFixed(2)}`
  }

  const statCards = [
    { label: "Total Revenue", value: fmt(stats.totalRev), icon: DollarSign },
    { label: "Total MRR (Active)", value: fmt(stats.mrr), icon: Repeat },
    { label: "Total Expenses", value: fmt(stats.totalExp), icon: CreditCard },
    { label: "EBITDA", value: fmt(stats.ebitda), sub: "Revenue minus Expenses", icon: TrendingUp },
    { label: "Net Profit", value: fmt(stats.ebitda), sub: "After Expenses", icon: BarChart3 },
    { label: "EBITDA Margin %", value: isLoading ? '\u2014' : `${stats.ebitdaMargin}%`, icon: Percent },
    { label: "Gross Margin %", value: isLoading ? '\u2014' : `${stats.grossMargin}%`, icon: PieChart },
    { label: "MRR Revenue", value: fmt(stats.mrrRevenue), icon: Receipt },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map(stat => <MetricCard key={stat.label} {...stat} />)}
    </div>
  )
}