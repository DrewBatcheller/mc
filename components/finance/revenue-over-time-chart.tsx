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
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

interface RevenueChartProps {
  dateRange?: string
}

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

const chartColor = "hsl(195, 55%, 55%)"

function getFilteredData(allData: any[], dateRange: string) {
  if (dateRange === "All Time") return allData
  if (dateRange === "Last Month") return allData.slice(-1)
  if (dateRange === "Last 3 Months") return allData.slice(-3)
  if (dateRange === "Last 6 Months") return allData.slice(-6)
  if (dateRange.match(/^\d{4}$/)) {
    const year = parseInt(dateRange)
    return allData.filter(d => {
      const d_year = d.month?.split(" ")?.[1]
      return parseInt(d_year) === year
    })
  }
  return allData
}

export function RevenueOverTimeChart({ dateRange = "All Time" }: RevenueChartProps) {
  const { data: rawRevenue, isLoading } = useAirtable('revenue', {
    fields: ['Amount USD', 'Date'],
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const chartData = useMemo(() => {
    if (!rawRevenue?.length) return []

    const revByMonth: Record<string, number> = {}
    const monthOrder: string[] = []

    for (const r of rawRevenue) {
      const d = r.fields['Date'] as string
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      if (!revByMonth[key]) monthOrder.push(key)
      revByMonth[key] = (revByMonth[key] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
    }

    return monthOrder.map(month => ({
      month,
      revenue: revByMonth[month],
    }))
  }, [rawRevenue])

  const data = getFilteredData(chartData, dateRange)

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue Over Time
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Monthly revenue trend
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="fillRevenueTime" x1="0" y1="0" x2="0" y2="1">
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
                  dy={8}
                  interval={Math.max(0, Math.floor(data.length / 6) - 1)}
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
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={chartColor}
                  strokeWidth={1.5}
                  fill="url(#fillRevenueTime)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export function AvgRevenuePerClientChart({ dateRange = "All Time" }: RevenueChartProps) {
  const { data: rawRevenue, isLoading: revLoad } = useAirtable('revenue', {
    fields: ['Amount USD', 'Date'],
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const { data: rawClients, isLoading: clientLoad } = useAirtable('clients', {
    fields: ['Brand Name'],
  })

  const chartData = useMemo(() => {
    if (!rawRevenue?.length || !rawClients?.length) return []

    const clientCount = (rawClients ?? []).length
    if (clientCount === 0) return []

    const revByMonth: Record<string, number> = {}
    const monthOrder: string[] = []

    for (const r of rawRevenue) {
      const d = r.fields['Date'] as string
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      if (!revByMonth[key]) monthOrder.push(key)
      revByMonth[key] = (revByMonth[key] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
    }

    return monthOrder.map(month => ({
      month,
      avg: Math.round(revByMonth[month] / clientCount),
    }))
  }, [rawRevenue, rawClients])

  const data = getFilteredData(chartData, dateRange)
  const isLoading = revLoad || clientLoad

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Average Revenue per Client Over Time
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Revenue per client trend
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="fillAvgClient" x1="0" y1="0" x2="0" y2="1">
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
                  dy={8}
                  interval={Math.max(0, Math.floor(data.length / 6) - 1)}
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
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Avg per Client"]}
                />
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke={chartColor}
                  strokeWidth={1.5}
                  fill="url(#fillAvgClient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
