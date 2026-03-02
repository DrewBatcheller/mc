"use client"

import { useState, useMemo } from "react"
import { ChevronDown, ChevronRight, Search, ExternalLink, Layers, FlaskConical, Zap, CheckCircle2 } from "lucide-react"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"
import { Fragment } from "react"

interface Experiment {
  id: string
  name: string
  status: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: string
  revenue: string
}

interface Batch {
  id: string
  launchDate: string
  finishDate: string
  status: string
  tests: number
  experiments: Experiment[]
}

// Status styling
const statusStyles: Record<string, string> = {
  "In Progress": "bg-sky-50 text-sky-700",
  "Live": "bg-emerald-50 text-emerald-700",
  "Completed": "bg-emerald-50 text-emerald-700",
  "Pending": "bg-accent text-muted-foreground",
  "Unsuccessful": "bg-rose-50 text-rose-700",
}

const mapBatchStatus = (status: string): string => {
  const s = String(status || "").toLowerCase()
  if (s.includes("live")) return "Live"
  if (s.includes("successful") || s.includes("unsuccessful") || s.includes("inconclusive") || s.includes("blocked") || s.includes("completed")) return "Completed"
  if (s.includes("in progress")) return "In Progress"
  return "Pending"
}

const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

export function ClientExperimentsOverview() {
  const { user } = useUser()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())

  // Fetch batches for this client
  const { data: rawBatches } = useAirtable('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'Finish Date', 'All Tests Status', 'Linked Test Names'],
    filterByFormula: user?.role === 'client' ? `{Brand Name} = "${user.name}"` : undefined,
  })

  // Fetch experiments
  const { data: rawExperiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Batch', 'Placement', 'Placement URL', 'Devices', 'GEOs', 'Variants', 'Revenue Added (MRR)'],
  })

  const batches = useMemo(() => {
    if (!rawBatches) return []
    return rawBatches.map(b => {
      const batchKey = String(b.fields['Batch Key'] ?? '')
      const launchDate = b.fields['Launch Date'] ? new Date(String(b.fields['Launch Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
      const finishDate = b.fields['Finish Date'] ? new Date(String(b.fields['Finish Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
      const status = String(b.fields['All Tests Status'] ?? 'Pending')
      const linkedTests = Array.isArray(b.fields['Linked Test Names']) ? b.fields['Linked Test Names'] : []
      
      const batchExperiments = (rawExperiments ?? [])
        .filter(exp => {
          const expBatches = exp.fields['Batch']
          if (Array.isArray(expBatches)) return expBatches.includes(batchKey)
          return String(expBatches ?? '') === batchKey
        })
        .map(exp => ({
          id: exp.id,
          name: String(exp.fields['Test Description'] ?? ''),
          status: String(exp.fields['Test Status'] ?? ''),
          placement: String(exp.fields['Placement'] ?? ''),
          placementUrl: exp.fields['Placement URL'] ? String(exp.fields['Placement URL']) : undefined,
          devices: String(exp.fields['Devices'] ?? ''),
          geos: String(exp.fields['GEOs'] ?? ''),
          variants: String(exp.fields['Variants'] ?? '-'),
          revenue: String(exp.fields['Revenue Added (MRR)'] ?? '-'),
        }))

      return {
        id: b.id,
        launchDate,
        finishDate,
        status,
        tests: linkedTests.length,
        experiments: batchExperiments,
      }
    })
  }, [rawBatches, rawExperiments])

  const filtered = useMemo(() => {
    let result = batches
    if (search) result = result.filter(b => b.launchDate.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== "All Statuses") result = result.filter(b => mapBatchStatus(b.status) === statusFilter)
    return result
  }, [batches, search, statusFilter])

  const allFilteredSelected = filtered.length > 0 && filtered.every((_, i) => selectedBatches.has(i))

  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedBatches(new Set())
    else setSelectedBatches(new Set(filtered.map((_, i) => i)))
  }

  const toggleBatch = (i: number) => {
    setSelectedBatches(prev => {
      const n = new Set(prev)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card rounded-xl border border-border">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
          <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-3"><input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded" /></th>
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
                  <Fragment key={i}>
                    <tr className={cn("border-b border-border hover:bg-accent/30 cursor-pointer", isExpanded && "bg-accent/20")} onClick={() => setExpandedIdx(isExpanded ? null : i)}>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedBatches.has(i)} onChange={() => toggleBatch(i)} className="h-3.5 w-3.5 rounded" /></td>
                      <td className="px-3 py-3">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                      <td className="px-4 py-3 text-[13px] font-medium">{batch.launchDate}</td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">{batch.finishDate}</td>
                      <td className="px-4 py-3"><span className={cn("text-[12px] font-medium px-2.5 py-1 rounded-md", statusStyles[mapBatchStatus(batch.status)] || "bg-accent")}>{mapBatchStatus(batch.status)}</span></td>
                      <td className="px-4 py-3 text-[13px]">{batch.tests}</td>
                    </tr>
                    {isExpanded && batch.experiments.length > 0 && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="bg-accent/10 border-b border-border">
                            <table className="w-full text-[12px]">
                              <thead>
                                <tr className="border-b border-border/60">
                                  <th className="px-6 py-2.5 font-medium text-muted-foreground text-left">Experiment</th>
                                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-left">Status</th>
                                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-left">Placement</th>
                                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-left">Devices</th>
                                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-left">GEOs</th>
                                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-left">Variants</th>
                                  <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.experiments.map((exp, ei) => (
                                  <tr key={ei} className="border-b border-border/40 last:border-0 hover:bg-accent/20 cursor-pointer" onClick={() => { setSelectedExperiment(exp); setSelectedBatch(batch); setIsModalOpen(true) }}>
                                    <td className="px-6 py-3">{exp.name}</td>
                                    <td className="px-4 py-3"><span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", statusStyles[exp.status] || "bg-accent")}>{exp.status}</span></td>
                                    <td className="px-4 py-3"><div>{exp.placement}{exp.placementUrl && <div className="text-sky-600 flex items-center gap-0.5"><ExternalLink className="h-2.5 w-2.5" />{exp.placementUrl}</div>}</div></td>
                                    <td className="px-4 py-3">{exp.devices}</td>
                                    <td className="px-4 py-3">{exp.geos}</td>
                                    <td className="px-4 py-3">{exp.variants}</td>
                                    <td className={cn("px-4 py-3 text-right", exp.revenue !== "-" ? "text-emerald-600" : "text-muted-foreground")}>{exp.revenue}</td>
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

      <ExperimentDetailsModal isOpen={isModalOpen} experiment={selectedExperiment} batchKey={selectedBatch ? `${selectedBatch.launchDate}` : undefined} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
