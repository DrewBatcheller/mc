"use client"

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

/**
 * Empty state component for charts when no data is available
 */
export function EmptyChart({ type = "pie", height = 280 }: { type?: "line" | "pie" | "bar"; height?: number }) {
  const emptyData = [{ value: 100 }]

  return (
    <div className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={emptyData} cx="50%" cy="50%" innerRadius={type === "pie" ? 40 : 0} outerRadius={type === "pie" ? 80 : 100} fill="#e5e7eb" dataKey="value">
            <Cell fill="#d1d5db" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No data for selected time period</p>
        </div>
      </div>
    </div>
  )
}
