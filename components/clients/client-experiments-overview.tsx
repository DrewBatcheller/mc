"use client"

import { Fragment, useState, useMemo } from "react"
import { useAirtable } from "@/hooks/use-airtable"
import {
  ChevronDown,
  ChevronRight,
  Search,
  Play,
  Pencil,
  Trash2,
  ExternalLink,
  Layers,
  FlaskConical,
  Zap,
  CheckCircle2,
  ArrowLeftRight,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"
import { useUser } from "@/contexts/UserContext"

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
  "Live - Collecting Data": "bg-emerald-50 text-emerald-700",
  Mixed: "bg-amber-50 text-amber-700",
  Pending: "bg-accent text-muted-foreground",
  "No Tests": "bg-accent text-muted-foreground",
  Unsuccessful: "bg-rose-50 text-rose-700",
  Blocked: "bg-red-50 text-red-700",
  Successful: "bg-emerald-50 text-emerald-700",
  Inconclusive: "bg-amber-50 text-amber-700",
}

// Map all statuses to 4 main batch statuses
const mapBatchStatus = (status: string): "Pending" | "In Progress" | "Live" | "Completed" => {
  const statusLower = status.toLowerCase()
  if (statusLower.includes("in progress")) return "In Progress"
  if (statusLower.includes("live")) return "Live"
  if (statusLower.includes("successful") || statusLower.includes("unsuccessful") || statusLower.includes("inconclusive") || statusLower.includes("blocked")) return "Completed"
  return "Pending"
}

const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

/* ── Stat Cards ── */
const trackerStats = useMemo(() => {
  return [
    { label: "Total Batches", value: String(batches.length), icon: Layers },
    { label: "Total Experiments", value: String(batches.reduce((sum, b) => sum + b.experiments.length, 0)), icon: FlaskConical },
    { label: "Live Now", value: String(batches.filter(b => mapBatchStatus(b.status) === "Live").length), icon: Zap },
    { label: "Completed", value: String(batches.filter(b => mapBatchStatus(b.status) === "Completed").length), icon: CheckCircle2 },
  ]
}, [batches])

/* ── Component ── */
export function ClientExperimentsOverview() {
  const { user } = useUser()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())

  // Fetch batches for this client
  const { data: rawBatches } = useAirtable('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'Finish Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)'],
    filterByFormula: user?.role === 'client' ? `{Brand Name} = "${user.name}"` : undefined,
    sort: [{ field: 'Launch Date', direction: 'desc' }],
  })

  // Fetch all experiments
  const { data: rawExperiments } = useAirtable('experiments', {
    fields: [
      'Test Description', 'Test Status', 'Batch', 'Brand Name', 'Placement', 'Placement URL',
      'Devices', 'GEOs', 'Variants', 'Revenue Added (MRR)', 'Launch Date', 'End Date'
    ],
  })

  const batches = useMemo(() => {
    if (!rawBatches) return []
    
    return rawBatches.map(batchRecord => {
      const batchKey = String(batchRecord.fields['Batch Key'] ?? '')
      const client = Array.isArray(batchRecord.fields['Brand Name'])
        ? String(batchRecord.fields['Brand Name'][0] ?? '')
        : String(batchRecord.fields['Brand Name'] ?? '')
      const launchDate = batchRecord.fields['Launch Date']
        ? new Date(String(batchRecord.fields['Launch Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
      const finishDate = batchRecord.fields['Finish Date']
        ? new Date(String(batchRecord.fields['Finish Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
      const status = String(batchRecord.fields['All Tests Status'] ?? 'Pending')
      const linkedTests = Array.isArray(batchRecord.fields['Linked Test Names']) ? batchRecord.fields['Linked Test Names'] : []
      
      // Find experiments linked to this batch
      const batchExperiments = (rawExperiments ?? [])
        .filter(exp => {
          const expBatches = exp.fields['Batch']
          if (Array.isArray(expBatches)) {
            return expBatches.includes(batchKey)
          }
          return String(expBatches ?? '') === batchKey
        })
        .map(exp => ({
          id: exp.id,
          name: String(exp.fields['Test Description'] ?? ''),
          description: '',
          status: String(exp.fields['Test Status'] ?? 'Pending'),
          placement: String(exp.fields['Placement'] ?? ''),
          placementUrl: exp.fields['Placement URL'] ? String(exp.fields['Placement URL']) : undefined,
          devices: String(exp.fields['Devices'] ?? ''),
          geos: String(exp.fields['GEOs'] ?? ''),
          variants: String(exp.fields['Variants'] ?? '-'),
          revenue: exp.fields['Revenue Added (MRR)'] ? String(exp.fields['Revenue Added (MRR)']) : '-',
        }))

      return {
        id: batchRecord.id,
        client,
        launchDate,
        finishDate,
        status,
        tests: linkedTests.length,
        revenueImpact: '$0',
        experiments: batchExperiments,
      }
    })
  }, [rawBatches, rawExperiments])

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

  const filtered = useMemo(() => {
    let result = batches
    if (search) result = result.filter((b) => b.launchDate.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== "All Statuses") result = result.filter((b) => mapBatchStatus(b.status) === statusFilter)
    return result
  }, [search, statusFilter, batches])

  const allFilteredSelected = filtered.length > 0 && filtered.every((_, i) => selectedBatches.has(i))

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
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Launch Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Finish Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Tests</th>
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
                        {batch.launchDate}
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
      
      {/* Experiment Details Modal */}
      <ExperimentDetailsModal 
        isOpen={isModalOpen}
        experiment={selectedExperiment}
        batchKey={selectedBatch ? `${selectedBatch.client} | ${selectedBatch.launchDate}` : undefined}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
