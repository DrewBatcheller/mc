"use client"

import { Fragment, useState, useMemo, useRef, useEffect } from "react"
import {
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Layers,
  FlaskConical,
  Zap,
  CheckCircle2,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useUser } from "@/contexts/UserContext"
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

/* ── Data ── */
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

// Map all statuses to 4 main batch statuses
const mapBatchStatus = (status: string | string[] | undefined): "Pending" | "In Progress" | "Live" | "Completed" => {
  if (!status) return "Pending"
  // Handle array of statuses - take first one or join
  const statusStr = Array.isArray(status) ? status[0] : status
  if (typeof statusStr !== 'string') return "Pending"
  
  const statusLower = statusStr.toLowerCase()
  if (statusLower === "in progress") return "In Progress"
  if (statusLower === "live") return "Live"
  if (statusLower === "completed" || statusLower === "successful" || statusLower === "unsuccessful" || statusLower === "inconclusive") return "Completed"
  return "Pending"
}

/* ── Data fetching ── */
export function ClientExperimentsOverview() {
  const { user } = useUser()
  
  // Fetch batches and experiments for THIS CLIENT ONLY
  const { data: batchesData } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)'],
  })
  
  const { data: experimentsData } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Placement URL', 'Revenue Added (MRR) (Regular Format)', 'Batch', 'Hypothesis', 'Rationale', 'Category Primary Goals', 'Devices', 'GEOs', 'Launch Date', 'End Date', 'Deployed', 'Describe what happened & what we learned', 'Next Steps (Action)', 'Variants (Link)', 'Variants', 'Control ImageE', 'Variant ImageE', 'PTA Result Image', 'Post-Test Analysis (Loom)'],
  })

  // Transform Airtable data into component shape
  const batches: Batch[] = useMemo(() => {
    if (!batchesData) return []
    return batchesData.map(batch => {
      // Find all experiments linked to this batch
      const batchExperiments = (experimentsData || []).filter(exp => {
        const linkedBatches = exp.fields['Batch'] as string[] | undefined
        return linkedBatches?.includes(batch.id)
      }).map(exp => ({
        name: exp.fields['Test Description'] as string || '',
        description: '',
        status: exp.fields['Test Status'] as string || 'Pending',
        placement: exp.fields['Placement'] as string || '',
        placementUrl: exp.fields['Placement URL'] as string,
        devices: exp.fields['Devices'] as string || 'All Devices',
        geos: Array.isArray(exp.fields['GEOs']) ? (exp.fields['GEOs'] as string[]).join(', ') : '',
        variants: '-',
        revenue: exp.fields['Revenue Added (MRR) (Regular Format)'] as string || '$0',
        hypothesis: exp.fields['Hypothesis'] as string,
        rationale: exp.fields['Rationale'] as string,
        launchDate: exp.fields['Launch Date'] as string,
        endDate: exp.fields['End Date'] as string,
        deployed: exp.fields['Deployed'] as boolean || false,
        whatHappened: exp.fields['Describe what happened & what we learned'] as string,
        nextSteps: exp.fields['Next Steps (Action)'] as string,
      }))
      
      return {
        id: batch.id,
        client: user?.name || 'Unknown Client',
        launchDate: batch.fields['Launch Date'] as string || '',
        finishDate: '', // Would need to calculate or get from batch data
        status: batch.fields['All Tests Status'] as string || 'No Tests',
        tests: batchExperiments.length,
        revenueImpact: batch.fields['Revenue Added (MRR)'] as string || '$0',
        experiments: batchExperiments,
      }
    })
  }, [batchesData, experimentsData, user])

  const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedBatches(new Set())
    } else {
      setSelectedBatches(new Set(filtered.map((_, i) => i)))
    }
  }

  const toggleBatch = (i: number) => {
    setSelectedBatches(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const exportCSV = () => {
    const selected = filtered.filter((_, i) => selectedBatches.has(i))
    if (selected.length === 0) return

    const rows: string[][] = []
    rows.push([
      "Client", "Launch Date", "Finish Date", "Batch Status", "Tests",
      "Experiment", "Description", "Exp Status", "Placement", "Placement URL",
      "Devices", "GEOs", "Variants", "Revenue", "Hypothesis", "Rationale",
      "Primary Goals", "Weighting", "Revenue Added MRR", "Next Steps",
      "Launch Date (Exp)", "End Date (Exp)", "Deployed", "What Happened",
      "Variant Name", "Variant Status", "Traffic %", "Visitors", "Conversions",
      "CR", "CR Improvement", "CR Confidence", "RPV", "RPV Improvement",
      "RPV Confidence", "Variant Revenue", "Revenue Improvement"
    ])

    for (const batch of selected) {
      if (batch.experiments.length === 0) {
        rows.push([
          batch.client, batch.launchDate, batch.finishDate, mapBatchStatus(batch.status),
          String(batch.tests),
          ...Array(32).fill("")
        ])
        continue
      }
      for (const exp of batch.experiments) {
        const baseExp = [
          batch.client, batch.launchDate, batch.finishDate, mapBatchStatus(batch.status),
          String(batch.tests),
          exp.name, exp.description, exp.status, exp.placement, exp.placementUrl ?? "",
          exp.devices, exp.geos, exp.variants, exp.revenue,
          exp.hypothesis ?? "", exp.rationale ?? "",
          (exp.primaryGoals ?? []).join("; "), exp.weighting ?? "",
          exp.revenueAddedMrr ?? "", exp.nextSteps ?? "",
          exp.launchDate ?? "", exp.endDate ?? "",
          exp.deployed ? "Yes" : "No", exp.whatHappened ?? "",
        ]
        if (exp.variantData && exp.variantData.length > 0) {
          for (const v of exp.variantData) {
            rows.push([
              ...baseExp,
              v.name, v.status ?? "", String(v.trafficPercent ?? ""),
              String(v.visitors), String(v.conversions),
              String(v.crPercent ?? v.cr ?? ""), String(v.crImprovement),
              String(v.crConfidence ?? ""),
              String(v.rpv), String(v.rpvImprovement),
              String(v.rpvConfidence ?? ""),
              String(v.revenue), String(v.revenueImprovement),
            ])
          }
        } else {
          rows.push([...baseExp, ...Array(13).fill("")])
        }
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batch-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const launchMenuRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let result = [...batches]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.client.toLowerCase().includes(q) ||
          b.experiments.some((e) => e.name.toLowerCase().includes(q))
      )
    }
      if (statusFilter !== "All Statuses") result = result.filter((b) => mapBatchStatus(b.status) === statusFilter)
    return result
    }, [search, statusFilter])

  const allFilteredSelected = filtered.length > 0 && filtered.every((_, i) => selectedBatches.has(i))

  // Calculate stats from actual client data
  const trackerStats = useMemo(() => {
    const totalBatches = batches.length
    const totalExperiments = batches.reduce((sum, b) => sum + b.experiments.length, 0)
    // Live Now: count experiments with "In Progress" or "Live" status
    const liveNow = batches.reduce((sum, b) => sum + b.experiments.filter(e => 
      e.status?.toLowerCase().includes('in progress') || e.status?.toLowerCase().includes('live')
    ).length, 0)
    const successful = batches.reduce((sum, b) => sum + b.experiments.filter(e => e.status === "Successful").length, 0)
    
    return [
      { label: "Total Batches", value: String(totalBatches), icon: Layers },
      { label: "Total Experiments", value: String(totalExperiments), icon: FlaskConical },
      { label: "Live Now", value: String(liveNow), icon: Zap },
      { label: "Successful", value: String(successful), icon: CheckCircle2 },
    ]
  }, [batches])

  // Close launch menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (launchMenuRef.current && !launchMenuRef.current.contains(event.target as Node)) {
        setLaunchMenuOpen(false)
      }
    }
    
    if (launchMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [launchMenuOpen])

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trackerStats.map((stat) => (
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
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-border">
          <div className="flex items-center gap-2">
            <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
          </div>
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batches, experiments..."
              className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={exportCSV}
            disabled={selectedBatches.size === 0}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-foreground px-3 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                  />
                </th>
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Batch</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Finish Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Tests</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((batch, i) => {
                const isExpanded = expandedIdx === i
                return (
                  <Fragment key={`${batch.client}-${i}`}>
                    {/* Batch row */}
                    <tr
                      className={cn(
                        "border-b border-border transition-colors hover:bg-accent/30 cursor-pointer",
                        isExpanded && "bg-accent/20"
                      )}
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    >
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedBatches.has(i)}
                          onChange={() => toggleBatch(i)}
                          className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap">
                        {batch.client} | {batch.launchDate}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {batch.finishDate}
                      </td>
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
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {/* Client view: No CRUD actions */}
                      </td>
                    </tr>

                    {/* Expanded experiment rows */}
                    {isExpanded && batch.experiments.length > 0 && (
                      <tr>
                        <td colSpan={8} className="p-0">
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
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.experiments.map((exp, ei) => (
                                  <tr 
                                    key={ei} 
                                    className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors"
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
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                      {/* Client view: No CRUD actions */}
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
      
      {/* Experiment Details Modal */}
    </div>
  )
}
                }}
                className={cn(
                  "px-3 py-2 text-sm font-medium text-white rounded transition-colors",
                  confirmAction.type === 'delete' ? "bg-destructive hover:bg-destructive/90" : "bg-sky-600 hover:bg-sky-700"
                )}
              >
                {confirmAction.type === 'delete' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tests Modal - What to do with existing tests */}
      {deleteTestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-md shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">What to do with existing tests?</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              The "{deleteTestsModal.client}" batch contains {deleteTestsModal.tests} test{deleteTestsModal.tests === 1 ? '' : 's'}. Choose what to do with them:
            </p>
            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => {
                  setDeleteTestsModal(null)
                  // Handle desync logic - convert tests back to ideas
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors"
              >
                <div className="font-medium text-foreground text-sm">Desync</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">Convert tests back into test ideas</div>
              </button>
              <button
                onClick={() => {
                  setSelectBatchModal(deleteTestsModal)
                  setDeleteTestsModal(null)
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors"
              >
                <div className="font-medium text-foreground text-sm">Select Batch</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">Move tests to another batch</div>
              </button>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTestsModal(null)}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Batch Modal */}
      {selectBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-md shadow-lg">
            {!isCreatingNewBatch ? (
              <>
                <h3 className="text-base font-semibold text-foreground mb-2">Select Batch</h3>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Choose an existing {selectBatchModal.client} batch or create a new one to move the tests to:
                </p>
                <div className="mb-4 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setIsCreatingNewBatch(true)
                        setNewBatchDate("")
                      }}
                      className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-border bg-accent/50 text-left hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-foreground text-sm">+ Create New Batch</div>
                    </button>
                    {batches
                      .filter((batch) => batch.client === selectBatchModal.client)
                      .map((batch, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectBatchModal(null)
                            setIsCreatingNewBatch(false)
                            // Handle select batch
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors"
                        >
                          <div className="font-medium text-foreground text-sm">{batch.client}</div>
                          <div className="text-[12px] text-muted-foreground">{batch.launchDate}</div>
                        </button>
                      ))}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setSelectBatchModal(null)
                      setIsCreatingNewBatch(false)
                    }}
                    className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-foreground mb-2">Create New Batch</h3>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Select the launch date for the new {selectBatchModal.client} batch:
                </p>
                <div className="mb-4">
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Launch Date</label>
                  <input
                    type="date"
                    value={newBatchDate}
                    onChange={(e) => setNewBatchDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setIsCreatingNewBatch(false)
                      setNewBatchDate("")
                    }}
                    className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setSelectBatchModal(null)
                      setIsCreatingNewBatch(false)
                      setNewBatchDate("")
                      // Handle create new batch with newBatchDate
                    }}
                    disabled={!newBatchDate}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded transition-colors",
                      newBatchDate
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Convert Experiment Modal */}
      {convertExperimentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">Convert Experiment to Idea?</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Are you sure you want to convert "{convertExperimentModal.name}" back into a test idea? This will remove it from the current batch.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConvertExperimentModal(null)}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConvertExperimentModal(null)
                  setShowThankYou(true)
                  // Handle convert logic here - would make API call to Airtable
                }}
                className="px-3 py-2 text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 rounded transition-colors"
              >
                Convert to Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
