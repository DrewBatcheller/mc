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
import { ContentCard } from "@/components/shared/content-card"

const data = [
  { month: "Jul", experiments: 42 },
  { month: "Aug", experiments: 58 },
  { month: "Sep", experiments: 65 },
  { month: "Oct", experiments: 78 },
  { month: "Nov", experiments: 52 },
  { month: "Dec", experiments: 45 },
]

export function ActivityChart() {
  return (
    <ContentCard
      title="Experiment Activity"
      subtitle="Experiments launched over the last 6 months"
    >
      <div className="p-5 pt-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 14%, 10%)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="hsl(220, 14%, 10%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(220, 13%, 91%)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 8%, 46%)" }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 8%, 46%)" }}
                dx={-8}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                itemStyle={{ color: "hsl(220, 14%, 10%)" }}
              />
              <Area
                type="monotone"
                dataKey="experiments"
                stroke="hsl(220, 14%, 10%)"
                strokeWidth={1.5}
                fill="url(#fillExp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ContentCard>
  )
}
