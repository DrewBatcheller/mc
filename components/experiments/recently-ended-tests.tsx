"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const tests = [
  {
    name: "3-Way Path Segmentation Hero",
    client: "Cosara",
    status: "Inconclusive" as const,
    revenueAdded: "$0.0K",
  },
  {
    name: "Hygiene/Battery Rationalization Section",
    client: "Cosara",
    status: "Successful" as const,
    revenueAdded: "$0.0K",
  },
  {
    name: "Mobile Sticky Add-to-Cart Bar",
    client: "Blox Boom",
    status: "Unsuccessful" as const,
    revenueAdded: "$0.0K",
  },
  {
    name: "Exit-Intent Discount Popup",
    client: "Perfect White Tee",
    status: "Successful" as const,
    revenueAdded: "$1.2K",
  },
]

interface RecentlyEndedTestsProps {
  onExperimentClick?: (experiment: any) => void
}

// Convert test data to full experiment format for modal
function convertToExperiment(test: any) {
  return {
    name: test.name,
    description: `Recently completed test for ${test.client}`,
    status: test.status,
    placement: "Product Page",
    placementUrl: undefined,
    devices: "All Devices",
    geos: "US, CA, UK",
    variants: "50/50",
    revenue: test.revenueAdded,
    primaryGoals: ["CVR", "RPV"],
    hypothesis: `Testing ${test.name} to improve conversion rates and revenue per visitor.`,
    rationale: `Based on user behavior analysis, we hypothesized that ${test.name} would increase engagement and conversions.`,
    weighting: "50/50",
    revenueAddedMrr: test.revenueAdded,
    deployed: test.status === "Successful",
    whatHappened: test.status === "Successful" 
      ? "The test variant significantly outperformed the control, showing strong positive results across key metrics."
      : test.status === "Unsuccessful"
      ? "The test variant underperformed compared to the control, showing negative impact on conversion rates."
      : "The test results were inconclusive with no statistically significant difference between variants.",
    nextSteps: test.status === "Successful" 
      ? "Deploy winning variant to 100% of traffic and monitor performance."
      : test.status === "Unsuccessful"
      ? "Iterate on the hypothesis and design a new test approach."
      : "Extend test duration or increase traffic allocation to reach statistical significance.",
    launchDate: "2026-01-15",
    endDate: "2026-02-15",
    variantData: [
      {
        name: "Control",
        visitors: 7710,
        conversions: 420,
        cr: 5.45,
        crImprovement: 0,
        rpv: 12.34,
        rpvImprovement: 0,
        revenue: 95141,
      },
      {
        name: "Variant A",
        visitors: 7710,
        conversions: test.status === "Successful" ? 472 : test.status === "Unsuccessful" ? 385 : 435,
        cr: test.status === "Successful" ? 6.12 : test.status === "Unsuccessful" ? 4.99 : 5.64,
        crImprovement: test.status === "Successful" ? 12.3 : test.status === "Unsuccessful" ? -8.4 : 3.5,
        rpv: test.status === "Successful" ? 13.86 : test.status === "Unsuccessful" ? 11.68 : 12.56,
        rpvImprovement: test.status === "Successful" ? 12.3 : test.status === "Unsuccessful" ? -5.3 : 1.8,
        revenue: test.status === "Successful" ? 106861 : test.status === "Unsuccessful" ? 90065 : 96846,
      }
    ]
  }
}

const statusStyles = {
  Successful: "bg-emerald-50 border-emerald-200 text-emerald-700",
  Unsuccessful: "bg-rose-50 border-rose-200 text-rose-700",
  Inconclusive: "bg-amber-50 border-amber-200 text-amber-700",
}

const cardBorder = {
  Successful: "border-l-emerald-400",
  Unsuccessful: "border-l-rose-400",
  Inconclusive: "border-l-amber-400",
}

const PAGE_SIZE = 2

export function RecentlyEndedTests({ onExperimentClick }: RecentlyEndedTestsProps) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(tests.length / PAGE_SIZE)
  const visible = tests.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Recently Ended Tests</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Tests concluded in the last 30 days
        </p>
      </div>
      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        {visible.map((test) => (
          <div
            key={test.name}
            onClick={() => onExperimentClick && onExperimentClick(convertToExperiment(test))}
            className={cn(
              "rounded-lg border border-border p-4 border-l-[3px] flex flex-col gap-2 transition-colors",
              cardBorder[test.status],
              onExperimentClick && "cursor-pointer hover:bg-accent/30"
            )}
          >
            <span className="text-[13px] font-semibold text-foreground">{test.name}</span>
            <div className="flex flex-col gap-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Client:</span>
                <span className="text-foreground">{test.client}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={cn(
                    "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                    statusStyles[test.status]
                  )}
                >
                  {test.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Revenue Added:</span>
                <span className="text-foreground font-medium">{test.revenueAdded}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {page + 1} of {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          disabled={page === totalPages - 1}
          className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
