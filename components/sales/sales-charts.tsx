"use client"

import { useMemo } from "react"
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
import type { DonutSlice } from "@/components/shared/donut-chart"
import { useAirtable } from "@/hooks/use-airtable"

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid hsl(220, 13%, 91%)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  backgroundColor: "white",
}

/* ── Leads by Attribution (donut) ────────────────────────────────────────── */

const SOURCE_COLORS: Record<string, string> = {
  Direct:    "hsl(195, 65%, 50%)",
  Instagram: "hsl(175, 55%, 45%)",
  Facebook:  "hsl(220, 55%, 62%)",
}

function normalizeUtmSource(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (!s) return 'Direct'
  if (s === 'ig' || s.includes('instagram')) return 'Instagram'
  if (s === 'fb' || s.includes('facebook')) return 'Facebook'
  // Capitalize first letter for any other source
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function LeadsByAttributionChart() {
  const { data: leads, isLoading } = useAirtable('leads', {
    fields: ['UTM Source'],
  })

  const chartData = useMemo((): DonutSlice[] => {
    const all = leads ?? []
    if (all.length === 0) return []

    const counts: Record<string, number> = {}
    for (const r of all) {
      const raw = String(r.fields['UTM Source'] ?? '').trim()
      const source = normalizeUtmSource(raw)
      counts[source] = (counts[source] ?? 0) + 1
    }

    const total = all.length
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 1000) / 10, // one decimal %
        color: SOURCE_COLORS[name] ?? 'hsl(220, 9%, 75%)',
      }))
      .sort((a, b) => b.value - a.value)
  }, [leads])

  if (isLoading) {
    return (
      <ContentCard
        title="Leads by Attribution"
        subtitle="Distribution of leads by UTM Source"
        className="h-full"
      >
        <div className="p-5 flex items-center justify-center h-[240px] gap-6">
          <div className="h-[160px] w-[160px] rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex flex-col gap-3">
            {[80, 56, 44].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="h-3 bg-muted animate-pulse rounded" style={{ width: w }} />
              </div>
            ))}
          </div>
        </div>
      </ContentCard>
    )
  }

  return (
    <DonutChart
      title="Leads by Attribution"
      subtitle="Distribution of leads by UTM Source"
      data={chartData}
    />
  )
}

/* ── Pipeline Count (bar) ─────────────────────────────────────────────────── */

const PIPELINE_STAGE_ORDER = [
  'Open',
  'Qualifying Call',
  'Sales Call',
  'Onboarding Call',
  'Closed',
  'Maybe',
]

export function PipelineCountChart() {
  const { data: leads, isLoading } = useAirtable('leads', {
    fields: ['Stage'],
  })

  const pipelineData = useMemo(() => {
    // Seed all known stages at 0
    const counts: Record<string, number> = {}
    for (const stage of PIPELINE_STAGE_ORDER) counts[stage] = 0

    for (const r of leads ?? []) {
      const stage = String(r.fields['Stage'] ?? '').trim()
      if (stage) counts[stage] = (counts[stage] ?? 0) + 1
    }

    // Known stages first, then any additional stages found in data
    const knownSet = new Set(PIPELINE_STAGE_ORDER)
    const extraStages = Object.keys(counts).filter(s => !knownSet.has(s))
    return [...PIPELINE_STAGE_ORDER, ...extraStages].map(stage => ({
      stage,
      count: counts[stage] ?? 0,
    }))
  }, [leads])

  return (
    <ContentCard title="Pipeline Count" subtitle="Leads by Kanban Stage">
      <div className="p-5 pt-4">
        <div className="h-[240px]">
          {isLoading ? (
            <div className="h-full flex items-end gap-3 px-4">
              {[65, 8, 12, 6, 4, 3].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-muted animate-pulse rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </ContentCard>
  )
}

/* ── Days to Close by Deal Value (area) ──────────────────────────────────── */

function formatDealValueLabel(v: number): string {
  if (v >= 1000) {
    const k = v / 1000
    return k === Math.floor(k) ? `$${k}K` : `$${k.toFixed(1)}K`
  }
  return `$${v}`
}

export function DaysToCloseChart() {
  // No fields[] restriction — 'Initial Closed Date (from Link to Client)' is a lookup field
  const { data: leads, isLoading } = useAirtable('leads', {})

  const chartData = useMemo(() => {
    const points = (leads ?? [])
      .map(r => {
        const status = String(r.fields['Lead Status'] ?? '')
        if (status !== 'Client') return null

        const createdStr = r.fields['Date Created']
        const closedRaw  = r.fields['Initial Closed Date (from Link to Client)']
        const dealRaw    = r.fields['Deal Value']

        const created   = createdStr ? new Date(String(createdStr)) : null
        const closedStr = Array.isArray(closedRaw) ? closedRaw[0] : closedRaw
        const closed    = closedStr ? new Date(String(closedStr)) : null

        const dealValue = typeof dealRaw === 'number'
          ? dealRaw
          : dealRaw
            ? parseFloat(String(dealRaw).replace(/[^0-9.]/g, ''))
            : 0

        if (!created || !closed || !dealValue) return null

        const days = Math.round(
          (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (days < 0) return null

        return { days, dealValue }
      })
      .filter((x): x is { days: number; dealValue: number } => x !== null)
      .sort((a, b) => a.dealValue - b.dealValue)

    return points.map(({ days, dealValue }) => ({
      dealValue: formatDealValueLabel(dealValue),
      days,
    }))
  }, [leads])

  return (
    <ContentCard
      title="Days to Close by Deal Value"
      subtitle="Relationship between deal value and days to conversion"
    >
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="h-3 w-48 bg-muted animate-pulse rounded" />
            </div>
          ) : chartData.length < 2 ? (
            <div className="h-full flex items-center justify-center text-[13px] text-muted-foreground">
              Not enough conversion data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ bottom: 4 }}>
                <defs>
                  <linearGradient id="fillDays" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="hsl(175, 55%, 45%)" stopOpacity={0.15} />
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
                  width={42}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value} days`, undefined]}
                />
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
          )}
        </div>
      </div>
    </ContentCard>
  )
}
