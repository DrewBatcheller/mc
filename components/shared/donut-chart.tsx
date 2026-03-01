"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ContentCard } from "@/components/shared/content-card"

export interface DonutSlice {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; payload: DonutSlice }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div
      style={{
        fontSize: 12,
        borderRadius: 8,
        border: "1px solid hsl(220, 13%, 91%)",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
        backgroundColor: "white",
        padding: "6px 10px",
      }}
    >
      <span className="font-medium" style={{ color: "hsl(220, 9%, 20%)" }}>
        {name}:
      </span>{" "}
      <span style={{ color: "hsl(220, 8%, 46%)" }}>{value}%</span>
    </div>
  )
}

interface DonutChartProps {
  title: string
  subtitle?: string
  data: DonutSlice[]
}

export function DonutChart({ title, subtitle, data }: DonutChartProps) {
  return (
    <ContentCard title={title} subtitle={subtitle} className="h-full">
      <div className="p-5 flex flex-1 flex-row items-center gap-6">
        {/* Donut */}
        <div className="h-[200px] w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="white"
                strokeWidth={2}
              >
                {data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 min-w-0">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-foreground leading-tight">
                  {entry.name}
                </span>
                <span className="text-[12px] text-muted-foreground">{entry.value}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ContentCard>
  )
}
