"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

type SortKey = "fullName" | "stage" | "leadStatus" | "dealValue" | "dateCreated"

const stageCfg: Record<string, string> = {
  "Qualified Lead": "bg-sky-50 text-sky-700 border-sky-200",
  "Discovery Call": "bg-violet-50 text-violet-700 border-violet-200",
  "Proposal Sent": "bg-amber-50 text-amber-700 border-amber-200",
  "Closed Won": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed Lost": "bg-rose-50 text-rose-700 border-rose-200",
  "Follow Up": "bg-teal-50 text-teal-700 border-teal-200",
}

const statusCfg: Record<string, string> = {
  "Active": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Inactive": "bg-amber-50 text-amber-700 border-amber-200",
  "New": "bg-sky-50 text-sky-700 border-sky-200",
}

export function LeadsTable() {
  const [sortKey, setSortKey] = useState<SortKey>("dateCreated")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [stageFilter, setStageFilter] = useState("All Stages")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [searchQuery, setSearchQuery] = useState("")

  const { data: rawLeads, isLoading } = useAirtable('leads', {
    fields: ['Full Name', 'Email', 'Stage', 'Lead Status', 'Deal Value', 'UTM Source', 'Date Created'],
    sort: [{ field: 'Date Created', direction: 'desc' }],
  })

  const leads = useMemo(() => (rawLeads ?? []).map(r => ({
    id: r.id,
    fullName: String(r.fields['Full Name'] ?? ''),
    email: String(r.fields['Email'] ?? ''),
    stage: String(r.fields['Stage'] ?? '-'),
    leadStatus: String(r.fields['Lead Status'] ?? '-'),
    dealValue: parseCurrency(r.fields['Deal Value'] as string),
    utmSource: String(r.fields['UTM Source'] ?? '-'),
    dateCreated: String(r.fields['Date Created'] ?? ''),
  })), [rawLeads])

  const allStages = useMemo(() => {
    const stages = new Set(leads.map(l => l.stage).filter(s => s && s !== '-'))
    return ['All Stages', ...Array.from(stages).sort()]
  }, [leads])

  const allStatuses = useMemo(() => {
    const statuses = new Set(leads.map(l => l.leadStatus).filter(s => s && s !== '-'))
    return ['All Statuses', ...Array.from(statuses).sort()]
  }, [leads])

  const sorted = useMemo(() => {
    let filtered = [...leads]
    if (stageFilter !== 'All Stages') filtered = filtered.filter(l => l.stage === stageFilter)
    if (statusFilter !== 'All Statuses') filtered = filtered.filter(l => l.leadStatus === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(l =>
        l.fullName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.utmSource.toLowerCase().includes(q)
      )
    }
    return filtered.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [leads, sortKey, sortDir, stageFilter, statusFilter, searchQuery])

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-30" />

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-accent/20">
        <SelectField value={stageFilter} onChange={setStageFilter} options={allStages} />
        <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-foreground text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {[
                { label: 'Name', key: 'fullName' as SortKey, align: 'text-left' },
                { label: 'Email', key: null, align: 'text-left' },
                { label: 'Stage', key: 'stage' as SortKey, align: 'text-left' },
                { label: 'Status', key: 'leadStatus' as SortKey, align: 'text-left' },
                { label: 'Deal Value', key: 'dealValue' as SortKey, align: 'text-right' },
                { label: 'Source', key: null, align: 'text-left' },
                { label: 'Date Created', key: 'dateCreated' as SortKey, align: 'text-left' },
              ].map((col, ci) => (
                <th
                  key={ci}
                  className={cn('px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap', col.align, col.key && 'cursor-pointer select-none hover:text-foreground transition-colors')}
                  onClick={() => col.key && toggle(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.key && <SortIcon k={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No leads found</td>
              </tr>
            ) : sorted.map((l, i) => (
              <tr
                key={l.id}
                className={cn('border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors', i % 2 === 1 && 'bg-accent/10')}
              >
                <td className="px-4 py-3 font-medium text-foreground">{l.fullName || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.email || '-'}</td>
                <td className="px-4 py-3">
                  {l.stage !== '-' ? (
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md border', stageCfg[l.stage] ?? 'bg-accent text-foreground border-border')}>{l.stage}</span>
                  ) : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="px-4 py-3">
                  {l.leadStatus !== '-' ? (
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md border', statusCfg[l.leadStatus] ?? 'bg-accent text-foreground border-border')}>{l.leadStatus}</span>
                  ) : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {l.dealValue > 0 ? `$${l.dealValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{l.utmSource !== '-' ? l.utmSource : '-'}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {l.dateCreated ? new Date(l.dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
