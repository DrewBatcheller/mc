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

interface NetProfitChartProps {
  dateRange?: string
}

export function NetProfitChart({ dateRange = "All Time" }: NetProfitChartProps) {
  const allData = [
    { month: "Oct 2022", profit: 9800 },
    { month: "Dec 2022", profit: 11300 },
    { month: "Feb 2023", profit: 21700 },
    { month: "Apr 2023", profit: 25500 },
    { month: "Jun 2023", profit: 22900 },
    { month: "Aug 2023", profit: 45600 },
    { month: "Oct 2023", profit: 36100 },
    { month: "Dec 2023", profit: 53400 },
    { month: "Feb 2024", profit: 60900 },
    { month: "Apr 2024", profit: 70500 },
    { month: "Jun 2024", profit: 80100 },
    { month: "Aug 2024", profit: 94200 },
    { month: "Oct 2024", profit: 71300 },
    { month: "Dec 2024", profit: 63100 },
    { month: "Feb 2025", profit: 66600 },
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
          Net Profit Trend
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Monthly net profit values for the selected year
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillNetProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0} />
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Net Profit"]}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(220, 70%, 50%)"
                strokeWidth={1.5}
                fill="url(#fillNetProfit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
