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
import { DonutChart } from "@/components/shared/donut-chart"

const allBalanceData = [
  { month: "Oct 2022", balance: 1165, yearIndex: 2022 },
  { month: "Dec 2022", balance: 4783, yearIndex: 2022 },
  { month: "Feb 2023", balance: 9099, yearIndex: 2023 },
  { month: "Apr 2023", balance: 14063, yearIndex: 2023 },
  { month: "Jun 2023", balance: -28500, yearIndex: 2023 },
  { month: "Aug 2023", balance: -12300, yearIndex: 2023 },
  { month: "Oct 2023", balance: 5200, yearIndex: 2023 },
  { month: "Dec 2023", balance: 19200, yearIndex: 2023 },
  { month: "Feb 2024", balance: 35800, yearIndex: 2024 },
  { month: "Apr 2024", balance: 48308, yearIndex: 2024 },
  { month: "Jun 2024", balance: 52100, yearIndex: 2024 },
  { month: "Aug 2024", balance: 58400, yearIndex: 2024 },
  { month: "Oct 2024", balance: 72300, yearIndex: 2024 },
  { month: "Dec 2024", balance: 78500, yearIndex: 2024 },
  { month: "Feb 2025", balance: 85100, yearIndex: 2025 },
  { month: "Apr 2025", balance: 88400, yearIndex: 2025 },
  { month: "Jun 2025", balance: 92600, yearIndex: 2025 },
  { month: "Aug 2025", balance: 95300, yearIndex: 2025 },
  { month: "Oct 2025", balance: 102700, yearIndex: 2025 },
  { month: "Dec 2025", balance: 105625, yearIndex: 2025 },
]

const allTransactionTypeData = [
  { name: "Emergency Reserve Allocation", value: 94.2, yearIndex: 2022 },
  { name: "Internal Team Salary", value: 5.8, yearIndex: 2022 },
  { name: "Emergency Reserve Allocation", value: 88.5, yearIndex: 2023 },
  { name: "Internal Team Salary", value: 11.5, yearIndex: 2023 },
  { name: "Emergency Reserve Allocation", value: 92.1, yearIndex: 2024 },
  { name: "Internal Team Salary", value: 7.9, yearIndex: 2024 },
  { name: "Emergency Reserve Allocation", value: 96.0, yearIndex: 2025 },
  { name: "Internal Team Salary", value: 4.0, yearIndex: 2025 },
]

const pieColors = ["hsl(210, 65%, 50%)", "hsl(175, 55%, 48%)"]

function formatDollar(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

const chartColor = "hsl(195, 65%, 48%)"

export function ReserveBalanceChart({ year = "all" }: { year?: string }) {
  const getFilteredData = () => {
    if (year === "all") return allBalanceData
    const yearNum = parseInt(year)
    return allBalanceData.filter(d => d.yearIndex === yearNum)
  }

  const data = getFilteredData()

  const getInterval = () => {
    if (data.length <= 3) return 0
    if (data.length <= 6) return 1
    return 2
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Reserve Account Balance Growth Over Time
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Balance trend over time
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillReserveBalance" x1="0" y1="0" x2="0" y2="1">
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
                interval={getInterval()}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dx={-4}
                width={50}
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={chartColor}
                strokeWidth={1.5}
                fill="url(#fillReserveBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function ReserveTransactionTypePie({ year = "all" }: { year?: string }) {
  const getFilteredData = () => {
    if (year === "all") return allTransactionTypeData.slice(0, 2)
    const yearNum = parseInt(year)
    const filtered = allTransactionTypeData.filter(d => d.yearIndex === yearNum)
    return filtered.length > 0 ? filtered : allTransactionTypeData.slice(0, 2)
  }

  const data = getFilteredData().map((d, i) => ({
    name: d.name,
    value: d.value,
    color: pieColors[i % pieColors.length],
  }))

  return (
    <DonutChart
      title="Reserve Transactions by Type"
      subtitle="Transaction breakdown"
      data={data}
    />
  )
}
