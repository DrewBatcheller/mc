'use client'

import { useAirtable } from "@/hooks/use-airtable"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

function getLast6Months() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return months
}

function buildClientFilter(clientIds: string[]): string | undefined {
  if (!clientIds.length) return undefined
  if (clientIds.length === 1) return `{Record ID (from Brand Name)} = "${clientIds[0]}"`
  const parts = clientIds.map(id => `{Record ID (from Brand Name)} = "${id}"`)
  return `OR(${parts.join(', ')})`
}

export function ActivityChart({ clientIds = [] }: { clientIds?: string[] }) {
  const { data, isLoading } = useAirtable('experiments', {
    fields: ['Launch Date', 'Test Status'],
    filterExtra: buildClientFilter(clientIds),
  })

  const months = getLast6Months()

  const chartData = months.map(({ label, year, month }) => {
    const count = (data ?? []).filter(r => {
      const raw = r.fields['Launch Date']
      if (!raw) return false
      const d = new Date(String(raw))
      return d.getFullYear() === year && d.getMonth() === month
    }).length
    return { month: label, experiments: count }
  })

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-[13px] font-semibold text-foreground">Experiments Launched</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Last 6 months</p>
      </div>
      {isLoading ? (
        <div className="h-[200px] w-full bg-muted rounded-lg animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="experimentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
                <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="experiments"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              fill="url(#experimentGradient)"
              dot={{ r: 3, fill: 'hsl(var(--foreground))', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: 'hsl(var(--foreground))', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
