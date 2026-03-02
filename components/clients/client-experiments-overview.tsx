"use client"

import { Fragment, useState, useMemo } from "react"
import { ChevronDown, ChevronRight, Search, ExternalLink, Layers, FlaskConical, Zap, CheckCircle2, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"

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
}

interface Batch {
  id?: string
  client: string
  launchDate: string
  finishDate: string
  status: string
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

const mapBatchStatus = (status: string): "Pending" | "In Progress" | "Live" | "Completed" => {
  const statusLower = status.toLowerCase()
  if (statusLower === "in progress") return "In Progress"
  if (statusLower === "live") return "Live"
  if (statusLower === "completed" || statusLower === "successful" || statusLower === "unsuccessful" || statusLower === "inconclusive") return "Completed"
  return "Pending"
}

const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

export function ClientExperimentsOverview() {
  const { user } = useUser()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch batches for logged-in client ONLY
  const { data: batchesData } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)', 'PTA Due Date'],
    filterByFormula: user?.role === 'client' ? `{Client} = "${user.name}"` : undefined,
  })

  const { data: experimentsData } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Placement URL', 'Batch', 'Devices', 'GEOs', 'Variants', 'Revenue Added (MRR)'],
  })

  // Transform Airtable data
  const batches: Batch[] = useMemo(() => {
    if (!batchesData) return []
    return batchesData.map(batch => {
      const linkedTests = batch.fields['Linked Test Names']
      const testCount = Array.isArray(linkedTests) ? linkedTests.length : typeof linkedTests === 'string' && linkedTests ? linkedTests.split(',').length : 0
      
      const batchExperiments = (experimentsData || []).filter(exp => {
        const linkedBatches = exp.fields['Batch'] as string[] | undefined
        return linkedBatches?.includes(batch.id)
      }).map(exp => ({
        name: exp.fields['Test Description'] as string || 'Unnamed Test',
        description: '',
        status: exp.fields['Test Status'] as string || 'Pending',
        placement: exp.fields['Placement'] as string || '',
        placementUrl: exp.fields['Placement URL'] as string,
        devices: exp.fields['Devices'] as string || 'All Devices',
        geos: Array.isArray(exp.fields['GEOs']) ? (exp.fields['GEOs'] as string[]).join(', ') : '',
        variants: '-',
        revenue: '$0',
      }))

      return {
        id: batch.id,
        client: user?.name || 'Unknown',
        launchDate: batch.fields['Launch Date'] as string || '',
        finishDate: batch.fields['PTA Due Date'] as string || '',
        status: batch.fields['All Tests Status'] as string || 'No Tests',
        tests: testCount,
        revenueImpact: batch.fields['Revenue Added (MRR)'] as string || '$0',
        experiments: batchExperiments,
      }
    })
  }, [batchesData, experimentsData, user])

  const filtered = useMemo(() => {
    let result = batches
    if (search) result = result.filter(b => b.launchDate.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== "All Statuses") result = result.filter(b => mapBatchStatus(b.status) === statusFilter)
    return result
  }, [search, statusFilter, batches])

  const toggleBatch = (i: number) => {
    const newSet = new Set(selectedBatches)
    newSet.has(i) ? newSet.delete(i) : newSet.add(i)
    setSelectedBatches(newSet)
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((_, i) => selectedBatches.has(i))
  const toggleSelectAll = () => {
    setSelectedBatches(allFilteredSelected ? new Set() : new Set(filtered.map((_, i) => i)))
  }

  const exportCSV = () => {
    const selected = filtered.filter((_, i) => selectedBatches.has(i))
    if (selected.length === 0) return
    const rows: string[][] = []
    rows.push(["Launch Date", "Finish Date", "Status", "Tests", "Test Name", "Status", "Placement", "Devices", "GEOs", "Variants", "Revenue"])
    for (const batch of selected) {
      if (batch.experiments.length === 0) {
        rows.push([batch.launchDate, batch.finishDate, mapBatchStatus(batch.status), String(batch.tests), ...Array(7).fill("")])
      } else {
        for (const exp of batch.experiments) {
          rows.push([batch.launchDate, batch.finishDate, mapBatchStatus(batch.status), String(batch.tests), exp.name, exp.status, exp.placement, exp.devices, exp.geos, exp.variants, exp.revenue])
        }
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batches-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
              <div className="relative flex-1 w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by date..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-[13px] bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <button
              onClick={exportCSV}
              disabled={selectedBatches.size === 0}
              className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-foreground px-3 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <table className="w-full">
          <thead className="border-b border-border bg-muted/40">
            <tr>
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
            {filtered.map((batch, idx) => (
              <Fragment key={idx}>
                <tr className="border-b border-border hover:bg-accent/30 transition-colors">
                  <td className="w-10 px-3 py-3" onClick={() => toggleBatch(idx)}>
                    <input
                      type="checkbox"
                      checked={selectedBatches.has(idx)}
                      onChange={() => toggleBatch(idx)}
                      className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                    />
                  </td>
                  <td className="w-10 px-3 py-3">
                    <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)} className="p-0">
                      {expandedIdx === idx ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-medium text-foreground">{batch.launchDate}</td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground">{batch.finishDate}</td>
                  <td className="px-4 py-3.5">
                    <span className={cn("text-[12px] font-medium px-2.5 py-1 rounded-md", statusStyles[mapBatchStatus(batch.status)] || "bg-accent text-foreground")}>
                      {mapBatchStatus(batch.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground">{batch.tests}</td>
                </tr>

                {/* Nested experiments - EXACT copy from client-tracker minus Actions column */}
                {expandedIdx === idx && batch.experiments.length > 0 && (
                  <tr>
                    <td colSpan={6} className="p-0">
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
                              <tr key={ei} className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => { setSelectedExperiment(exp); setIsModalOpen(true) }}>
                                <td className="px-6 py-3 pl-14">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[13px] font-medium text-foreground">{exp.name}</span>
                                    <span className="text-[11px] text-muted-foreground">{exp.description}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md", statusStyles[exp.status] || "bg-accent text-foreground")}>
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
                                <td className={cn("px-4 py-3 text-[12px] text-right whitespace-nowrap font-medium", exp.revenue !== "$0" && exp.revenue !== "-" ? "text-emerald-600" : "text-muted-foreground")}>
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
            ))}
          </tbody>
        </table>
      </div>

      <ExperimentDetailsModal isOpen={isModalOpen} experiment={selectedExperiment} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
