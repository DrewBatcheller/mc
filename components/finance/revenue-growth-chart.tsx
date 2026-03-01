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

interface RevenueGrowthChartProps {
  dateRange?: string
}

export function RevenueGrowthChart({ dateRange = "All Time" }: RevenueGrowthChartProps) {
  const allData = [
    { month: "Oct 2022", growth: 2100 },
    { month: "Dec 2022", growth: 4300 },
    { month: "Feb 2023", growth: 13300 },
    { month: "Apr 2023", growth: 6500 },
    { month: "Jun 2023", growth: -4200 },
    { month: "Aug 2023", growth: 17300 },
    { month: "Oct 2023", growth: -7200 },
    { month: "Dec 2023", growth: 13600 },
    { month: "Feb 2024", growth: 10300 },
    { month: "Apr 2024", growth: -3800 },
    { month: "Jun 2024", growth: 16900 },
    { month: "Aug 2024", growth: 7200 },
    { month: "Oct 2024", growth: -4300 },
    { month: "Dec 2024", growth: 17100 },
    { month: "Feb 2025", growth: 7200 },
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
          Month-over-month revenue change in dollars for the selected year
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 8%, 46%)" }}
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
        </div>
      </div>
    </div>
  )
}
