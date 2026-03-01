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

interface MrrGrowthChartProps {
  dateRange?: string
}

export function MrrGrowthChart({ dateRange = "All Time" }: MrrGrowthChartProps) {
  const allData = [
    { month: "Oct 2022", mrr: 12200 },
    { month: "Dec 2022", mrr: 18500 },
    { month: "Feb 2023", mrr: 22300 },
    { month: "Apr 2023", mrr: 28800 },
    { month: "Jun 2023", mrr: 25400 },
    { month: "Aug 2023", mrr: 42100 },
    { month: "Oct 2023", mrr: 38200 },
    { month: "Dec 2023", mrr: 51200 },
    { month: "Feb 2024", mrr: 56800 },
    { month: "Apr 2024", mrr: 62300 },
    { month: "Jun 2024", mrr: 71200 },
    { month: "Aug 2024", mrr: 82400 },
    { month: "Oct 2024", mrr: 78100 },
    { month: "Dec 2024", mrr: 91200 },
    { month: "Feb 2025", mrr: 88400 },
  ]

  const getFilteredData = () => {
    if (dateRange === "All Time") return allData
    if (dateRange === "Last Month") return allData.slice(-1)
    if (dateRange === "Last 3 Months") return allData.slice(-3)
    if (dateRange === "Last 6 Months") return allData.slice(-6)
    if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      return allData.filter(d => parseInt(d.month.split(" ")[1]) === year)
    }
    return allData
  }

  const data = getFilteredData()

  const getInterval = () => {
    if (data.length <= 3) return 0
    if (data.length <= 6) return 1
    return 2
  }

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          MRR Growth by Month
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Monthly Recurring Revenue trend for the selected year
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(262, 52%, 47%)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(262, 52%, 47%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dy={8}
                interval={getInterval()}
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, "MRR"]}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="hsl(262, 52%, 47%)"
                strokeWidth={1.5}
                fill="url(#fillMrr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
