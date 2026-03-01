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

interface RevenueChartProps {
  dateRange?: string
}

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

const chartColor = "hsl(195, 55%, 55%)"

const allRevenueData = [
  { month: "Sep 2022", revenue: 12500 },
  { month: "Dec 2022", revenue: 23000 },
  { month: "Mar 2023", revenue: 28900 },
  { month: "Jun 2023", revenue: 33100 },
  { month: "Sep 2023", revenue: 41200 },
  { month: "Dec 2023", revenue: 36500 },
  { month: "Mar 2024", revenue: 55200 },
  { month: "Jun 2024", revenue: 57800 },
  { month: "Sep 2024", revenue: 68500 },
  { month: "Dec 2024", revenue: 58200 },
  { month: "Mar 2025", revenue: 18500 },
  { month: "Jun 2025", revenue: 53800 },
  { month: "Sep 2025", revenue: 88800 },
  { month: "Dec 2025", revenue: 97900 },
]

const allAvgPerClientData = [
  { month: "Sep 2022", avg: 2500 },
  { month: "Dec 2022", avg: 3833 },
  { month: "Mar 2023", avg: 3612 },
  { month: "Jun 2023", avg: 3678 },
  { month: "Sep 2023", avg: 3433 },
  { month: "Dec 2023", avg: 3042 },
  { month: "Mar 2024", avg: 4600 },
  { month: "Jun 2024", avg: 4817 },
  { month: "Sep 2024", avg: 4893 },
  { month: "Dec 2024", avg: 4850 },
  { month: "Mar 2025", avg: 2643 },
  { month: "Jun 2025", avg: 3844 },
  { month: "Sep 2025", avg: 5553 },
  { month: "Dec 2025", avg: 6119 },
]

function getFilteredData(allData: typeof allRevenueData, dateRange: string) {
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

export function RevenueOverTimeChart({ dateRange = "All Time" }: RevenueChartProps) {
  const data = getFilteredData(allRevenueData, dateRange)
  
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
        </div>
      </div>
    </div>
  )
}

export function AvgRevenuePerClientChart({ dateRange = "All Time" }: RevenueChartProps) {
  const data = getFilteredData(allAvgPerClientData as any, dateRange)
  
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
        </div>
      </div>
    </div>
  )
}
