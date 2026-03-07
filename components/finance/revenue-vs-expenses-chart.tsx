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
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

interface RevenueVsExpensesChartProps {
  month?: string
}

const barColors: Record<string, string> = {
  Revenue: "hsl(195, 55%, 55%)",
  Expenses: "hsl(0, 50%, 62%)",
}

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

export function RevenueVsExpensesChart({ month = "2025-01" }: RevenueVsExpensesChartProps) {
  const { data: revenue, isLoading: revLoad } = useAirtable('revenue', {
    fields: ['Amount USD', 'Date'],
  })

  const { data: expenses, isLoading: expLoad } = useAirtable('expenses', {
    fields: ['Expense', 'Date'],
  })

  const chartData = useMemo(() => {
    const [year, monthNum] = month.split('-')

    // Filter revenue for selected month
    const monthRevenue = (revenue ?? []).filter(r => {
      const d = r.fields['Date'] as string
      if (!d) return false
      const date = new Date(d)
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(monthNum) - 1
    })

    // Filter expenses for selected month
    const monthExpenses = (expenses ?? []).filter(r => {
      const d = r.fields['Date'] as string
      if (!d) return false
      const date = new Date(d)
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(monthNum) - 1
    })

    const totalRevenue = monthRevenue.reduce((sum, r) => sum + parseCurrency(r.fields['Amount USD'] as string), 0)
    const totalExpenses = monthExpenses.reduce((sum, r) => sum + parseCurrency(r.fields['Expense'] as string), 0)

    return [
      { name: "Revenue", amount: totalRevenue },
      { name: "Expenses", amount: totalExpenses },
    ]
  }, [revenue, expenses, month])

  const isLoading = revLoad || expLoad

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
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}
