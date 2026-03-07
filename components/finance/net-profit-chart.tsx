'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

const tip = { fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", backgroundColor: "white" }

interface NetProfitChartProps { dateRange?: string }

export function NetProfitChart({ dateRange = "All Time" }: NetProfitChartProps) {
  const { data: revenue, isLoading: revLoad } = useAirtable('revenue', { fields: ['Amount USD', 'Date'], sort: [{ field: 'Date', direction: 'asc' }] })
  const { data: expenses, isLoading: expLoad } = useAirtable('expenses', { fields: ['Expense', 'Date'], sort: [{ field: 'Date', direction: 'asc' }] })

  const chartData = useMemo(() => {
    const revByMonth: Record<string, number> = {}
    for (const r of revenue ?? []) {
      const d = r.fields['Date'] as string; if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      revByMonth[key] = (revByMonth[key] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
    }
    const expByMonth: Record<string, number> = {}
    for (const r of expenses ?? []) {
      const d = r.fields['Date'] as string; if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      expByMonth[key] = (expByMonth[key] ?? 0) + parseCurrency(r.fields['Expense'] as string)
    }
    const months = Array.from(new Set([...Object.keys(revByMonth), ...Object.keys(expByMonth)])).sort((a,b) => new Date(a).getTime() - new Date(b).getTime())
    return months.map(month => ({ month, profit: (revByMonth[month] ?? 0) - (expByMonth[month] ?? 0) }))
  }, [revenue, expenses])

  const data = useMemo(() => {
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
  }, [chartData, dateRange])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold text-foreground">Net Profit</h2><p className="text-[12px] text-muted-foreground mt-0.5">Revenue minus expenses by month</p></div>
      <div className="p-5 pt-4"><div className="h-[240px]">
        {revLoad || expLoad ? <div className="h-full bg-muted animate-pulse rounded" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ bottom: data.length > 6 ? 40 : 0 }}>
              <defs>
                <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 72%, 40%)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(142, 72%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={data.length > 6 ? 0 : 8} angle={data.length > 6 ? -45 : 0} textAnchor={data.length > 6 ? "end" : "middle"} interval={Math.max(0, Math.ceil(data.length / 12) - 1)} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={50} tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, "Net Profit"]} />
              <Area type="monotone" dataKey="profit" name="Net Profit" stroke="hsl(142, 72%, 40%)" strokeWidth={1.5} fill="url(#fillProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div></div>
    </div>
  )
}
