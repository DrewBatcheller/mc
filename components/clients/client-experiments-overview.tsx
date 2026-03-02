"use client"

import { Fragment, useState, useMemo, useRef, useEffect } from "react"
import { ChevronDown, ChevronRight, Search, Layers, FlaskConical, Zap, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"

type Experiment = {
  id?: string
  name: string
  description: string
  status: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: string
  revenue: string
  hypothesis?: string
  rationale?: string
  launchDate?: string
  endDate?: string
  deployed?: boolean
  whatHappened?: string
  nextSteps?: string
}

type Batch = {
  id?: string
  client: string
  launchDate: string
  finishDate: string
  status: string | string[]
  tests: number
  revenueImpact: string
  experiments: Experiment[]
}

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

const mapBatchStatus = (status: string | string[] | undefined): "Pending" | "In Progress" | "Live" | "Completed" => {
  if (!status) return "Pending"
  const statusStr = Array.isArray(status) ? status.join('').toLowerCase() : String(status || '').toLowerCase()
  if (statusStr.includes("in progress")) return "In Progress"
  if (statusStr.includes("live")) return "Live"
  if (statusStr.includes("completed") || statusStr.includes("successful") || statusStr.includes("unsuccessful") || statusStr.includes("inconclusive")) return "Completed"
  return "Pending"
}

export function ClientExperimentsOverview() {
  const { user } = useUser()
  const { data: batchesData } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)', 'PTA Due Date'],
  })
  const { data: experimentsData } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Batch', 'Launch Date', 'End Date', 'Devices', 'GEOs'],
  })

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const launchMenuRef = useRef<HTMLDivElement>(null)

  const batches: Batch[] = useMemo(() => {
    if (!batchesData) return []
    return batchesData.map(batch => {
      const linkedTests = batch.fields['Linked Test Names']
      const testCount = Array.isArray(linkedTests) 
        ? linkedTests.length 
        : typeof linkedTests === 'string' && linkedTests
        ? linkedTests.split(',').length
        : 0
      
      const batchExperiments = (experimentsData || []).filter(exp => {
        const linkedBatches = exp.fields['Batch'] as string[] | undefined
        return linkedBatches?.includes(batch.id)
      }).map(exp => ({
        id: exp.id,
        name: exp.fields['Test Description'] as string || 'Unnamed Test',
        description: '',
        status: exp.fields['Test Status'] as string || 'Pending',
        placement: exp.fields['Placement'] as string || '',
        placementUrl: exp.fields['Placement URL'] as string,
        devices: exp.fields['Devices'] as string || 'All Devices',
        geos: Array.isArray(exp.fields['GEOs']) ? (exp.fields['GEOs'] as string[]).join(', ') : '',
        variants: '-',
        revenue: '$0',
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
        finishDate: batch.fields['PTA Due Date'] as string || '',
        status: batch.fields['All Tests Status'] as string || 'No Tests',
        tests: testCount,
        revenueImpact: batch.fields['Revenue Added (MRR)'] as string || '$0',
        experiments: batchExperiments,
      }
    })
  }, [batchesData, experimentsData, user])

  const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

  const filtered = useMemo(() => {
    let result = batches
    if (search) result = result.filter((b) => b.launchDate.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== "All Statuses") result = result.filter((b) => mapBatchStatus(b.status) === statusFilter)
    return result
  }, [search, statusFilter, batches])

  const stats = useMemo(() => {
    const totalBatches = batches.length
    const totalTests = batches.reduce((sum, b) => sum + b.tests, 0)
    const liveNow = batches.filter(b => mapBatchStatus(b.status) === "Live").length
    const successful = batches.filter(b => {
      const statusStr = Array.isArray(b.status) ? b.status.join('').toLowerCase() : String(b.status || '').toLowerCase()
      return statusStr.includes('successful')
    }).length
    
    return [
      { label: "Total Batches", value: String(totalBatches), icon: Layers },
      { label: "Total Experiments", value: String(totalTests), icon: FlaskConical },
      { label: "Live Now", value: String(liveNow), icon: Zap },
      { label: "Successful", value: String(successful), icon: CheckCircle2 },
    ]
  }, [batches])

  const toggleBatch = (idx: number) => {
    const newSet = new Set(selectedBatches)
    if (newSet.has(idx)) newSet.delete(idx)
    else newSet.add(idx)
    setSelectedBatches(newSet)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
          </div>
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/40">
            <tr>
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
                <Fragment key={`${batch.launchDate}-${i}`}>
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
                      {batch.tests}
                    </td>
                  </tr>

                  {/* Nested experiments */}
                  {isExpanded && batch.experiments.length > 0 && (
                    <tr className="bg-muted/5">
                      <td colSpan={5} className="p-4">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-xs">Test Name</th>
                              <th className="px-4 py-2 text-left font-medium text-xs">Status</th>
                              <th className="px-4 py-2 text-left font-medium text-xs">Placement</th>
                              <th className="px-4 py-2 text-left font-medium text-xs">Devices</th>
                              <th className="px-4 py-2 text-left font-medium text-xs">GEOs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batch.experiments.map((exp, ei) => (
                              <tr 
                                key={ei} 
                                className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedExperiment(exp)
                                  setIsModalOpen(true)
                                }}
                              >
                                <td className="px-4 py-2 text-foreground">{exp.name}</td>
                                <td className="px-4 py-2">
                                  <span className={cn("text-xs font-medium px-2 py-1 rounded", statusStyles[mapBatchStatus(exp.status)])}>
                                    {mapBatchStatus(exp.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">{exp.placement || '-'}</td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">{exp.devices}</td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">{exp.geos || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Experiment Details Modal */}
      <ExperimentDetailsModal 
        isOpen={isModalOpen}
        experiment={selectedExperiment}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
