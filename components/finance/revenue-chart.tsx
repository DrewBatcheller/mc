"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface RevenueChartProps {
  dateRange?: string
}

export function RevenueChart({ dateRange = "All Time" }: RevenueChartProps) {
  const allData = [
    { month: "Oct 2022", revenue: 18200, expenses: 8400, profit: 9800 },
    { month: "Dec 2022", revenue: 22500, expenses: 11200, profit: 11300 },
    { month: "Feb 2023", revenue: 35800, expenses: 14100, profit: 21700 },
    { month: "Apr 2023", revenue: 42300, expenses: 16800, profit: 25500 },
    { month: "Jun 2023", revenue: 38100, expenses: 15200, profit: 22900 },
    { month: "Aug 2023", revenue: 55400, expenses: 19800, profit: 35600 },
    { month: "Oct 2023", revenue: 48200, expenses: 22100, profit: 26100 },
    { month: "Dec 2023", revenue: 61800, expenses: 28400, profit: 33400 },
    { month: "Feb 2024", revenue: 72100, expenses: 31200, profit: 40900 },
    { month: "Apr 2024", revenue: 68300, expenses: 27800, profit: 40500 },
    { month: "Jun 2024", revenue: 85200, expenses: 35100, profit: 50100 },
    { month: "Aug 2024", revenue: 92400, expenses: 38200, profit: 54200 },
    { month: "Oct 2024", revenue: 88100, expenses: 36800, profit: 51300 },
    { month: "Dec 2024", revenue: 105200, expenses: 42100, profit: 63100 },
    { month: "Feb 2025", revenue: 112400, expenses: 45800, profit: 66600 },
  ]

  // Filter data based on date range
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
  
  // Calculate dynamic interval based on data length
  const getInterval = () => {
    if (data.length <= 3) return 0 // Show all labels for small datasets
    if (data.length <= 6) return 1 // Show every other label
    return 2 // Show every third label for large datasets
  }

const chartColors = {
  revenue: "hsl(220, 55%, 62%)",
  expenses: "hsl(0, 50%, 65%)",
  profit: "hsl(142, 45%, 55%)",
}

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue by Month
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Monthly revenue, expenses, and net profit for the selected year
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.revenue} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={chartColors.revenue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.expenses} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={chartColors.expenses} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.profit} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={chartColors.profit} stopOpacity={0} />
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
              />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={chartColors.revenue} strokeWidth={1.5} fill="url(#fillRevenue)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke={chartColors.expenses} strokeWidth={1.5} fill="url(#fillExpenses)" />
              <Area type="monotone" dataKey="profit" name="Net Profit" stroke={chartColors.profit} strokeWidth={1.5} fill="url(#fillProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
