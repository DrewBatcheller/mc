"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { DonutChart } from "@/components/shared/donut-chart"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

const pieColors = [
  "hsl(210, 65%, 50%)",
  "hsl(175, 55%, 48%)",
  "hsl(38, 70%, 55%)",
  "hsl(262, 45%, 58%)",
]

function formatDollar(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

const chartColor = "hsl(195, 65%, 48%)"

export function ReserveBalanceChart({ year = "all" }: { year?: string }) {
  const { data: rawReserve, isLoading } = useAirtable('reserve', {
    sort: [{ field: 'DateClean', direction: 'asc' }],
  })

  const data = useMemo(() => {
    if (!rawReserve) return []
    const yearNum = year !== 'all' ? parseInt(year) : null
    const byMonth: Record<string, number> = {}
    const monthOrder: string[] = []

    for (const r of rawReserve) {
      // Month & Year (from Month & Year) is a lookup — returns array of strings
      const monthRaw = r.fields['Month & Year (from Month & Year)']
      const monthYear = String(Array.isArray(monthRaw) ? (monthRaw[0] ?? '') : (monthRaw ?? ''))
      const dateClean = String(r.fields['DateClean'] ?? '')
      if (!monthYear) continue
      if (yearNum && !dateClean.startsWith(String(yearNum))) continue

      // Use the latest balance for each month (data sorted ASC, later entries overwrite)
      const balance = parseCurrency(r.fields['New Account Balance'] as string)
      if (!byMonth[monthYear]) monthOrder.push(monthYear)
      byMonth[monthYear] = balance
    }

    return monthOrder.map(m => ({ month: m, balance: byMonth[m] }))
  }, [rawReserve, year])

  const interval = Math.max(0, Math.ceil(data.length / 12) - 1)
  const shouldTilt = data.length > 6

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Reserve Account Balance Growth Over Time
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Balance trend over time
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[280px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ bottom: shouldTilt ? 40 : 0 }}>
                <defs>
                  <linearGradient id="fillReserveBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dy={shouldTilt ? 0 : 8}
                  angle={shouldTilt ? -45 : 0}
                  textAnchor={shouldTilt ? "end" : "middle"}
                  interval={interval}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dx={-4}
                  width={50}
                  tickFormatter={formatDollar}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(220, 13%, 91%)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    backgroundColor: "white",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={chartColor}
                  strokeWidth={1.5}
                  fill="url(#fillReserveBalance)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export function ReserveTransactionTypePie({ year = "all" }: { year?: string }) {
  const { data: rawReserve } = useAirtable('reserve', {})

  const data = useMemo(() => {
    if (!rawReserve) return []
    const yearNum = year !== 'all' ? parseInt(year) : null
    const byCat: Record<string, number> = {}

    for (const r of rawReserve) {
      const dateClean = String(r.fields['DateClean'] ?? '')
      if (yearNum) {
        // Handle both "YYYY/MM/D" and "YYYY-MM-DD" formats
        const yearFromDate = parseInt(dateClean.split(/[\/\-]/)[0] ?? '0')
        if (yearFromDate !== yearNum) continue
      }

      // Use absolute allocated amount — include $0 records so every category shows
      const amt = Math.abs(parseCurrency(r.fields['Allocated Amount'] as string))

      // Primary grouping: Category (from Category) lookup field
      // Airtable lookup fields return arrays; handle both array and scalar forms
      const catValue = r.fields['Category (from Category)']
      let cat: string
      if (Array.isArray(catValue) && catValue.length > 0) {
        cat = String(catValue[0])
      } else if (catValue && String(catValue).trim()) {
        cat = String(catValue).trim()
      } else {
        // Fallback: Transaction Type when Category lookup is unpopulated
        const txType = String(r.fields['Transaction Type'] ?? '').trim()
        cat = txType || 'Uncategorized'
      }

      byCat[cat] = (byCat[cat] ?? 0) + amt
    }

    const total = Object.values(byCat).reduce((s, v) => s + v, 0)
    if (total === 0) return []

    return Object.entries(byCat)
      .map(([name, value], i) => ({
        name,
        value: Math.round((value / total) * 100 * 10) / 10,
        color: pieColors[i % pieColors.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [rawReserve, year])

  return (
    <DonutChart
      title="Reserve Transactions by Category"
      subtitle="Allocation breakdown by category"
      data={data}
    />
  )
}
