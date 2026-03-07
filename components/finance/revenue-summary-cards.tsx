"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

function buildDateFilter(dateRange: string): string {
  if (dateRange === 'All Time') return ''
  const now = new Date()
  if (dateRange === 'Last Month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 3 Months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 6 Months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 12 Months') {
    const d = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange.match(/^\d{4}$/)) {
    return `YEAR({Date}) = ${dateRange}`
  }
  return ''
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Shared hook for all three revenue summary card components.
 * Uses only confirmed-working field names from the revenue table CSV.
 * All three components use identical options → same SWR key → one request.
 */
function useRevenueSummaryData(dateRange: string) {
  const dateFilter = buildDateFilter(dateRange)
  return useAirtable('revenue', {
    fields: ['Amount USD', 'Date', 'Brand Name (from Client)', 'Category (from Category)', 'Monthly Recurring Revenue'],
    ...(dateFilter ? { filterExtra: dateFilter } : {}),
  })
}

export function TopClientsByRevenue({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawRevenue } = useRevenueSummaryData(dateRange)

  const topClients = useMemo(() => {
    if (!rawRevenue) return []
    const totals: Record<string, number> = {}
    for (const r of rawRevenue) {
      const brandValue = r.fields['Brand Name (from Client)']
      let brand = 'Unknown'
      if (Array.isArray(brandValue)) {
        brand = String(brandValue[0] ?? 'Unknown')
      } else if (brandValue) {
        brand = String(brandValue)
      }
      if (brand && brand !== 'Unknown') {
        totals[brand] = (totals[brand] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
      }
    }
    return Object.entries(totals)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [rawRevenue])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Top Clients by Revenue</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Revenue per client</p>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {topClients.map((client) => (
            <div key={client.name} className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">{client.name}</span>
              <span className="text-[13px] tabular-nums text-foreground">{formatCurrency(client.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RevenueByCategoryList({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawRevenue } = useRevenueSummaryData(dateRange)

  const categoryTotals = useMemo(() => {
    if (!rawRevenue) return []
    const totals: Record<string, number> = {}
    for (const r of rawRevenue) {
      let catValue = r.fields['Category (from Category)']
      let cat = 'Other'
      if (Array.isArray(catValue)) {
        cat = String(catValue[0] ?? 'Other')
      } else if (catValue) {
        cat = String(catValue)
      }
      totals[cat] = (totals[cat] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
    }
    return Object.entries(totals)
      .filter(([, amount]) => amount > 0)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [rawRevenue])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Revenue by Category</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Category breakdown</p>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {categoryTotals.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium text-foreground">{cat.name}</span>
              <span className="text-[13px] tabular-nums text-foreground shrink-0">{formatCurrency(cat.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MrrUpsellOtherChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawRevenue } = useRevenueSummaryData(dateRange)

  const mrrData = useMemo(() => {
    const empty = [
      { name: "MRR", value: 0, color: "hsl(195, 65%, 48%)" },
      { name: "Upsell", value: 0, color: "hsl(220, 55%, 62%)" },
      { name: "Other", value: 100, color: "hsl(220, 13%, 82%)" },
    ]
    if (!rawRevenue?.length) return empty

    let mrrTotal = 0
    let otherTotal = 0
    for (const r of rawRevenue) {
      const amt = parseCurrency(r.fields['Amount USD'] as string)
      if (r.fields['Monthly Recurring Revenue']) {
        mrrTotal += amt
      } else {
        otherTotal += amt
      }
    }

    const total = mrrTotal + otherTotal
    if (total === 0) return empty

    const mrrPct = Math.round((mrrTotal / total) * 100 * 10) / 10
    const otherPct = Math.round((otherTotal / total) * 100 * 10) / 10

    return [
      { name: "MRR", value: mrrPct, color: "hsl(195, 65%, 48%)" },
      { name: "Upsell", value: 0, color: "hsl(220, 55%, 62%)" },
      { name: "Other", value: otherPct, color: "hsl(220, 13%, 82%)" },
    ]
  }, [rawRevenue])

  const chartData = mrrData.filter(d => d.value > 0)

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">MRR v Upsell v Other</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Revenue type distribution</p>
      </div>
      <div className="p-5 flex flex-col items-center gap-4">
        <div className="h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={1}
                dataKey="value"
                stroke="white"
                strokeWidth={1.5}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                formatter={(value: number) => [`${value}%`, undefined]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[12px]">
          {mrrData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">
                {entry.name}{" "}
                <span className="text-foreground font-medium">{entry.value}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
