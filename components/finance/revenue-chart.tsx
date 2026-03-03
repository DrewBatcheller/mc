"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

interface RevenueChartProps {
  dateRange?: string
}

export function RevenueChart({ dateRange = "All Time" }: RevenueChartProps) {
  const { data: rawRevenue, isLoading: revLoad } = useAirtable('revenue', {
    fields: ['Amount USD', 'Date'],
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const { data: rawExpenses, isLoading: expLoad } = useAirtable('expenses', {
    fields: ['Expense', 'Date'],
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const chartData = useMemo(() => {
    const revByMonth: Record<string, number> = {}
    const expByMonth: Record<string, number> = {}

    for (const r of rawRevenue ?? []) {
      const d = r.fields['Date'] as string
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      revByMonth[key] = (revByMonth[key] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
    }

    for (const r of rawExpenses ?? []) {
      const d = r.fields['Date'] as string
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      expByMonth[key] = (expByMonth[key] ?? 0) + parseCurrency(r.fields['Expense'] as string)
    }

    const allMonths = Array.from(new Set([...Object.keys(revByMonth), ...Object.keys(expByMonth)])).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    )

    return allMonths.map(month => ({
      month,
      revenue: revByMonth[month] ?? 0,
      expenses: expByMonth[month] ?? 0,
      profit: (revByMonth[month] ?? 0) - (expByMonth[month] ?? 0),
    }))
  }, [rawRevenue, rawExpenses])

  // Filter data based on date range
  const getFilteredData = () => {
    if (dateRange === "All Time") return chartData
    if (dateRange === "Last Month") return chartData.slice(-1)
    if (dateRange === "Last 3 Months") return chartData.slice(-3)
    if (dateRange === "Last 6 Months") return chartData.slice(-6)
    if (dateRange === "Last 12 Months") return chartData.slice(-12)
    if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      return chartData.filter(d => parseInt(d.month.split(" ")[1]) === year)
    }
    return chartData
  }

  const data = getFilteredData()

  const interval = Math.max(0, Math.ceil(data.length / 12) - 1)
  const shouldTilt = data.length > 6

  const chartColors = {
    revenue: "hsl(220, 55%, 62%)",
    expenses: "hsl(0, 50%, 65%)",
    profit: "hsl(142, 45%, 55%)",
  }

  function formatDollar(value: number) {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value}`
  }

  const isLoading = revLoad || expLoad

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue by Month
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Monthly revenue, expenses, and net profit
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ bottom: shouldTilt ? 40 : 0 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.revenue} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={chartColors.revenue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.expenses} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={chartColors.expenses} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.profit} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={chartColors.profit} stopOpacity={0} />
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
                  width={44}
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
                  formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                />
                <Legend
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: 12, paddingTop: shouldTilt ? 52 : 12 }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={chartColors.revenue} strokeWidth={1.5} fill="url(#fillRevenue)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke={chartColors.expenses} strokeWidth={1.5} fill="url(#fillExpenses)" />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke={chartColors.profit} strokeWidth={1.5} fill="url(#fillProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
