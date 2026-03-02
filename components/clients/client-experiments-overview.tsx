"use client"

import { Fragment, useState, useMemo } from "react"
import { ChevronDown, ChevronRight, Search, Layers, FlaskConical, Zap, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"

interface Experiment {
  name: string
  status: string
  placement: string
  devices: string
  geos: string
  variants: string
  revenue: string
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
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)

  // Fetch real data from Airtable for THIS CLIENT ONLY
  const { data: batchesData } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)', 'PTA Due Date'],
  })

  const { data: experimentsData } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Batch', 'Devices', 'GEOs'],
  })

  // Transform Airtable data - role-based filtering ensures only client's data
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
        name: exp.fields['Test Description'] as string || 'Unnamed Test',
        status: exp.fields['Test Status'] as string || 'Pending',
        placement: exp.fields['Placement'] as string || '',
        devices: exp.fields['Devices'] as string || 'All Devices',
        geos: Array.isArray(exp.fields['GEOs']) ? (exp.fields['GEOs'] as string[]).join(', ') : '',
        variants: '-',
        revenue: '$0',
      }))
      
      return {
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

  // Calculate stats
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
      { label: "Total Tests", value: String(totalTests), icon: FlaskConical },
      { label: "Live Now", value: String(liveNow), icon: Zap },
      { label: "Successful", value: String(successful), icon: CheckCircle2 },
    ]
  }, [batches])

  const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

  // Filter batches
  const filtered = useMemo(() => {
    let result = [...batches]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(b => b.launchDate.toLowerCase().includes(q))
    }
    if (statusFilter !== "All Statuses") {
      result = result.filter(b => mapBatchStatus(b.status) === statusFilter)
    }
    return result
  }, [batches, search, statusFilter])

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search by launch date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">Launch Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">Finish Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-left">Tests</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((batch, idx) => (
              <Fragment key={idx}>
                <tr 
                  className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  <td className="px-3 py-3">
                    {batch.experiments.length > 0 && (
                      expandedIdx === idx ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{batch.launchDate}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{batch.finishDate}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium px-2 py-1 rounded", statusStyles[mapBatchStatus(batch.status)] || "bg-accent text-foreground")}>
                      {mapBatchStatus(batch.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{batch.tests}</td>
                </tr>

                {/* Nested experiments */}
                {expandedIdx === idx && batch.experiments.length > 0 && (
                  <tr className="bg-muted/10 border-b border-border">
                    <td colSpan={5} className="p-4">
                      <table className="w-full text-xs">
                        <thead className="border-b border-border/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Test Name</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Placement</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Devices</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Geos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.experiments.map((exp, expIdx) => (
                            <tr key={expIdx} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2 text-foreground">{exp.name}</td>
                              <td className="px-3 py-2">
                                <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded inline-block", statusStyles[mapBatchStatus(exp.status)] || "bg-accent text-foreground")}>
                                  {mapBatchStatus(exp.status)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{exp.placement}</td>
                              <td className="px-3 py-2 text-muted-foreground">{exp.devices}</td>
                              <td className="px-3 py-2 text-muted-foreground">{exp.geos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
