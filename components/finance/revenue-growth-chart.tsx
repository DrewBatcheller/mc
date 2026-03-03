"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

interface RevenueGrowthChartProps {
  dateRange?: string
}

export function RevenueGrowthChart({ dateRange = "All Time" }: RevenueGrowthChartProps) {
  const { data: rawRevenue, isLoading } = useAirtable('revenue', {
    fields: ['Amount USD', 'Date'],
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const chartData = useMemo(() => {
    const revByMonth: Record<string, number> = {}

    for (const r of rawRevenue ?? []) {
      const d = r.fields['Date'] as string
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      revByMonth[key] = (revByMonth[key] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
    }

    const months = Object.keys(revByMonth).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    )

    const growth: { month: string; growth: number }[] = []
    let prevRev = 0
    for (const month of months) {
      const currRev = revByMonth[month]
      growth.push({ month, growth: currRev - prevRev })
      prevRev = currRev
    }

    return growth
  }, [rawRevenue])

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

  function formatDollar(value: number) {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value}`
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue Growth
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Month-over-month revenue change in dollars
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ bottom: shouldTilt ? 40 : 0 }}>
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
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Growth"]}
                />
                <ReferenceLine y={0} stroke="hsl(220, 13%, 91%)" />
                <Bar
                  dataKey="growth"
                  fill="hsl(142, 72%, 40%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
