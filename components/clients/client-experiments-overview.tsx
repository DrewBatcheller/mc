"use client"

import { useState, useMemo } from "react"
import { ChevronDown, Search, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"

export function ClientExperimentsOverview() {
  const { user } = useUser()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())

  const { data: batchesData } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)', 'PTA Due Date'],
    filterByFormula: user?.role === 'client' ? `{Client} = "${user.name}"` : undefined,
  })

  const { data: experimentsData } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Placement URL', 'Batch', 'Launch Date', 'End Date', 'Devices', 'GEOs', 'Variants', 'Revenue Added (MRR)'],
  })

  const statusStyles: Record<string, string> = {
    "In Progress": "bg-sky-50 text-sky-700",
    Live: "bg-emerald-50 text-emerald-700",
    Completed: "bg-slate-50 text-slate-700",
    Pending: "bg-accent text-muted-foreground",
  }

  const mapStatus = (status: string | string[] | undefined): string => {
    if (!status) return "Pending"
    const statusStr = Array.isArray(status) ? status.join("").toLowerCase() : String(status).toLowerCase()
    if (statusStr.includes("live")) return "Live"
    if (statusStr.includes("completed") || statusStr.includes("successful") || statusStr.includes("inconclusive")) return "Completed"
    if (statusStr.includes("in progress")) return "In Progress"
    return "Pending"
  }

  const batches = useMemo(() => {
    if (!batchesData) return []
    return batchesData.map(batch => {
      const linkedTests = batch.fields['Linked Test Names']
      const testCount = Array.isArray(linkedTests) ? linkedTests.length : (typeof linkedTests === 'string' && linkedTests ? linkedTests.split(',').length : 0)
      
      const batchExperiments = (experimentsData || []).filter(exp => {
        const linkedBatches = exp.fields['Batch'] as string[] | undefined
        return linkedBatches?.includes(batch.id)
      })

      return {
        id: batch.id,
        launchDate: batch.fields['Launch Date'] as string || '',
        finishDate: batch.fields['PTA Due Date'] as string || '',
        status: batch.fields['All Tests Status'] as string || 'Pending',
        tests: testCount,
        experiments: batchExperiments.map(exp => ({
          name: exp.fields['Test Description'] as string || '',
          description: '',
          status: exp.fields['Test Status'] as string || 'Pending',
          placement: exp.fields['Placement'] as string || '',
          placementUrl: exp.fields['Placement URL'] as string,
          devices: exp.fields['Devices'] as string || '',
          geos: Array.isArray(exp.fields['GEOs']) ? (exp.fields['GEOs'] as string[]).join(', ') : '',
          variants: exp.fields['Variants'] as string || '-',
          revenue: exp.fields['Revenue Added (MRR)'] as string || '$0',
        }))
      }
    })
  }, [batchesData, experimentsData])

  const filtered = useMemo(() => {
    let result = batches
    if (search) result = result.filter(b => b.launchDate.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== "All Statuses") result = result.filter(b => mapStatus(b.status) === statusFilter)
    return result
  }, [search, statusFilter, batches])

  const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]
  const allFilteredSelected = filtered.length > 0 && filtered.every((_, i) => selectedBatches.has(i))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedBatches(new Set())
    } else {
      setSelectedBatches(new Set(filtered.map((_, i) => i)))
    }
  }

  const toggleBatch = (index: number) => {
    const newSelected = new Set(selectedBatches)
    if (newSelected.has(index)) newSelected.delete(index)
    else newSelected.add(index)
    setSelectedBatches(newSelected)
  }

  const exportCSV = () => {
    const selected = filtered.filter((_, i) => selectedBatches.has(i))
    if (selected.length === 0) return

    const rows: string[][] = [
      ["Launch Date", "Finish Date", "Status", "Tests", "Experiment", "Description", "Status", "Placement", "URL", "Devices", "GEOs", "Variants", "Revenue"]
    ]

    for (const batch of selected) {
      if (batch.experiments.length === 0) {
        rows.push([batch.launchDate, batch.finishDate, mapStatus(batch.status), String(batch.tests), "", "", "", "", "", "", "", "", ""])
      } else {
        for (const exp of batch.experiments) {
          rows.push([
            batch.launchDate, batch.finishDate, mapStatus(batch.status), String(batch.tests),
            exp.name, exp.description, exp.status, exp.placement, exp.placementUrl || "", exp.devices, exp.geos, exp.variants, exp.revenue
          ])
        }
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batches-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
              <div className="relative">
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
              <tr key={idx} className="border-b border-border last:border-0 hover:bg-accent/10 transition-colors">
                <td className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedBatches.has(idx)}
                    onChange={() => toggleBatch(idx)}
                    className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                  />
                </td>
                <td className="w-10 px-3 py-3">
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                  >
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedIdx === idx && "rotate-180")} />
                  </button>
                </td>
                <td className="px-4 py-3 text-[13px] font-medium text-foreground">{batch.launchDate}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{batch.finishDate}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-[12px] font-medium px-2.5 py-1 rounded-md", statusStyles[mapStatus(batch.status)])}>
                    {mapStatus(batch.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{batch.tests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
