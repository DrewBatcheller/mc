"use client"

import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, Layers, FlaskConical, Zap, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"

/* ── Types ── */
interface Experiment {
  name: string
  description: string
  status: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: string
  revenue: string
  primaryGoals?: string[]
  hypothesis?: string
  rationale?: string
  weighting?: string
  revenueAddedMrr?: string
  nextSteps?: string
  variantData?: {
    name: string
    status?: string
    trafficPercent?: number
    visitors: number
    conversions: number
    cr?: number
    crPercent?: number
    crImprovement: number
    crConfidence?: number
    rpv: number
    rpvImprovement: number
    rpvConfidence?: number
    revenue: number
    revenueImprovement: number
    appv?: number
    appvImprovement?: number
  }[]
  launchDate?: string
  endDate?: string
  deployed?: boolean
  whatHappened?: string
  [key: string]: unknown
}

interface Batch {
  client: string
  launchDate: string
  finishDate: string
  status: string
  tests: number
  revenueImpact: string
  experiments: Experiment[]
}

/* ── Data (Vita Hustle only) ── */
const statusStyles: Record<string, string> = {
  "In Progress": "bg-sky-50 text-sky-700",
  Live: "bg-emerald-50 text-emerald-700",
  Mixed: "bg-amber-50 text-amber-700",
  Pending: "bg-accent text-muted-foreground",
  "No Tests": "bg-accent text-muted-foreground",
  Unsuccessful: "bg-rose-50 text-rose-700",
  Blocked: "bg-red-50 text-red-700",
  Successful: "bg-emerald-50 text-emerald-700",
  Inconclusive: "bg-amber-50 text-amber-700",
}

const mapBatchStatus = (status: string): "Pending" | "In Progress" | "Live" | "Completed" => {
  const s = status.toLowerCase()
  if (s === "in progress") return "In Progress"
  if (s === "live") return "Live"
  if (s === "completed" || s === "successful" || s === "unsuccessful" || s === "inconclusive" || s === "mixed") return "Completed"
  return "Pending"
}

const vitaHustleBatches: Batch[] = [
  {
    client: "Vita Hustle",
    launchDate: "Jan 15, 2026",
    finishDate: "Jan 29, 2026",
    status: "Mixed",
    tests: 2,
    revenueImpact: "$19,027",
    experiments: [
      {
        name: "Subscription Savings Calculator",
        description: "Interactive savings comparison tool showing cost benefits of subscribing vs one-time purchase.",
        status: "Successful",
        placement: "Product Page",
        devices: "All Devices",
        geos: "US",
        variants: "2",
        revenue: "$19,027",
        hypothesis: "An interactive savings calculator will increase subscription uptake by clearly demonstrating long-term value.",
        rationale: "Customers frequently abandoned subscription options without understanding the savings. A dynamic calculator removes cognitive friction.",
        weighting: "50/50",
        launchDate: "Jan 15, 2026",
        endDate: "Jan 22, 2026",
        deployed: true,
        whatHappened: "The calculator resonated strongly with returning visitors, lifting subscription conversion rate significantly.",
        nextSteps: "Expand to bundle pages and email re-engagement campaigns.",
        revenueAddedMrr: "$19,027",
        variantData: [
          { name: "Control", trafficPercent: 50, visitors: 8420, conversions: 421, revenue: 30200, revenueImprovement: 0, crPercent: 5.0, crImprovement: 0, crConfidence: 0, rpv: 3.59, rpvImprovement: 0, appv: 71.73, appvImprovement: 0 },
          { name: "Savings Calculator", trafficPercent: 50, visitors: 8380, conversions: 537, revenue: 49227, revenueImprovement: 63.0, crPercent: 6.41, crImprovement: 28.2, crConfidence: 96, rpv: 5.87, rpvImprovement: 63.5, rpvConfidence: 95, appv: 91.67, appvImprovement: 27.8 },
        ],
      },
      {
        name: "Reviews Section Redesign",
        description: "New reviews layout featuring photo gallery, verified badge prominences, and star distribution chart.",
        status: "Inconclusive",
        placement: "Product Page",
        devices: "All Devices",
        geos: "US",
        variants: "2",
        revenue: "$0",
        hypothesis: "A richer reviews section with photos will increase purchase confidence and conversion rate.",
        rationale: "Competitive analysis showed photo-forward reviews performing well in the supplement space.",
        weighting: "50/50",
        launchDate: "Jan 15, 2026",
        endDate: "Jan 29, 2026",
        deployed: false,
        whatHappened: "Positive engagement signals but insufficient statistical confidence to declare a winner after the full run.",
        nextSteps: "Re-test with a focused hypothesis on photo reviews only, isolating the variable.",
        revenueAddedMrr: "$0",
        variantData: [
          { name: "Control", trafficPercent: 50, visitors: 8310, conversions: 499, revenue: 35800, revenueImprovement: 0, crPercent: 6.0, crImprovement: 0, crConfidence: 0, rpv: 4.31, rpvImprovement: 0, appv: 71.74, appvImprovement: 0 },
          { name: "Redesigned Reviews", trafficPercent: 50, visitors: 8290, conversions: 515, revenue: 37100, revenueImprovement: 3.6, crPercent: 6.21, crImprovement: 3.5, crConfidence: 61, rpv: 4.47, rpvImprovement: 3.7, rpvConfidence: 58, appv: 72.04, appvImprovement: 0.4 },
        ],
      },
    ],
  },
  {
    client: "Vita Hustle",
    launchDate: "Nov 19, 2025",
    finishDate: "Dec 3, 2025",
    status: "Unsuccessful",
    tests: 1,
    revenueImpact: "$0",
    experiments: [
      {
        name: "Popup Nutrition Facts",
        description: "Nutritional info popup on product cards triggered on hover/tap.",
        status: "Unsuccessful",
        placement: "Collection Page",
        devices: "All Devices",
        geos: "US",
        variants: "2",
        revenue: "$0",
        hypothesis: "Surfacing nutrition facts inline on collection cards will reduce back-and-forth to PDP and improve add-to-cart rate.",
        rationale: "Customer surveys indicated nutrition transparency as a top purchase driver.",
        weighting: "50/50",
        launchDate: "Nov 19, 2025",
        endDate: "Dec 3, 2025",
        deployed: false,
        whatHappened: "Popup introduced visual clutter and reduced scroll depth. Users ignored it on mobile, causing slight drop in ATC rate.",
        nextSteps: "Consider an inline expandable row rather than a popup overlay.",
        revenueAddedMrr: "$0",
        variantData: [
          { name: "Control", trafficPercent: 50, visitors: 11200, conversions: 896, revenue: 64200, revenueImprovement: 0, crPercent: 8.0, crImprovement: 0, crConfidence: 0, rpv: 5.73, rpvImprovement: 0, appv: 71.65, appvImprovement: 0 },
          { name: "Nutrition Popup", trafficPercent: 50, visitors: 11150, conversions: 846, revenue: 60700, revenueImprovement: -5.45, crPercent: 7.59, crImprovement: -5.1, crConfidence: 88, rpv: 5.44, rpvImprovement: -5.1, rpvConfidence: 85, appv: 71.75, appvImprovement: 0.1 },
        ],
      },
    ],
  },
]

const overviewStats = [
  { label: "Total Batches", value: String(vitaHustleBatches.length), icon: Layers },
  { label: "Total Experiments", value: String(vitaHustleBatches.reduce((s, b) => s + b.experiments.length, 0)), icon: FlaskConical },
  { label: "Live Now", value: String(vitaHustleBatches.filter(b => b.status === "Live").length), icon: Zap },
  { label: "Successful", value: String(vitaHustleBatches.flatMap(b => b.experiments).filter(e => e.status === "Successful").length), icon: CheckCircle2 },
]

/* ── Component ── */
export function ClientExperimentsOverview() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Expandable table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Launch Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Finish Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Tests</th>
              </tr>
            </thead>
            <tbody>
              {vitaHustleBatches.map((batch, i) => {
                const isExpanded = expandedIdx === i
                return (
                  <Fragment key={i}>
                    <tr
                      className={cn(
                        "border-b border-border transition-colors hover:bg-accent/30 cursor-pointer",
                        isExpanded && "bg-accent/20"
                      )}
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    >
                      <td className="px-3 py-3.5">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap">{batch.launchDate}</td>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">{batch.finishDate}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={cn(
                          "text-[12px] font-medium px-2.5 py-1 rounded-md",
                          statusStyles[mapBatchStatus(batch.status)] || "bg-accent text-foreground"
                        )}>
                          {mapBatchStatus(batch.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {batch.tests} {batch.tests === 1 ? "test" : "tests"}
                      </td>
                    </tr>

                    {/* Expanded experiment rows */}
                    {isExpanded && batch.experiments.length > 0 && (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <div className="bg-accent/10 border-b border-border">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/60">
                                  <th className="px-6 py-2.5 text-[12px] font-medium text-muted-foreground text-left pl-14">Experiment</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Status</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Placement</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Devices</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">GEOs</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Variants</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-right">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.experiments.map((exp, ei) => (
                                  <tr
                                    key={ei}
                                    className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors cursor-pointer"
                                    onClick={() => {
                                      setSelectedExperiment(exp)
                                      setSelectedBatch(batch)
                                      setIsModalOpen(true)
                                    }}
                                  >
                                    <td className="px-6 py-3 pl-14">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[13px] font-medium text-foreground">{exp.name}</span>
                                        <span className="text-[11px] text-muted-foreground">{exp.description}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={cn(
                                        "text-[11px] font-medium px-2 py-0.5 rounded-md",
                                        statusStyles[exp.status] || "bg-accent text-foreground"
                                      )}>
                                        {exp.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[12px] text-foreground">{exp.placement}</span>
                                        {exp.placementUrl && (
                                          <span className="text-[11px] text-sky-600 flex items-center gap-0.5">
                                            <ExternalLink className="h-2.5 w-2.5" />
                                            {exp.placementUrl}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.devices}</td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.geos}</td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.variants}</td>
                                    <td className={cn(
                                      "px-4 py-3 text-[12px] text-right whitespace-nowrap tabular-nums font-medium",
                                      exp.revenue !== "$0" && exp.revenue !== "-" ? "text-emerald-600" : "text-muted-foreground"
                                    )}>
                                      {exp.revenue}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ExperimentDetailsModal
        isOpen={isModalOpen}
        experiment={selectedExperiment}
        batchKey={selectedBatch ? `${selectedBatch.client} | ${selectedBatch.launchDate}` : undefined}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
