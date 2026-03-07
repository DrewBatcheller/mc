"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown, ChevronUp, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { EditLeadModal, type EditLeadData } from "@/components/sales/edit-lead-modal"

type SortKey = "fullName" | "stage" | "leadStatus" | "dealValue" | "dateCreated"

/* ── Badge configs ──────────────────────────────────────────────────────────── */

// Actual Kanban stage names from Airtable
const stageCfg: Record<string, string> = {
  "Open":               "bg-slate-50 text-slate-700 border-slate-200",
  "Qualifying Call":    "bg-violet-50 text-violet-700 border-violet-200",
  "Sales Call":         "bg-amber-50 text-amber-700 border-amber-200",
  "Onboarding Call":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed":             "bg-sky-50 text-sky-700 border-sky-200",
  "Maybe":              "bg-gray-50 text-gray-600 border-gray-200",
  "No Show":            "bg-rose-50 text-rose-600 border-rose-200",
  "Churned / Rejected": "bg-rose-50 text-rose-700 border-rose-200",
}

// Computed age-based status (Fresh / Stale / Old / Client)
const statusCfg: Record<string, string> = {
  "Fresh":  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Stale":  "bg-amber-50 text-amber-700 border-amber-200",
  "Old":    "bg-rose-50 text-rose-700 border-rose-200",
  "Client": "bg-sky-50 text-sky-700 border-sky-200",
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function daysSince(dateStr: string): number {
  const created = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  created.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
}

function computeAgeStatus(leadStatus: string, dateCreated: string): string {
  if (leadStatus === 'Client') return 'Client'
  if (!dateCreated) return 'Old'
  const age = daysSince(dateCreated)
  if (age < 60)  return 'Fresh'
  if (age < 180) return 'Stale'
  return 'Old'
}

function buildConvertUrl(lead: {
  id: string; fullName: string; email: string; phone: string; timezone: string;
  company: string; website: string; dateCreated: string; notes: string; lastContact: string
}): string {
  const [firstName = '', ...rest] = lead.fullName.trim().split(' ')
  const lastName = rest.join(' ')
  const p = new URLSearchParams({
    id:          lead.id,
    BrandName:   lead.company,
    Email:       lead.email,
    FirstName:   firstName,
    LastName:    lastName,
    PhoneNumber: lead.phone,
    Timezone:    lead.timezone,
    Website:     lead.website,
    DateCreated: lead.dateCreated,
    notes:       lead.notes,
    LastContact: lead.lastContact,
  })
  return `/onboarding/convert?${p.toString()}`
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export function LeadsTable() {
  const [sortKey,       setSortKey]       = useState<SortKey>("dateCreated")
  const [sortDir,       setSortDir]       = useState<"asc" | "desc">("desc")
  const [stageFilter,   setStageFilter]   = useState("All Stages")
  const [statusFilter,  setStatusFilter]  = useState("All Statuses")
  const [searchQuery,   setSearchQuery]   = useState("")

  // Edit modal
  const [editTarget,    setEditTarget]    = useState<EditLeadData | null>(null)

  // Delete confirmation
  const [deleteTarget,  setDeleteTarget]  = useState<{ id: string; name: string } | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  // Optimistic removals
  const [deletedIds,    setDeletedIds]    = useState<Set<string>>(new Set())

  const { data: rawLeads, isLoading, mutate } = useAirtable('leads', {
    fields: [
      'Full Name', 'Email', 'Stage', 'Lead Status', 'Deal Value',
      'UTM Source', 'UTM Medium', 'Date Created',
      'Phone Number', 'Company / Brand Name', 'Timezone', 'Website',
      'Notes', 'Last Contact',
    ],
    sort: [{ field: 'Date Created', direction: 'desc' }],
  })

  const leads = useMemo(() => (rawLeads ?? []).map(r => {
    const rawStatus   = String(r.fields['Lead Status']           ?? '')
    const dateCreated = String(r.fields['Date Created']          ?? '')
    const dealRaw     = r.fields['Deal Value']
    const dealNum     = parseCurrency(dealRaw as string)
    return {
      id:          r.id,
      fullName:    String(r.fields['Full Name']             ?? ''),
      email:       String(r.fields['Email']                 ?? ''),
      stage:       String(r.fields['Stage']                 ?? '-'),
      leadStatus:  computeAgeStatus(rawStatus, dateCreated),
      dealValue:   dealNum,
      utmSource:   String(r.fields['UTM Source']            ?? '-'),
      utmMedium:   String(r.fields['UTM Medium']            ?? ''),
      dateCreated,
      phone:       String(r.fields['Phone Number']          ?? ''),
      company:     String(r.fields['Company / Brand Name']  ?? ''),
      timezone:    String(r.fields['Timezone']              ?? ''),
      website:     String(r.fields['Website']               ?? ''),
      notes:       String(r.fields['Notes']                 ?? ''),
      lastContact: String(r.fields['Last Contact']          ?? ''),
    }
  }), [rawLeads])

  const allStages = useMemo(() => {
    const stages = new Set(leads.map(l => l.stage).filter(s => s && s !== '-'))
    return ['All Stages', ...Array.from(stages).sort()]
  }, [leads])

  const allStatuses = useMemo(() => {
    const statuses = new Set(leads.map(l => l.leadStatus).filter(s => s && s !== '-'))
    return ['All Statuses', ...Array.from(statuses).sort()]
  }, [leads])

  const sorted = useMemo(() => {
    let filtered = leads.filter(l => !deletedIds.has(l.id))
    if (stageFilter !== 'All Stages')     filtered = filtered.filter(l => l.stage === stageFilter)
    if (statusFilter !== 'All Statuses')  filtered = filtered.filter(l => l.leadStatus === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(l =>
        l.fullName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)    ||
        l.utmSource.toLowerCase().includes(q)||
        l.company.toLowerCase().includes(q)
      )
    }
    return filtered.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [leads, sortKey, sortDir, stageFilter, statusFilter, searchQuery, deletedIds])

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-30" />

  /* ── Edit handlers ── */
  const openEdit = (l: typeof sorted[number]) => {
    setEditTarget({
      id:          l.id,
      name:        l.fullName,
      email:       l.email,
      phone:       l.phone,
      timezone:    l.timezone,
      company:     l.company,
      website:     l.website,
      stage:       l.stage === '-' ? 'Open' : l.stage,
      dealValue:   l.dealValue > 0 ? `$${l.dealValue.toLocaleString()}` : '',
      source:      l.utmSource === '-' ? '' : l.utmSource,
      medium:      l.utmMedium,
      notes:       l.notes,
      lastContact: l.lastContact,
    })
  }

  const handleEditSaved = (updated: EditLeadData) => {
    setEditTarget(null)
    mutate()
  }

  /* ── Delete handlers ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)

    // Optimistic removal
    const id = deleteTarget.id
    setDeletedIds(prev => new Set([...prev, id]))
    setDeleteTarget(null)

    try {
      const res = await fetch(`/api/airtable/leads/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Delete failed (${res.status})`)
      }
      mutate()
    } catch (e: any) {
      // Revert optimistic removal
      setDeletedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      setDeleteError(e.message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-accent/20">
          <SelectField value={stageFilter}  onChange={setStageFilter}  options={allStages}    />
          <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses}  />
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-foreground text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </div>

        {/* Delete error toast */}
        {deleteError && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-[13px] text-destructive">
            {deleteError}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {([
                  { label: 'Name',         key: 'fullName'    as SortKey, align: 'text-left'  },
                  { label: 'Email',        key: null,                     align: 'text-left'  },
                  { label: 'Stage',        key: 'stage'       as SortKey, align: 'text-left'  },
                  { label: 'Status',       key: 'leadStatus'  as SortKey, align: 'text-left'  },
                  { label: 'Deal Value',   key: 'dealValue'   as SortKey, align: 'text-right' },
                  { label: 'Source',       key: null,                     align: 'text-left'  },
                  { label: 'Date Created', key: 'dateCreated' as SortKey, align: 'text-left'  },
                  { label: 'Actions',      key: null,                     align: 'text-right' },
                ] as const).map((col, ci) => (
                  <th
                    key={ci}
                    className={cn(
                      'px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap',
                      col.align,
                      col.key && 'cursor-pointer select-none hover:text-foreground transition-colors'
                    )}
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
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No leads found</td>
                </tr>
              ) : sorted.map((l, i) => (
                <tr
                  key={l.id}
                  className={cn(
                    'border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors',
                    i % 2 === 1 && 'bg-accent/10'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{l.fullName || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.email || '-'}</td>
                  <td className="px-4 py-3">
                    {l.stage !== '-' ? (
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md border', stageCfg[l.stage] ?? 'bg-accent text-foreground border-border')}>
                        {l.stage}
                      </span>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {l.leadStatus !== '-' ? (
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md border', statusCfg[l.leadStatus] ?? 'bg-accent text-foreground border-border')}>
                        {l.leadStatus}
                      </span>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {l.dealValue > 0 ? `$${l.dealValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.utmSource !== '-' ? l.utmSource : '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {l.dateCreated ? new Date(l.dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Convert → opens hosted form in new tab */}
                      <a
                        href={buildConvertUrl(l)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors whitespace-nowrap"
                        title="Convert to client"
                      >
                        Convert
                        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                      </a>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(l)}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Edit lead"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => { setDeleteTarget({ id: l.id, name: l.fullName || l.email }); setDeleteError(null) }}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <EditLeadModal
        isOpen={!!editTarget}
        lead={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={handleEditSaved}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-xl border border-border w-full max-w-sm shadow-lg p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Delete Lead?</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{deleteTarget.name}</span> will be permanently deleted from Airtable. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
