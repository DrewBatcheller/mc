"use client"

import { useState, useMemo } from "react"
import { Search, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { LeadDetailsModal } from "./lead-details-modal"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface KanbanLead {
  id:          string
  email:       string
  name:        string
  company:     string
  website:     string
  date:        string   // formatted for display
  dateCreated: string   // ISO for age calc + sorting
  source:      string
  medium:      string
  phone:       string
  timezone:    string
  stage:       string
  dealValue:   number
  leadStatus:  string   // raw Airtable Lead Status (e.g. "Lead" / "Client")
}

/* ── Config ─────────────────────────────────────────────────────────────────── */

const COLUMN_CONFIG = [
  { id: "Open",               label: "Open",               dotColor: "bg-foreground" },
  { id: "Qualifying Call",    label: "Qualifying Call",    dotColor: "bg-violet-500" },
  { id: "Sales Call",         label: "Sales Call",         dotColor: "bg-amber-500" },
  { id: "Onboarding Call",    label: "Onboarding Call",    dotColor: "bg-emerald-500" },
  { id: "Closed",             label: "Closed",             dotColor: "bg-sky-500" },
  { id: "Maybe",              label: "Maybe",              dotColor: "bg-muted-foreground" },
  { id: "No Show",            label: "No Show",            dotColor: "bg-muted-foreground/50" },
  { id: "Churned / Rejected", label: "Churned / Rejected", dotColor: "bg-rose-400" },
]

const SORT_OPTS   = ["Sort: All", "Sort: Newest", "Sort: Oldest"]
const STATUS_OPTS = ["All Status", "Fresh", "Stale", "Old"]

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function daysSince(dateStr: string): number {
  const created = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  created.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
}

function ageStatus(leadStatus: string, dateCreated: string): string {
  if (leadStatus === 'Client') return 'Client'
  if (!dateCreated) return 'Old'
  const age = daysSince(dateCreated)
  if (age < 60)  return 'Fresh'
  if (age < 180) return 'Stale'
  return 'Old'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export function KanbanBoard() {
  const [search,        setSearch]        = useState("")
  const [sort,          setSort]          = useState(SORT_OPTS[0])
  const [statusFilter,  setStatusFilter]  = useState(STATUS_OPTS[0])
  const [mouseDownTime, setMouseDownTime] = useState(0)
  const [draggedId,     setDraggedId]     = useState<string | null>(null)
  const [dragFromCol,   setDragFromCol]   = useState<string | null>(null)
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({})
  const [isModalOpen,   setIsModalOpen]   = useState(false)
  const [selectedLead,  setSelectedLead]  = useState<any>(null)

  const { data: rawLeads, isLoading } = useAirtable('leads', {
    fields: [
      'Full Name', 'Email', 'Stage', 'Company / Brand Name',
      'Website', 'UTM Source', 'UTM Medium', 'Date Created',
      'Deal Value', 'Lead Status', 'Phone Number', 'Timezone',
    ],
    sort: [{ field: 'Date Created', direction: 'desc' }],
  })

  /* Map raw Airtable records → KanbanLead, applying optimistic stage overrides */
  const allLeads = useMemo((): KanbanLead[] =>
    (rawLeads ?? []).map(r => {
      const dateCreated = String(r.fields['Date Created'] ?? '')
      const dealRaw     = r.fields['Deal Value']
      return {
        id:          r.id,
        email:       String(r.fields['Email'] ?? ''),
        name:        String(r.fields['Full Name'] ?? ''),
        company:     String(r.fields['Company / Brand Name'] ?? ''),
        website:     String(r.fields['Website'] ?? ''),
        date:        formatDate(dateCreated),
        dateCreated,
        source:      String(r.fields['UTM Source'] ?? ''),
        medium:      String(r.fields['UTM Medium'] ?? ''),
        phone:       String(r.fields['Phone Number'] ?? ''),
        timezone:    String(r.fields['Timezone'] ?? ''),
        stage:       stageOverrides[r.id] ?? String(r.fields['Stage'] ?? 'Open'),
        dealValue:   typeof dealRaw === 'number'
                       ? dealRaw
                       : dealRaw ? parseFloat(String(dealRaw).replace(/[^0-9.]/g, '')) : 0,
        leadStatus:  String(r.fields['Lead Status'] ?? ''),
      }
    })
  , [rawLeads, stageOverrides])

  /* Live stat card values */
  const statValues = useMemo(() => ({
    total:      allLeads.length,
    inPipeline: allLeads.filter(l =>
      l.stage && !['Closed', 'Churned / Rejected', 'No Show', ''].includes(l.stage)
    ).length,
    closed:     allLeads.filter(l => l.stage === 'Closed' || l.leadStatus === 'Client').length,
    atRisk:     allLeads.filter(l => l.stage === 'No Show' || l.stage === 'Churned / Rejected').length,
  }), [allLeads])

  /* Filter + sort, then group into columns */
  const cols = useMemo(() => {
    let filtered = [...allLeads]

    if (statusFilter !== 'All Status') {
      filtered = filtered.filter(l => ageStatus(l.leadStatus, l.dateCreated) === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(l =>
        l.email.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q)  ||
        l.company.toLowerCase().includes(q)
      )
    }

    if (sort === 'Sort: Newest') {
      filtered.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
    } else if (sort === 'Sort: Oldest') {
      filtered.sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime())
    }

    return COLUMN_CONFIG.map(col => ({
      ...col,
      leads: filtered.filter(l => l.stage === col.id),
    }))
  }, [allLeads, statusFilter, search, sort])

  /* Drag-drop: optimistic update + PATCH */
  const handleDrop = async (toColId: string) => {
    if (!draggedId || !dragFromCol || dragFromCol === toColId) {
      setDraggedId(null); setDragFromCol(null)
      return
    }
    const id = draggedId
    setStageOverrides(prev => ({ ...prev, [id]: toColId }))
    setDraggedId(null); setDragFromCol(null)

    try {
      await fetch(`/api/airtable/leads/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields: { Stage: toColId } }),
      })
    } catch {
      // Revert on network failure
      setStageOverrides(prev => { const n = { ...prev }; delete n[id]; return n })
    }
  }

  /* Card click → open modal (only if not a drag) */
  const handleLeadClick = (lead: KanbanLead) => {
    if (Date.now() - mouseDownTime > 200) return
    setSelectedLead({
      id:        lead.id,
      email:     lead.email,
      name:      lead.name,
      stage:     lead.stage,
      timezone:  lead.timezone,
      phone:     lead.phone,
      company:   lead.company,
      website:   lead.website,
      dealValue: lead.dealValue > 0 ? `$${lead.dealValue.toLocaleString()}` : '-',
      source:    lead.source || 'direct',
      medium:    lead.medium || '-',
      created:   lead.date,
    })
    setIsModalOpen(true)
  }

  /* Modal save: PATCH all editable fields back to Airtable */
  const handleModalSave = async (updatedLead: any) => {
    const id = selectedLead?.id
    if (id) {
      // Apply stage override optimistically if stage changed
      if (updatedLead.stage && updatedLead.stage !== selectedLead.stage) {
        setStageOverrides(prev => ({ ...prev, [id]: updatedLead.stage }))
      }
      try {
        const dealNum = parseCurrency(updatedLead.dealValue)
        await fetch(`/api/airtable/leads/${id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              'Stage':                updatedLead.stage,
              'UTM Source':           updatedLead.source,
              'UTM Medium':           updatedLead.medium,
              'Website':              updatedLead.website,
              'Phone Number':         updatedLead.phone,
              'Company / Brand Name': updatedLead.company,
              ...(dealNum > 0 && { 'Deal Value': dealNum }),
            },
          }),
        })
      } catch { /* silent — SWR revalidation will correct any inconsistency */ }
    }
    setIsModalOpen(false)
    setSelectedLead(null)
  }

  const statCards = [
    { label: "Total Leads",  value: isLoading ? '—' : String(statValues.total) },
    { label: "In Pipeline",  value: isLoading ? '—' : String(statValues.inPipeline) },
    { label: "Closed",       value: isLoading ? '—' : String(statValues.closed) },
    { label: "At Risk",      value: isLoading ? '—' : String(statValues.atRisk) },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
            <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <SelectField value={sort}         onChange={setSort}         options={SORT_OPTS} />
        <SelectField value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTS} />
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {cols.map((col) => (
          <div key={col.id} className="flex flex-col min-w-[260px] w-[260px] shrink-0">

            {/* Column header */}
            <div className="flex items-center gap-2 px-1 mb-3">
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", col.dotColor)} />
              <span className="text-[13px] font-semibold text-foreground">{col.label}</span>
              <span className="text-[12px] text-muted-foreground ml-auto tabular-nums">
                {isLoading ? '—' : `${col.leads.length} leads`}
              </span>
            </div>

            {/* Drop zone */}
            <div
              className="flex flex-col gap-2 min-h-[200px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
            >
              {isLoading ? (
                /* Skeleton cards while loading */
                Array.from({ length: col.id === 'Open' ? 3 : 1 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2">
                    <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                    <div className="h-2.5 w-1/2 bg-muted animate-pulse rounded mt-1" />
                  </div>
                ))
              ) : col.leads.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border bg-accent/20 flex items-center justify-center py-12 text-[12px] text-muted-foreground">
                  Drop leads here
                </div>
              ) : (
                col.leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onMouseDown={() => setMouseDownTime(Date.now())}
                    onDragStart={() => { setDraggedId(lead.id); setDragFromCol(col.id) }}
                    onDragEnd={() => { setDraggedId(null); setDragFromCol(null) }}
                    onClick={() => handleLeadClick(lead)}
                    className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm hover:border-muted-foreground/30 transition-all cursor-grab active:cursor-grabbing active:opacity-50"
                  >
                    {lead.name && (
                      <span className="text-[13px] font-medium text-foreground leading-snug">
                        {lead.name}
                      </span>
                    )}
                    <span className="text-[12px] text-muted-foreground truncate">{lead.email}</span>
                    {lead.website && (
                      <span className="text-[12px] text-sky-600 truncate flex items-center gap-1">
                        {lead.website}
                        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                      </span>
                    )}
                    <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
                      <span className="text-[11px] text-muted-foreground">{lead.source || 'direct'}</span>
                      <span className="text-[11px] text-muted-foreground/40">&bull;</span>
                      <span className="text-[11px] text-muted-foreground">{lead.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={isModalOpen}
        lead={selectedLead}
        onClose={() => { setIsModalOpen(false); setSelectedLead(null) }}
        onSave={handleModalSave}
        onDelete={() => { setIsModalOpen(false); setSelectedLead(null) }}
      />
    </div>
  )
}
