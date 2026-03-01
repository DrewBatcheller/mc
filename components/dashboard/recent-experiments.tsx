"use client"

import { cn } from "@/lib/utils"
import { ContentCard } from "@/components/shared/content-card"

type ExperimentStatus = "Successful" | "Unsuccessful" | "Pending"

interface Experiment {
  name: string
  client: string
  date: string
  status: ExperimentStatus
}

const experiments: Experiment[] = [
  {
    name: "Tiered Rewards Gamification",
    client: "Cosara",
    date: "Dec 10",
    status: "Unsuccessful",
  },
  {
    name: "Testimonial Copy Adjustment",
    client: "Cosara",
    date: "Dec 10",
    status: "Successful",
  },
  {
    name: "Social Proof Section Placement",
    client: "Cosara",
    date: "Dec 10",
    status: "Unsuccessful",
  },
  {
    name: "Mobile Navigation Category Tabs",
    client: "Dr Woof Apparel",
    date: "-",
    status: "Pending",
  },
  {
    name: "Collection Page Visual Navigation Bubbles",
    client: "Dr Woof Apparel",
    date: "-",
    status: "Pending",
  },
]

const statusStyles: Record<ExperimentStatus, string> = {
  Successful: "bg-emerald-50 text-emerald-700",
  Unsuccessful: "bg-red-50 text-red-600",
  Pending: "bg-amber-50 text-amber-600",
}

export function RecentExperiments() {
  return (
    <ContentCard
      title="Recent Experiments"
    >
      <div className="divide-y divide-border">
        {experiments.map((experiment, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/40 transition-colors"
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-[13px] font-medium text-foreground truncate">
                {experiment.name}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {experiment.client}
                {experiment.date !== "-" && (
                  <span className="text-border mx-1.5">{"/"}</span>
                )}
                {experiment.date !== "-" && experiment.date}
              </span>
            </div>
            <span
              className={cn(
                "shrink-0 ml-4 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                statusStyles[experiment.status]
              )}
            >
              {experiment.status}
            </span>
          </div>
        ))}
      </div>
    </ContentCard>
  )
}
