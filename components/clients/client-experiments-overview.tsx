"use client"

import { Fragment, useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Layers,
  FlaskConical,
  Zap,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"
import { useAirtable } from "@/hooks/use-airtable"

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
  revenueAddedMrr?: string
  nextSteps?: string
  launchDate?: string
  endDate?: string
  deployed?: boolean
  whatHappened?: string
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
  [key: string]: unknown
}

interface Batch {
  id: string
  launchDate: string
  finishDate: string
  status: string
  tests: number
  experiments: Experiment[]
}

/* ── Status styles ── */
const statusStyles: Record<string, string> = {
  "In Progress": "bg-sky-50 text-sky-700",
  Live: "bg-emerald-50 text-emerald-700",
  Mixed: "bg-amber-50 text-amber-700",
  Pending: "bg-accent text-muted-foreground",
  Completed: "bg-accent text-muted-foreground",
  "No Tests": "bg-accent text-muted-foreground",
  Unsuccessful: "bg-rose-50 text-rose-700",
  Blocked: "bg-red-50 text-red-700",
  Successful: "bg-emerald-50 text-emerald-700",
  Inconclusive: "bg-amber-50 text-amber-700",
}

const computeBatchStatus = (
  launchDate: string,
  finishDate: string,
  testIdeasStartDate: string
): "Pending" | "In Progress" | "Live" | "Completed" => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const launch = launchDate ? new Date(launchDate) : null
  const finish = finishDate ? new Date(finishDate) : null
  const start = testIdeasStartDate ? new Date(testIdeasStartDate) : null

  if (finish && today >= finish) return "Completed"
  if (launch && today >= launch) return "Live"
  if (start && today >= start) return "In Progress"
  return "Pending"
}

const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

/* ── Component ── */
export function ClientExperimentsOverview() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  /* ── API fetches (client-filtered automatically by role-filter) ── */
  const { data: rawBatches, isLoading: batchesLoading } = useAirtable("batches", {
    fields: ["Launch Date", "PTA (Scheduled Finish)", "Test Ideas Start Date"],
    sort: [{ field: "Launch Date", direction: "desc" }],
    revalidateOnFocus: false,
  })

  const { data: rawExperiments, isLoading: experimentsLoading } = useAirtable("experiments", {
    revalidateOnFocus: false,
    fields: [
      "Test Description",
      "Test Status",
      "Launch Date",
      "End Date",
      "Placement",
      "Placement URL",
      "Devices",
      "GEOs",
      "Revenue Added (MRR) (Regular Format)",
      "Hypothesis",
      "Rationale",
      "Category Primary Goals",
      "Deployed",
      "Describe what happened & what we learned",
      "Next Steps (Action)",
      "Control ImageE",
      "Variant ImageE",
      "PTA Result Image",
      "Post-Test Analysis (Loom)",
      "Batch",
      "Record ID (from Brand Name)",
    ],
  })

  /* ── Build batches with nested experiments ── */
  const batches = useMemo((): Batch[] => {
    if (!rawBatches) return []

    const experimentsByBatch: Record<string, Experiment[]> = {}

    if (rawExperiments) {
      for (const record of rawExperiments) {
        const f = record.fields
        const batchIds: string[] = Array.isArray(f["Batch"]) ? (f["Batch"] as string[]) : []

        const exp: Experiment = {
          name: (f["Test Description"] as string) || "",
          description: (f["Rationale"] as string) || (f["Test Description"] as string) || "",
          status: (f["Test Status"] as string) || "Pending",
          placement: (f["Placement"] as string) || "",
          placementUrl: f["Placement URL"] as string | undefined,
          devices: Array.isArray(f["Devices"])
            ? (f["Devices"] as string[]).join(", ")
            : (f["Devices"] as string) || "",
          geos: Array.isArray(f["GEOs"])
            ? (f["GEOs"] as string[]).join(", ")
            : (f["GEOs"] as string) || "",
          variants: "-",
          revenue:
            f["Revenue Added (MRR) (Regular Format)"]
              ? `$${f["Revenue Added (MRR) (Regular Format)"]}`
              : "$0",
          primaryGoals: Array.isArray(f["Category Primary Goals"])
            ? (f["Category Primary Goals"] as string[])
            : [],
          hypothesis: f["Hypothesis"] as string | undefined,
          rationale: f["Rationale"] as string | undefined,
          revenueAddedMrr: f["Revenue Added (MRR) (Regular Format)"] as string | undefined,
          nextSteps: f["Next Steps (Action)"] as string | undefined,
          launchDate: f["Launch Date"] as string | undefined,
          endDate: f["End Date"] as string | undefined,
          deployed: Boolean(f["Deployed"]),
          whatHappened: f["Describe what happened & what we learned"] as string | undefined,
          controlImage: f["Control ImageE"] as string | undefined,
          variantImage: f["Variant ImageE"] as string | undefined,
          resultImage: f["PTA Result Image"] as string | undefined,
          resultVideo: f["Post-Test Analysis (Loom)"] as string | undefined,
        }

        for (const batchId of batchIds) {
          if (!experimentsByBatch[batchId]) experimentsByBatch[batchId] = []
          experimentsByBatch[batchId].push(exp)
        }
      }
    }

    return rawBatches.map((record) => {
      const f = record.fields
      const experiments = experimentsByBatch[record.id] || []
      const launchDate = (f["Launch Date"] as string) || ""
      const finishDate = (f["PTA (Scheduled Finish)"] as string) || ""
      const testIdeasStartDate = (f["Test Ideas Start Date"] as string) || ""

      return {
        id: record.id,
        launchDate,
        finishDate,
        status: computeBatchStatus(launchDate, finishDate, testIdeasStartDate),
        tests: experiments.length,
        experiments,
      }
    })
  }, [rawBatches, rawExperiments])

  /* ── Stat cards (computed from live data) ── */
  const totalBatches = batches.length
  const totalExperiments = batches.reduce((sum, b) => sum + b.tests, 0)
  const activeBatches = batches.filter(
    (b) => b.status === "Live" || b.status === "In Progress"
  ).length
  const successful = batches
    .flatMap((b) => b.experiments)
    .filter((e) => e.status === "Successful").length

  const statCards = [
    { label: "Total Batches", value: String(totalBatches), Icon: Layers },
    { label: "Total Experiments", value: String(totalExperiments), Icon: FlaskConical },
    { label: "Active Batches", value: String(activeBatches), Icon: Zap },
    { label: "Successful", value: String(successful), Icon: CheckCircle2 },
  ]

  /* ── Filtered batches ── */
  const filtered = useMemo(() => {
    let result = [...batches]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.launchDate.toLowerCase().includes(q) ||
          b.experiments.some((e) => e.name.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== "All Statuses") {
      result = result.filter((b) => b.status === statusFilter)
    }
    return result
  }, [batches, search, statusFilter])

  const isLoading = batchesLoading || experimentsLoading

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, Icon }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Expandable batch table */}
      <div className="bg-card rounded-xl border border-border">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-border">
          <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batches, experiments..."
              className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-[13px] text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-3 py-3" />
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">
                    Launch Date
                  </th>
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">
                    Finish Date
                  </th>
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">
                    Tests
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[13px] text-muted-foreground">
                      No batches found
                    </td>
                  </tr>
                )}
                {filtered.map((batch, i) => {
                  const isExpanded = expandedIdx === i
                  return (
                    <Fragment key={batch.id || i}>
                      {/* Batch row */}
                      <tr
                        className={cn(
                          "border-b border-border transition-colors hover:bg-accent/30 cursor-pointer",
                          isExpanded && "bg-accent/20"
                        )}
                        onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      >
                        <td className="px-3 py-3.5">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap">
                          {batch.launchDate}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                          {batch.finishDate}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "text-[12px] font-medium px-2.5 py-1 rounded-md",
                              statusStyles[batch.status] || "bg-accent text-foreground"
                            )}
                          >
                            {batch.status}
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
                                    <th className="px-6 py-2.5 text-[12px] font-medium text-muted-foreground text-left pl-10">
                                      Experiment
                                    </th>
                                    <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">
                                      Status
                                    </th>
                                    <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">
                                      Placement
                                    </th>
                                    <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">
                                      Devices
                                    </th>
                                    <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">
                                      GEOs
                                    </th>
                                    <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">
                                      Variants
                                    </th>
                                    <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-right">
                                      Revenue
                                    </th>
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
                                      <td className="px-6 py-3 pl-10">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[13px] font-medium text-foreground">
                                            {exp.name}
                                          </span>
                                          <span className="text-[11px] text-muted-foreground">
                                            {exp.description}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span
                                          className={cn(
                                            "text-[11px] font-medium px-2 py-0.5 rounded-md",
                                            statusStyles[exp.status] || "bg-accent text-foreground"
                                          )}
                                        >
                                          {exp.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[12px] text-foreground">
                                            {exp.placement}
                                          </span>
                                          {exp.placementUrl && (
                                            <span className="text-[11px] text-sky-600 flex items-center gap-0.5">
                                              <ExternalLink className="h-2.5 w-2.5" />
                                              {exp.placementUrl}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                                        {exp.devices}
                                      </td>
                                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                                        {exp.geos}
                                      </td>
                                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                                        {exp.variants}
                                      </td>
                                      <td
                                        className={cn(
                                          "px-4 py-3 text-[12px] text-right whitespace-nowrap tabular-nums font-medium",
                                          exp.revenue !== "$0" && exp.revenue !== "-"
                                            ? "text-emerald-600"
                                            : "text-muted-foreground"
                                        )}
                                      >
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
        )}
      </div>

      {/* View Experiment Details modal (read-only) */}
      <ExperimentDetailsModal
        isOpen={isModalOpen}
        experiment={selectedExperiment}
        batchKey={selectedBatch ? selectedBatch.launchDate : undefined}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
