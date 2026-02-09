"use client"

import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts"
import { EmptyChart } from "./financial/empty-chart"

interface LineChartConfig {
  dataKey: string
  stroke?: string
  name?: string
}

interface DefaultLineChartProps {
  data: any[]
  lines: LineChartConfig[]
  xAxisKey?: string
  xAxisLabel?: string
  yAxisLabel?: string
  yAxisFormatter?: (value: number) => string
  tooltipFormatter?: (value: number) => string
  height?: number
  isEmpty?: boolean
}

const DEFAULT_COLORS = [
  "#0891b2", "#06b6d4", "#0ea5e9", "#0d9488", "#10b981", 
  "#14b8a6", "#f43f5e", "#ec4899", "#a855f7", "#8b5cf6"
]

export function DefaultLineChart({
  data,
  lines,
  xAxisKey = "month",
  xAxisLabel = "Month",
  yAxisLabel = "Value",
  yAxisFormatter = (value) => `$${(value / 1000).toFixed(0)}k`,
  tooltipFormatter = (value) => `$${Number(value).toFixed(0)}`,
  height = 300,
  isEmpty = false,
}: DefaultLineChartProps) {
  if (isEmpty || !data || data.length === 0) {
    return <EmptyChart height={height} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
        <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
        <XAxis 
          dataKey={xAxisKey}
          angle={-45}
          textAnchor="end"
          tick={{ fontSize: 10, fill: "#666" }}
          height={55}
          label={{ value: xAxisLabel, position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
        />
        <YAxis 
          tick={{ fontSize: 10, fill: "#666" }}
          width={45}
          tickFormatter={yAxisFormatter}
          label={{ value: yAxisLabel, angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
        />
        <Tooltip 
          formatter={tooltipFormatter}
          contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }}
        />
        {lines.map((line, idx) => (
          <Line
            key={line.dataKey}
            type="linear"
            dataKey={line.dataKey}
            stroke={line.stroke || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
            strokeWidth={1.5}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
