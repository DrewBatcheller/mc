'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

const tip = { fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", backgroundColor: "white" }

interface MrrGrowthChartProps { dateRange?: string }

export function MrrGrowthChart({ dateRange = "All Time" }: MrrGrowthChartProps) {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Client Status', 'Monthly Price', 'Initial Closed Date', 'Churn Date'],
    sort: [{ field: 'Initial Closed Date', direction: 'asc' }],
  })

  const chartData = useMemo(() => {
    if (!clients?.length) return []
    const all = clients ?? []
    const dates = all.map(r => r.fields['Initial Closed Date'] as string).filter(Boolean).sort()
    if (!dates.length) return []
    const start = new Date(dates[0])
    const now = new Date()
    const months: { month: string; mrr: number }[] = []
    for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
      const activeThen = all.filter(r => {
        const opened = r.fields['Initial Closed Date'] as string
        const closed = r.fields['Churn Date'] as string
        return opened && new Date(opened) <= endOfMonth && (!closed || new Date(closed) > endOfMonth)
      })
      const mrrVal = activeThen.reduce((s, r) => s + parseCurrency(r.fields['Monthly Price'] as string), 0)
      months.push({ month: key, mrr: mrrVal })
    }
    return months
  }, [clients])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold text-foreground">MRR Growth</h2><p className="text-[12px] text-muted-foreground mt-0.5">Monthly recurring revenue over time</p></div>
      <div className="p-5 pt-4"><div className="h-[240px]">
        {isLoading ? <div className="h-full bg-muted animate-pulse rounded" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(262, 52%, 47%)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(262, 52%, 47%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={8} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={50} tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]} />
              <Area type="monotone" dataKey="mrr" name="MRR" stroke="hsl(262, 52%, 47%)" strokeWidth={1.5} fill="url(#fillMrr)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div></div>
    </div>
  )
}
