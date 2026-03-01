"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

const topClients = [
  { name: "Goose Creek Candles", revenue: 172600 },
  { name: "Primal Queen", revenue: 136189 },
  { name: "Blox Boom", revenue: 80542 },
  { name: "Perfect White Tee", revenue: 76560 },
  { name: "Kitty Spout", revenue: 61000 },
]

const mrrData = [
  { name: "MRR", value: 88.3, color: "hsl(195, 65%, 48%)" },
  { name: "Upsell", value: 0, color: "hsl(220, 55%, 62%)" },
  { name: "Other", value: 11.7, color: "hsl(220, 13%, 82%)" },
]

const catColors = [
  "hsl(195, 65%, 48%)",
  "hsl(220, 55%, 62%)",
  "hsl(142, 45%, 55%)",
  "hsl(38, 70%, 55%)",
  "hsl(0, 50%, 65%)",
  "hsl(262, 45%, 58%)",
  "hsl(330, 45%, 55%)",
  "hsl(170, 45%, 50%)",
  "hsl(50, 60%, 50%)",
  "hsl(10, 55%, 55%)",
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function TopClientsByRevenue({ dateRange = "All Time" }: { dateRange?: string }) {
  const getMultiplier = () => {
    if (dateRange === "All Time") return 1
    if (dateRange === "Last Month") return 0.08
    if (dateRange === "Last 3 Months") return 0.22
    if (dateRange === "Last 6 Months") return 0.45
    return 1
  }
  
  const multiplier = getMultiplier()
  const filteredClients = topClients.map(c => ({ ...c, revenue: Math.round(c.revenue * multiplier) }))

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Top Clients by Revenue</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Revenue per client</p>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {filteredClients.map((client) => (
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
  const { data: rawRevenue } = useAirtable('revenue', {
    fields: ['Amount USD', 'Category'],
  })

  const { data: rawCategories } = useAirtable('revenue-categories', {
    fields: ['Category'],
  })

  const categoryList = useMemo(() => {
    if (!rawCategories) return []
    return rawCategories.map(r => String(r.fields['Category'] ?? '')).filter(Boolean)
  }, [rawCategories])

  const categoryTotals = useMemo(() => {
    if (!rawRevenue) return []
    const totals: Record<string, number> = {}
    for (const r of rawRevenue) {
      const cat = String(r.fields['Category'] ?? 'Other')
      totals[cat] = (totals[cat] ?? 0) + parseCurrency(r.fields['Amount USD'] as string)
    }
    const cats = categoryList.length > 0 ? categoryList : Object.keys(totals)
    return cats
      .filter(cat => (totals[cat] ?? 0) > 0)
      .map(cat => ({ name: cat, revenue: totals[cat] ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [rawRevenue, categoryList])

  const getMultiplier = () => {
    if (dateRange === "All Time") return 1
    if (dateRange === "Last Month") return 0.08
    if (dateRange === "Last 3 Months") return 0.22
    if (dateRange === "Last 6 Months") return 0.45
    return 1
  }

  const multiplier = getMultiplier()
  const displayData = categoryTotals.map(c => ({ ...c, revenue: Math.round(c.revenue * multiplier) }))

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Revenue by Category</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Category breakdown</p>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {displayData.map((cat) => (
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
                data={mrrData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={1}
                dataKey="value"
                stroke="white"
                strokeWidth={1.5}
              >
                {mrrData.map((entry, index) => (
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



