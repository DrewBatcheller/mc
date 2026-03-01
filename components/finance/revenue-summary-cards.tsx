"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const topClients = [
  { name: "Goose Creek Candles", revenue: 172600 },
  { name: "Primal Queen", revenue: 136189 },
  { name: "Blox Boom", revenue: 80542 },
  { name: "Perfect White Tee", revenue: 76560 },
  { name: "Kitty Spout", revenue: 61000 },
]

const revenueByCategory = [
  { name: "CRO Retainer", revenue: 1244996 },
  { name: "Affiliate Software", revenue: 8042 },
  { name: "Shopify Design & Development", revenue: 115258 },
  { name: "CRO Course", revenue: 5400 },
  { name: "Development Retainer", revenue: 66600 },
]

const mrrData = [
  { name: "MRR", value: 88.3, color: "hsl(195, 65%, 48%)" },
  { name: "Upsell", value: 0, color: "hsl(220, 55%, 62%)" },
  { name: "Other", value: 11.7, color: "hsl(220, 13%, 82%)" },
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
  // Filter client revenue based on dateRange (using multipliers for sample data)
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
        <h2 className="text-sm font-semibold text-foreground">
          Top Clients by Revenue
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Revenue per client
        </p>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {filteredClients.map((client) => (
            <div key={client.name} className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">
                {client.name}
              </span>
              <span className="text-[13px] tabular-nums text-foreground">
                {formatCurrency(client.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RevenueByCategoryList({ dateRange = "All Time" }: { dateRange?: string }) {
  // Filter category revenue based on dateRange
  const getMultiplier = () => {
    if (dateRange === "All Time") return 1
    if (dateRange === "Last Month") return 0.08
    if (dateRange === "Last 3 Months") return 0.22
    if (dateRange === "Last 6 Months") return 0.45
    return 1
  }
  
  const multiplier = getMultiplier()
  const filteredCategories = revenueByCategory.map(c => ({ ...c, revenue: Math.round(c.revenue * multiplier) }))

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue by Category
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Category breakdown
        </p>
      </div>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          {filteredCategories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium text-foreground">
                {cat.name}
              </span>
              <span className="text-[13px] tabular-nums text-foreground shrink-0">
                {formatCurrency(cat.revenue)}
              </span>
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
        <h2 className="text-sm font-semibold text-foreground">
          MRR v Upsell v Other
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Revenue type distribution
        </p>
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
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name}{" "}
                <span className="text-foreground font-medium">
                  {entry.value}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
