'use client'

import { useAirtable } from "@/hooks/use-airtable"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

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

export function ActivityChart() {
  const { data, isLoading } = useAirtable('experiments', {
    fields: ['Launch Date', 'Test Status'],
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
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              cursor={{ fill: 'hsl(var(--accent))' }}
            />
            <Bar dataKey="experiments" fill="hsl(var(--primary, 203 89% 53%))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
