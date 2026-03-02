"use client"

import { Fragment, useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Search,
  Layers,
  FlaskConical,
  Zap,
  CheckCircle2,
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
}

interface Batch {
  id: string
  client: string
  launchDate: string
  finishDate: string
  status: string
  tests: number
  revenueImpact: string
  experiments: Experiment[]
}

/* ── Status mapping ── */
const mapBatchStatus = (status: string | string[] | undefined): "Pending" | "In Progress" | "Live" | "Completed" => {
  if (!status) return "Pending"
  const statusStr = Array.isArray(status) ? status[0] : status
  if (typeof statusStr !== 'string') return "Pending"
  
  const statusLower = statusStr.toLowerCase()
  if (statusLower === "in progress") return "In Progress"
  if (statusLower === "live") return "Live"
  if (statusLower === "completed" || statusLower === "successful" || statusLower === "unsuccessful" || statusLower === "inconclusive") return "Completed"
  return "Pending"
}

const statusStyles: Record<string, string> = {
  "Pending": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  "In Progress": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Live": "bg-green-500/10 text-green-700 dark:text-green-400",
  "Completed": "bg-gray-500/10 text-gray-700 dark:text-gray-400",
}

/* ── Component ── */
export function ClientExperimentsOverview() {
  const { user } = useUser()
  
  // Fetch batches for THIS CLIENT ONLY - include End Date field
  const { data: batchesData } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'End Date', 'All Tests Status', 'Revenue Added (MRR)'],
  })
  
  const { data: experimentsData } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Devices', 'GEOs', 'Batch'],
  })

  // Transform Airtable data into component shape
  const batches: Batch[] = useMemo(() => {
    console.log('[v0] batchesData:', batchesData?.length, 'experimentsData:', experimentsData?.length, 'user:', user?.name)
    if (!batchesData) return []
    return batchesData.map(batch => {
      const batchExperiments = (experimentsData || []).filter(exp => {
        const linkedBatches = exp.fields['Batch'] as string[] | undefined
        return linkedBatches?.includes(batch.id)
      }).map(exp => ({
        name: exp.fields['Test Description'] as string || '',
        description: '',
        status: exp.fields['Test Status'] as string || 'Pending',
        placement: exp.fields['Placement'] as string || '',
        devices: exp.fields['Devices'] as string || 'All Devices',
        geos: Array.isArray(exp.fields['GEOs']) ? (exp.fields['GEOs'] as string[]).join(', ') : '',
        variants: '-',
        revenue: '$0',
      }))
      
      return {
        id: batch.id,
        client: user?.name || 'Unknown Client',
        launchDate: batch.fields['Launch Date'] as string || '',
        finishDate: batch.fields['End Date'] as string || '',
        status: batch.fields['All Tests Status'] as string || 'No Tests',
        tests: batchExperiments.length,
        revenueImpact: batch.fields['Revenue Added (MRR)'] as string || '$0',
        experiments: batchExperiments,
      }
    })
  }, [batchesData, experimentsData, user])

  const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

  // State
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())

  const toggleBatch = (idx: number) => {
    const newSelected = new Set(selectedBatches)
    if (newSelected.has(idx)) {
      newSelected.delete(idx)
    } else {
      newSelected.add(idx)
    }
    setSelectedBatches(newSelected)
  }

  // Calculate stats from actual client data
  const trackerStats = useMemo(() => {
    const totalBatches = batches.length
    const totalExperiments = batches.reduce((sum, b) => sum + b.experiments.length, 0)
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

  const filtered = useMemo(() => {
    let result = [...batches]
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(b => b.launchDate.toLowerCase().includes(searchLower))
    }
    if (statusFilter !== "All Statuses") {
      result = result.filter(b => mapBatchStatus(b.status) === statusFilter)
    }
    return result
  }, [batches, search, statusFilter])

  const allFilteredSelected = filtered.length > 0 && filtered.every((_, i) => selectedBatches.has(i))

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trackerStats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-accent/30">
            <tr>
              <th className="w-10 px-3 py-3" />
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
                    <td className="px-4 py-3.5 text-[13px] font-medium text-foreground">
                      {batch.launchDate}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-muted-foreground">
                      {batch.finishDate}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "text-[12px] font-medium px-2.5 py-1 rounded-md",
                        statusStyles[mapBatchStatus(batch.status)] || "bg-accent text-foreground"
                      )}>
                        {mapBatchStatus(batch.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-muted-foreground">
                      {batch.tests} {batch.tests === 1 ? "test" : "tests"}
                    </td>
                  </tr>

                  {/* Experiments rows */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <div className="border-t border-border bg-accent/10">
                          {batch.experiments.length > 0 ? (
                            <table className="w-full">
                              <tbody>
                                {batch.experiments.map((exp, ei) => (
                                  <tr 
                                    key={ei} 
                                    className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors"
                                  >
                                    <td colSpan={2} className="px-8 py-3" />
                                    <td className="px-4 py-3 text-[13px] text-foreground">
                                      <span className="font-medium">{exp.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[13px] text-muted-foreground">-</td>
                                    <td className="px-4 py-3">
                                      <span className="text-[12px] font-medium px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-700 dark:text-gray-400">
                                        {exp.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-[13px] text-muted-foreground">
                                      {exp.placement}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="px-8 py-6 text-center text-[13px] text-muted-foreground">
                              No experiments in this batch
                            </div>
                          )}
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

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[13px] text-muted-foreground">No batches found</p>
        </div>
      )}
    </div>
  )
}
