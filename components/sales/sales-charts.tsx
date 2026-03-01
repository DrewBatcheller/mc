"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { ContentCard } from "@/components/shared/content-card"
import { DonutChart } from "@/components/shared/donut-chart"

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid hsl(220, 13%, 91%)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  backgroundColor: "white",
}

/* ── Leads by Attribution (donut) ── */

const attributionData = [
  { name: "Direct", value: 85.7, color: "hsl(195, 65%, 50%)" },
  { name: "Instagram", value: 7.3, color: "hsl(175, 55%, 45%)" },
  { name: "Facebook", value: 6.9, color: "hsl(220, 55%, 62%)" },
]

export function LeadsByAttributionChart() {
  return (
    <DonutChart
      title="Leads by Attribution"
      subtitle="Distribution of leads by UTM Source"
      data={attributionData}
    />
  )
}

/* ── Pipeline Count (bar) ── */

const pipelineData = [
  { stage: "Open", count: 77 },
  { stage: "Qualifying Call", count: 0 },
  { stage: "Sales Call", count: 1 },
  { stage: "Onboarding Call", count: 1 },
  { stage: "Closed", count: 1 },
]

export function PipelineCountChart() {
  return (
    <ContentCard
      title="Pipeline Count"
      subtitle="Leads by Kanban Stage"
    >
      <div className="p-5 pt-4">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData} margin={{ left: 0, right: 8, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(220, 13%, 91%)"
              />
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dy={8}
                angle={-20}
                textAnchor="end"
                interval={0}
                height={56}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dx={-4}
                width={36}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                name="Count"
                fill="hsl(195, 65%, 50%)"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ContentCard>
  )
}

/* ── Days to Close by Deal Value (area / line) ── */

const daysToCloseData = [
  { dealValue: "$1K", days: 280 },
  { dealValue: "$2K", days: 260 },
  { dealValue: "$3K", days: 200 },
  { dealValue: "$4K", days: 170 },
  { dealValue: "$5K", days: 140 },
  { dealValue: "$6K", days: 115 },
  { dealValue: "$7K", days: 95 },
  { dealValue: "$8K", days: 80 },
  { dealValue: "$10K", days: 65 },
  { dealValue: "$12K", days: 50 },
  { dealValue: "$15K", days: 42 },
  { dealValue: "$18K", days: 38 },
  { dealValue: "$20K", days: 35 },
  { dealValue: "$25K", days: 30 },
]

export function DaysToCloseChart() {
  return (
    <ContentCard
      title="Days to Close by Deal Value"
      subtitle="Relationship between deal value and days to conversion"
    >
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daysToCloseData} margin={{ bottom: 4 }}>
              <defs>
                <linearGradient id="fillDays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(175, 55%, 45%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(175, 55%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(220, 13%, 91%)"
              />
              <XAxis
                dataKey="dealValue"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dy={8}
                label={{
                  value: "Deal Value",
                  position: "insideBottom",
                  offset: -4,
                  style: { fontSize: 11, fill: "hsl(220, 8%, 46%)" },
                }}
                height={48}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dx={-4}
                width={36}
                label={{
                  value: "Days to Close",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  style: { fontSize: 11, fill: "hsl(220, 8%, 46%)" },
                }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} days`, undefined]} />
              <Area
                type="monotone"
                dataKey="days"
                name="Days to Close"
                stroke="hsl(175, 55%, 45%)"
                strokeWidth={1.5}
                fill="url(#fillDays)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ContentCard>
  )
}
