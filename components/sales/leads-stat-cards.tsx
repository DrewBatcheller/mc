"use client"

import { Users, Sparkles, Clock, Archive, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/shared/metric-card"

const stats = [
  { label: "Leads", value: "460", icon: Users, trend: "+12 this week" },
  { label: "Fresh", value: "80", icon: Sparkles, trend: "+5 today" },
  { label: "Stale", value: "85", icon: Clock, trend: "needs attention" },
  { label: "Old", value: "297", icon: Archive, trend: "90+ days" },
  { label: "Converted to Client", value: "3", icon: UserCheck, trend: "0.7% rate" },
]

const stages = [
  { label: "Open", count: 77, color: "bg-foreground" },
  { label: "Qualifying Call", count: 0, color: "bg-emerald-500" },
  { label: "Sales Call", count: 0, color: "bg-rose-500" },
  { label: "Onboarding Call", count: 1, color: "bg-amber-500" },
  { label: "Closed", count: 1, color: "bg-sky-500" },
  { label: "Maybe", count: 1, color: "bg-muted-foreground" },
  { label: "No Show", count: 0, color: "bg-muted-foreground/50" },
  { label: "Churned / Rejected", count: 0, color: "bg-rose-400" },
]

export function LeadsStatCards() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {stages.map((stage) => (
            <div key={stage.label} className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", stage.color)} />
                <span className="text-[13px] text-muted-foreground">{stage.label}</span>
              </div>
              <span className="text-[13px] font-semibold text-foreground tabular-nums">
                {stage.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
