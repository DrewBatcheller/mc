"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface RevenueVsExpensesChartProps {
  month?: string
}

const data = [
  { name: "Revenue", amount: 23000 },
  { name: "Expenses", amount: 7446 },
]

const barColors: Record<string, string> = {
  Revenue: "hsl(195, 55%, 55%)",
  Expenses: "hsl(0, 50%, 62%)",
}

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

export function RevenueVsExpensesChart({ month = "2025-01" }: RevenueVsExpensesChartProps) {
  // Sample data for different months
  const monthlyData: Record<string, { revenue: number; expenses: number }> = {
    "2025-01": { revenue: 23000, expenses: 7446 },
    "2025-02": { revenue: 25400, expenses: 8100 },
    "2025-03": { revenue: 28900, expenses: 8800 },
    "2025-04": { revenue: 22100, expenses: 7200 },
    "2025-05": { revenue: 31200, expenses: 9400 },
    "2025-06": { revenue: 27800, expenses: 8600 },
  }

  const monthData = monthlyData[month] || monthlyData["2025-01"]
  const chartData = [
    { name: "Revenue", amount: monthData.revenue },
    { name: "Expenses", amount: monthData.expenses },
  ]

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue vs Expenses
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Comparison of total revenue and expenses for the selected month
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={80}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 8%, 46%)" }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dx={-4}
                width={48}
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
              <Bar
                dataKey="amount"
                name="Amount"
                radius={[6, 6, 0, 0]}
                fill="hsl(195, 55%, 55%)"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const fill = barColors[props.payload?.name] || "hsl(195, 55%, 55%)"
                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      rx={6}
                      fill={fill}
                    />
                  )
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
