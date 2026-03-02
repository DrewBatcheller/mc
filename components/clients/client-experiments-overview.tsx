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
  status: string
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

/* ── Helper functions ── */
const mapBatchStatus = (status: string | string[] | undefined): "Pending" | "In Progress" | "Live" | "Completed" => {
  if (!status) return "Pending"
  const statusStr = Array.isArray(status) ? status[0] : status
  if (typeof statusStr !== 'string') return "Pending"
  
  const statusLower = statusStr.toLowerCase()
  if (statusLower.includes("in progress")) return "In Progress"
  if (statusLower.includes("live")) return "Live"
  if (statusLower.includes("completed") || statusLower.includes("successful") || statusLower.includes("unsuccessful")) return "Completed"
  return "Pending"
}

const statusStyles: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Live: "bg-green-100 text-green-700",
  Completed: "bg-purple-100 text-purple-700",
}

/* ── Component ── */
export function ClientExperimentsOverview() {
  const { user } = useUser()
  
  // Fetch batches and experiments for current client using correct field names from CSV
  const { data: batchesData } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)', 'PTA Due Date'],
  })
  
  const { data: experimentsData } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Batch', 'Launch Date', 'End Date'],
  })

  // Transform Airtable data into component shape
  const batches: Batch[] = useMemo(() => {
    if (!batchesData) return []
    return batchesData.map(batch => {
      const linkedTests = batch.fields['Linked Test Names']
      // Handle both array and string types from Airtable
      const testCount = Array.isArray(linkedTests) 
        ? linkedTests.length 
        : typeof linkedTests === 'string' && linkedTests
        ? linkedTests.split(',').length
        : 0
      
      return {
        id: batch.id,
        client: user?.name || 'Unknown Client',
        launchDate: batch.fields['Launch Date'] as string || '',
        finishDate: batch.fields['PTA Due Date'] as string || '',
        status: batch.fields['All Tests Status'] as string || 'No Tests',
        tests: testCount,
        revenueImpact: batch.fields['Revenue Added (MRR)'] as string || '$0',
        experiments: [],
      }
    })
  }, [batchesData, user])

  // Calculate stats
  const stats = useMemo(() => {
    const totalBatches = batches.length
    const totalTests = batches.reduce((sum, b) => sum + b.tests, 0)
    const liveNow = batches.filter(b => mapBatchStatus(b.status) === "Live").length
    const successful = batches.filter(b => b.status?.toLowerCase().includes('successful')).length
    
    return [
      { label: "Total Batches", value: String(totalBatches), icon: Layers },
      { label: "Total Tests", value: String(totalTests), icon: FlaskConical },
      { label: "Live Now", value: String(liveNow), icon: Zap },
      { label: "Successful", value: String(successful), icon: CheckCircle2 },
    ]
  }, [batches])

  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())

  const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

  // Filter batches
  const filtered = useMemo(() => {
    let result = [...batches]
    if (search) result = result.filter(b => b.launchDate.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== "All Statuses") result = result.filter(b => mapBatchStatus(b.status) === statusFilter)
    return result
  }, [batches, search, statusFilter])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Search and filters */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by launch date..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
          />
          <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
        </div>

        {/* Table body */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No batches found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 text-left font-medium">Launch Date</th>
                <th className="px-4 py-3 text-left font-medium">Finish Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Tests</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((batch, idx) => (
                <Fragment key={batch.id}>
                  <tr
                    className={cn(
                      "border-b border-border hover:bg-muted/30 cursor-pointer",
                      expandedIdx === idx && "bg-muted/20"
                    )}
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  >
                    <td className="px-4 py-3">
                      {expandedIdx === idx ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{batch.launchDate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{batch.finishDate}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2 py-1 rounded", statusStyles[mapBatchStatus(batch.status)])}>
                        {mapBatchStatus(batch.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{batch.tests}</td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
