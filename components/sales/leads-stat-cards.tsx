"use client"

import { useMemo } from "react"
import { Users, Sparkles, Clock, Archive, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"

const PIPELINE_STAGES = [
  { label: "Open",               color: "bg-foreground" },
  { label: "Qualifying Call",    color: "bg-violet-500" },
  { label: "Sales Call",         color: "bg-amber-500" },
  { label: "Onboarding Call",    color: "bg-emerald-500" },
  { label: "Closed",             color: "bg-sky-500" },
  { label: "Maybe",              color: "bg-muted-foreground" },
  { label: "No Show",            color: "bg-muted-foreground/50" },
  { label: "Churned / Rejected", color: "bg-rose-400" },
]

function daysSince(dateStr: string): number {
  const created = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  created.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
}

export function LeadsStatCards() {
  const { data: leads, isLoading } = useAirtable('leads', {
    fields: ['Date Created', 'Lead Status', 'Stage'],
  })

  const { stats, stageCounts } = useMemo(() => {
    const all = leads ?? []
    let fresh = 0, stale = 0, old = 0, converted = 0

    for (const r of all) {
      const status = String(r.fields['Lead Status'] ?? '')
      if (status === 'Client') {
        converted++
        continue
      }
      const dateStr = r.fields['Date Created'] as string
      if (!dateStr) { old++; continue }
      const age = daysSince(dateStr)
      if (age < 60)       fresh++
      else if (age < 180) stale++
      else                old++
    }

    // Count per Kanban stage
    const counts: Record<string, number> = {}
    for (const { label } of PIPELINE_STAGES) counts[label] = 0
    for (const r of all) {
      const stage = String(r.fields['Stage'] ?? '').trim()
      if (stage) counts[stage] = (counts[stage] ?? 0) + 1
    }

    return {
      stats: { total: all.length, fresh, stale, old, converted },
      stageCounts: counts,
    }
  }, [leads])

  const metricCards = [
    { label: "Leads",               value: isLoading ? '—' : String(stats.total),     icon: Users },
    { label: "Fresh",               value: isLoading ? '—' : String(stats.fresh),     icon: Sparkles,  trend: "< 60 days old" },
    { label: "Stale",               value: isLoading ? '—' : String(stats.stale),     icon: Clock,     trend: "60–180 days old" },
    { label: "Old",                 value: isLoading ? '—' : String(stats.old),       icon: Archive,   trend: "180+ days old" },
    { label: "Converted to Client", value: isLoading ? '—' : String(stats.converted), icon: UserCheck },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.label} className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", stage.color)} />
                <span className="text-[13px] text-muted-foreground">{stage.label}</span>
              </div>
              <span className="text-[13px] font-semibold text-foreground tabular-nums">
                {isLoading ? '—' : (stageCounts[stage.label] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
