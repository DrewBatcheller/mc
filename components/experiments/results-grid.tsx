"use client"

import { useState, useMemo } from "react"
import {
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "./experiment-details-modal"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

const RESULT_IMG = "https://i.imgur.com/u50b3Yy.png"

type Status = "Successful" | "Unsuccessful" | "Inconclusive"

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; bg: string; border: string; dot: string }> = {
  Successful: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  Unsuccessful: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500" },
  Inconclusive: { icon: HelpCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
}
export function ResultsGrid() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All Clients")
  const [statusFilter, setStatusFilter] = useState("All")
  const [selected, setSelected] = useState<string | null>(null)

  const { data: rawExps, isLoading } = useAirtable('experiments', {
    fields: [
      'Test Description', 'Test Status', 'Brand Name (from Brand Name)', 'Brand Name',
      'Revenue Added (MRR) (Regular Format)', 'Launch Date', 'End Date',
      'Placement', 'Devices', 'GEOs', 'Primary Goal', 'Category Primary Goals',
      'Strategist (from Strategist)', 'Strategist',
    ],
    filterExtra: 'OR({Test Status} = "Successful", {Test Status} = "Unsuccessful", {Test Status} = "Inconclusive")',
    sort: [{ field: 'End Date', direction: 'desc' }],
  })

  const results = useMemo(() => (rawExps ?? []).map(r => {
    const client = Array.isArray(r.fields['Brand Name (from Brand Name)'])
      ? (r.fields['Brand Name (from Brand Name)'] as string[])[0]
      : String(r.fields['Brand Name'] ?? '')
    const goalsRaw = r.fields['Category Primary Goals'] ?? r.fields['Primary Goal']
    const goals = Array.isArray(goalsRaw) ? goalsRaw as string[] : goalsRaw ? [String(goalsRaw)] : []
    return {
      id: r.id,
      name: String(r.fields['Test Description'] ?? ''),
      client,
      status: String(r.fields['Test Status'] ?? '') as Status,
      revenueAdded: parseCurrency(r.fields['Revenue Added (MRR) (Regular Format)'] as string),
      placement: String(r.fields['Placement'] ?? ''),
      device: String(r.fields['Devices'] ?? ''),
      geos: String(r.fields['GEOs'] ?? ''),
      launchDate: String(r.fields['Launch Date'] ?? ''),
      endDate: String(r.fields['End Date'] ?? ''),
      goals,
      deployed: false,
      controlLabel: 'Original',
      variantLabel: 'Variant',
      rationale: '',
    }
  }), [rawExps])

  const clients = useMemo(() => ['All Clients', ...Array.from(new Set(results.map(r => r.client).filter(Boolean)))], [results])

  const filtered = useMemo(() => results.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false
    if (clientFilter !== 'All Clients' && r.client !== clientFilter) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.client.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [results, statusFilter, clientFilter, search])

  const selectedResult = results.find(r => r.id === selected)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SelectField value={statusFilter} onChange={setStatusFilter} options={["All", "Successful", "Unsuccessful", "Inconclusive"]} />
        <SelectField value={clientFilter} onChange={setClientFilter} options={clients} />
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search results..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-card">
          <button onClick={() => setView("grid")} className={cn("h-7 w-7 rounded flex items-center justify-center transition-colors", view === "grid" ? "bg-foreground text-background" : "hover:bg-accent")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView("list")} className={cn("h-7 w-7 rounded flex items-center justify-center transition-colors", view === "list" ? "bg-foreground text-background" : "hover:bg-accent")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={cn("gap-4", view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col")}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">No results found</div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => {
            const cfg = statusConfig[r.status] ?? statusConfig.Inconclusive
            const Icon = cfg.icon
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className="bg-card rounded-xl border border-border overflow-hidden text-left hover:border-foreground/30 transition-colors group"
              >
                <div className="relative h-32 bg-accent overflow-hidden">
                  <img src={RESULT_IMG} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className={cn("absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border", cfg.bg, cfg.color, cfg.border)}>
                    <Icon className="h-3 w-3" />
                    {r.status}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[13px] font-semibold text-foreground line-clamp-2 mb-1">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground mb-2">{r.client}</p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{r.endDate ? `Ended ${r.endDate}` : ""}</span>
                    {r.revenueAdded > 0 && <span className="font-semibold text-emerald-600">+${r.revenueAdded.toLocaleString()}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Test Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Revenue Added</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">End Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const cfg = statusConfig[r.status] ?? statusConfig.Inconclusive
                const Icon = cfg.icon
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => setSelected(r.id)}>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[280px] truncate">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.client}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border", cfg.bg, cfg.color, cfg.border)}>
                        <Icon className="h-3 w-3" />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.revenueAdded > 0 ? <span className="text-emerald-600 font-semibold">+${r.revenueAdded.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.endDate}</td>
                    <td className="px-4 py-3">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedResult && (
        <ExperimentDetailsModal
          experiment={{
            name: selectedResult.name,
            client: selectedResult.client,
            status: selectedResult.status,
            revenueAdded: selectedResult.revenueAdded,
            placement: selectedResult.placement,
            device: selectedResult.device,
            geos: selectedResult.geos,
            launchDate: selectedResult.launchDate,
            endDate: selectedResult.endDate,
            rationale: selectedResult.rationale,
            goals: selectedResult.goals,
            deployed: selectedResult.deployed,
            controlLabel: selectedResult.controlLabel,
            variantLabel: selectedResult.variantLabel,
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
