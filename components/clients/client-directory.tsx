"use client"

import { useState, useMemo, useEffect, useRef, Fragment } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, Pencil, Trash2, FileText, ChevronUp, ChevronDown, X, ExternalLink } from "lucide-react"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"
import { ResultsGrid } from "@/components/experiments/results-grid"
import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/shared/metric-card"
import { ContentCard } from "@/components/shared/content-card"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"

/* ── Types ── */
interface Client {
  id: string
  name: string
  status: "Active" | "Inactive"
  color: string
  planType: string
  sentiment: number | null
  mrr: number
  totalPaid: number
  ltv: number | null
  email: string
  website: string
  devHours: number | null
  closedDate: string
  churnDate: string | null
  churnReason: string | null
  churnFeedback: string | null
  slackChannelId: string
  slackMemberIds: string
  strategist: string
  designer: string
  developer: string
  qa: string
  experimentsExecuted: number
  inProgress: number
  inconclusive: number
  unsuccessful: number
  successful: number
  revenueAdded: number
  roi: string
  revenueByMonth: { month: string; revenue: number }[]
  results: { name: string; status: "Successful" | "Unsuccessful" | "Inconclusive"; mrr: string }[]
  contracts: string[]
  contactIds: string[]
}

interface Contact {
  id: string
  clientId: string
  fullName: string
  email: string
  userType: "Main Point of Contact" | "C-Suite" | "Management" | "Finance" | "Marketing" | "Legal" | "Contractor"
  slackMemberId: string
  companySlackChannelId: string
  receiveNotifications: boolean
  callRecords: number
}

interface Note {
  id: string
  note: string
  createdTime: string
}

/* ── Helpers ── */
function resolveLinkedName(fieldValue: unknown): string {
  if (!fieldValue) return ''
  if (typeof fieldValue === 'string') return fieldValue
  if (Array.isArray(fieldValue) && typeof fieldValue[0] === 'string' && !fieldValue[0].startsWith('rec')) {
    return fieldValue[0] as string
  }
  return ''
}

function parseRoi(raw: unknown): string {
  if (!raw) return '0%'
  if (typeof raw === 'number') return `${parseFloat(raw.toFixed(1))}%`
  if (typeof raw === 'string') return raw.includes('%') ? raw : `${raw}%`
  return '0%'
}

function mapToClient(r: { id: string; fields: Record<string, unknown> }): Client {
  const f = r.fields
  const status = (f['Client Status'] as string) === 'Active' ? 'Active' : 'Inactive'
  const statusColor = status === 'Active' ? 'bg-emerald-400' : 'bg-rose-300'
  return {
    id: r.id,
    name: (f['Brand Name'] as string) ?? '',
    status,
    color: statusColor,
    planType: (f['Plan Type'] as string) ?? '',
    sentiment: (f['Sentiment'] as number) ?? null,
    mrr: (f['Monthly Price'] as number) ?? 0,
    totalPaid: (f['TotalPaid'] as number) ?? 0,
    ltv: (f['LTV'] as number) ?? null,
    email: (f['Email'] as string) ?? '',
    website: (f['Website'] as string) ?? '',
    devHours: (f['Development Hours Assigned'] as number) ?? null,
    closedDate: (f['Initial Closed Date'] as string) ?? '',
    churnDate: (f['Churn Date'] as string) ?? null,
    churnReason: (f['Churn Reason'] as string) ?? null,
    churnFeedback: (f['Churn Feedback'] as string) ?? null,
    slackChannelId: (f['Slack Channel ID'] as string) ?? '',
    slackMemberIds: (f['Slack Member ID(s)'] as string) ?? '',
    // Team members — use lookup fields (Full Name from linked role field)
    strategist: resolveLinkedName(f['Full Name (from Strategist)']),
    designer: resolveLinkedName(f['Full Name (from Designer)']),
    developer: resolveLinkedName(f['Full Name (from Developer)']),
    qa: resolveLinkedName(f['Full Name (from QA)']),
    experimentsExecuted: (f['Total Tests Run'] as number) ?? 0,
    inProgress: 0, // no dedicated field
    inconclusive: 0, // no dedicated field
    unsuccessful: 0, // no dedicated field
    successful: (f['Successful Tests'] as number) ?? 0,
    revenueAdded: (f['Revenue Added (MRR) (K Format ) Rollup (from Experiments)'] as number) ?? 0,
    roi: parseRoi(f['ROI %']),
    revenueByMonth: [],
    results: [],
    contracts: [],
    contactIds: Array.isArray(f['Contacts']) ? (f['Contacts'] as string[]) : [],
  }
}


const tabs = [
  "Client Details",
  "Contacts",
  "Experiment Ideas",
  "Experiments in Schedule",
  "Experiment Results",
]


/* ── Main Component ── */
export function ClientDirectory() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const clientParam = searchParams.get("client")

  const authHeaders: HeadersInit = useMemo(() => user ? {
    'x-user-role': user.role,
    'x-user-id': user.id,
    'x-user-name': user.name,
    ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
    'Content-Type': 'application/json',
  } : { 'Content-Type': 'application/json' }, [user])

  const { data: rawClients, mutate: mutateClients, isLoading } = useAirtable<Record<string, unknown>>('clients', {
    sort: [{ field: 'Brand Name', direction: 'asc' }],
  })

  /* Optimistic overrides for client edits */
  const [clientOverrides, setClientOverrides] = useState<Record<string, Partial<Client>>>({})

  const clients = useMemo<Client[]>(() => {
    return (rawClients ?? []).map(r => {
      const base = mapToClient(r as { id: string; fields: Record<string, unknown> })
      const override = clientOverrides[r.id] ?? {}
      return { ...base, ...override }
    })
  }, [rawClients, clientOverrides])

  const [selectedId, setSelectedId] = useState<string | null>(clientParam)
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [activeTab, setActiveTab] = useState("Client Details")

  /* Auto-select first client */
  useEffect(() => {
    if (!selectedId && clients.length > 0) {
      const first = showInactive
        ? clients[0]
        : clients.find(c => c.status === 'Active') ?? clients[0]
      setSelectedId(first?.id ?? null)
    }
  }, [clients, selectedId, showInactive])

  /* Sync URL param */
  useEffect(() => {
    if (clientParam && clients.find(c => c.id === clientParam)) {
      setSelectedId(clientParam)
    }
  }, [clientParam, clients])

  const filtered = useMemo(
    () => clients.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = showInactive ? true : c.status === 'Active'
      return matchSearch && matchStatus
    }),
    [search, showInactive, clients]
  )

  const client = clients.find(c => c.id === selectedId) ?? filtered[0] ?? null

  /* Client edit save */
  const handleClientSave = async (clientId: string, data: Partial<Client>) => {
    setClientOverrides(prev => ({ ...prev, [clientId]: data }))
    try {
      await fetch(`/api/airtable/clients/${clientId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          fields: {
            ...(data.name ? { 'Brand Name': data.name } : {}),
            ...(data.email ? { 'Email': data.email } : {}),
            ...(data.website ? { 'Website': data.website } : {}),
            ...(data.slackChannelId ? { 'Slack Channel ID': data.slackChannelId } : {}),
            ...(data.planType ? { 'Plan Type': data.planType } : {}),
          },
        }),
      })
      mutateClients()
      setClientOverrides(prev => { const next = { ...prev }; delete next[clientId]; return next })
    } catch {
      setClientOverrides(prev => { const next = { ...prev }; delete next[clientId]; return next })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-muted-foreground">
        Loading client directory…
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-muted-foreground">
        No clients found.
      </div>
    )
  }

  return (
    <div className="flex gap-0 w-full h-full bg-background">
      {/* ── Sidebar ── */}
      <div className="w-[280px] shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground mb-1.5">Directory</h2>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-3 text-[12px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
            />
            <span className="text-[12px] text-muted-foreground">Show Inactive</span>
          </label>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setActiveTab("Client Details") }}
              className={cn(
                "w-full text-left px-3 py-2.5 border-l-[3px] transition-colors",
                selectedId === c.id
                  ? "bg-accent/50 border-l-sky-500"
                  : "border-l-transparent hover:bg-accent/30"
              )}
            >
              <span className="text-[13px] font-medium text-foreground block">{c.name}</span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block",
                c.status === "Active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              )}>
                {c.status}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[13px] text-muted-foreground">No clients found</div>
          )}
        </div>
      </div>

      {/* ── Detail Panel ── */}
      <div className="flex-1 min-w-0 bg-card flex flex-col overflow-hidden">
        <div className="px-8 pt-6 pb-0 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
          <h1 className="text-xl font-semibold text-foreground mb-5">{client.name}</h1>
          <div className="flex gap-6 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[13px] font-medium pb-3 border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-5">
            {activeTab === "Client Details" && (
              <ClientDetailsTab client={client} authHeaders={authHeaders} onSave={handleClientSave} />
            )}
            {activeTab === "Contacts" && (
              <ContactsTab clientId={client.id} clientName={client.name} contactIds={client.contactIds} authHeaders={authHeaders} />
            )}
            {activeTab === "Experiment Ideas" && (
              <ExperimentIdeasTab clientId={client.id} />
            )}
            {activeTab === "Experiments in Schedule" && (
              <ExperimentsScheduleTab clientId={client.id} />
            )}
            {activeTab === "Experiment Results" && (
              <ExperimentResultsTab client={client} clientId={client.id} clientName={client.name} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Client Details Tab ── */
function ClientDetailsTab({
  client,
  authHeaders,
  onSave,
}: {
  client: Client
  authHeaders: HeadersInit
  onSave: (clientId: string, data: Partial<Client>) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email,
    website: client.website,
    slackChannelId: client.slackChannelId,
    planType: client.planType,
    strategist: client.strategist,
    designer: client.designer,
    developer: client.developer,
    qa: client.qa,
  })

  // Sync form when client changes
  useEffect(() => {
    setFormData({
      name: client.name, email: client.email, website: client.website,
      slackChannelId: client.slackChannelId, planType: client.planType,
      strategist: client.strategist, designer: client.designer,
      developer: client.developer, qa: client.qa,
    })
    setIsEditing(false)
  }, [client.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Fetch live team members for dropdowns — no fields[] to avoid 422 */
  const { data: rawTeam } = useAirtable<Record<string, unknown>>('team', {
    sort: [{ field: 'Full Name', direction: 'asc' }],
    enabled: isEditing,
  })

  const teamByDept = useMemo(() => {
    return {
      strategists: (rawTeam ?? [])
        .filter(r => (r.fields['Employment Status'] as string) === 'Active' && r.fields['Department'] === 'Strategy')
        .map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
      designers: (rawTeam ?? [])
        .filter(r => (r.fields['Employment Status'] as string) === 'Active' && r.fields['Department'] === 'Design')
        .map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
      developers: (rawTeam ?? [])
        .filter(r => (r.fields['Employment Status'] as string) === 'Active' && r.fields['Department'] === 'Development')
        .map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
      qa: (rawTeam ?? [])
        .filter(r => (r.fields['Employment Status'] as string) === 'Active' && r.fields['Department'] === 'QA')
        .map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
    }
  }, [rawTeam])

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(client.id, {
      name: formData.name,
      email: formData.email,
      website: formData.website,
      slackChannelId: formData.slackChannelId,
      planType: formData.planType,
    })
    setIsSaving(false)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-accent hover:bg-accent/80 border border-border px-3.5 text-[12px] font-medium transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false)
                setFormData({
                  name: client.name, email: client.email, website: client.website,
                  slackChannelId: client.slackChannelId, planType: client.planType,
                  strategist: client.strategist, designer: client.designer,
                  developer: client.developer, qa: client.qa,
                })
              }}
              className="h-8 rounded-lg bg-muted hover:bg-muted/80 px-3.5 text-[12px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 rounded-lg bg-foreground hover:opacity-90 text-background px-3.5 text-[12px] font-medium transition-opacity disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <>
          <ContentCard title="Client Details">
            <ClientDetailsInline client={client} />
          </ContentCard>
          <CollapsibleSection title="Team">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Strategist" value={client.strategist || "—"} />
              <DetailField label="Designer" value={client.designer || "—"} />
              <DetailField label="Developer" value={client.developer || "—"} />
              <DetailField label="QA" value={client.qa || "—"} />
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Contracts">
            {client.contracts.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No contracts on file</p>
            ) : (
              <div className="space-y-2">
                {client.contracts.map((c, i) => (
                  <button key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors w-full text-left">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-[13px] text-foreground truncate">{c}</span>
                  </button>
                ))}
              </div>
            )}
          </CollapsibleSection>
          <NotesSection clientId={client.id} authHeaders={authHeaders} />
        </>
      ) : (
        <>
          <ContentCard title="Basic Information">
            <div className="space-y-4 p-5">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Brand Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Slack Channel ID</label>
                  <input
                    type="text"
                    value={formData.slackChannelId}
                    onChange={(e) => setFormData({ ...formData, slackChannelId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="C09NTD9QDJR"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Plan Type</label>
                  <input
                    type="text"
                    value={formData.planType}
                    onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="3 Tests"
                  />
                </div>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Team Members">
            <div className="grid grid-cols-2 gap-4 p-5">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Strategist</label>
                <SelectField
                  value={formData.strategist}
                  onChange={(v) => setFormData({ ...formData, strategist: v })}
                  options={teamByDept.strategists.length > 0 ? teamByDept.strategists : [formData.strategist].filter(Boolean)}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Designer</label>
                <SelectField
                  value={formData.designer}
                  onChange={(v) => setFormData({ ...formData, designer: v })}
                  options={teamByDept.designers.length > 0 ? teamByDept.designers : [formData.designer].filter(Boolean)}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Developer</label>
                <SelectField
                  value={formData.developer}
                  onChange={(v) => setFormData({ ...formData, developer: v })}
                  options={teamByDept.developers.length > 0 ? teamByDept.developers : [formData.developer].filter(Boolean)}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">QA</label>
                <SelectField
                  value={formData.qa}
                  onChange={(v) => setFormData({ ...formData, qa: v })}
                  options={teamByDept.qa.length > 0 ? teamByDept.qa : [formData.qa].filter(Boolean)}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
            </div>
          </ContentCard>
        </>
      )}
    </div>
  )
}

function ClientDetailsInline({ client }: { client: Client }) {
  return (
    <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-6">
      <DetailField label="Email" value={client.email || "—"} />
      <DetailField label="Website" value={client.website || "—"} />
      <DetailField label="Slack Channel ID" value={client.slackChannelId || "—"} />
      <DetailField label="Plan Type" value={client.planType || "—"} />
      <DetailField label="Dev Hours" value={client.devHours ? `${client.devHours} hrs` : "—"} />
      <DetailField label="Closed Date" value={client.closedDate || "—"} />
      {client.churnDate && <DetailField label="Churn Date" value={client.churnDate} />}
      {client.churnReason && <DetailField label="Churn Reason" value={client.churnReason} />}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
      {typeof value === 'string'
        ? <p className="text-[14px] text-foreground">{value}</p>
        : <div>{value}</div>
      }
    </div>
  )
}

/* ── Notes Section (inside Client Details) ── */
function NotesSection({ clientId, authHeaders }: { clientId: string; authHeaders: HeadersInit }) {
  const { data: rawNotes, mutate } = useAirtable<Record<string, unknown>>('notes', {
    filterExtra: `FIND("${clientId}", CONCATENATE({Client})) > 0`,
    sort: [{ field: 'Created Time', direction: 'desc' }],
  })

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [optimisticNotes, setOptimisticNotes] = useState<Note[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [newNote, setNewNote] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const notes = useMemo<Note[]>(() => {
    const fetched = (rawNotes ?? [])
      .filter(r => !deletedIds.has(r.id))
      .map(r => ({
        id: r.id,
        note: (r.fields['Note'] as string) ?? '',
        createdTime: r.createdTime ?? (r.fields['Created Time'] as string) ?? '',
      }))
    return [...optimisticNotes, ...fetched.filter(n => !optimisticNotes.find(o => o.id === n.id))]
  }, [rawNotes, deletedIds, optimisticNotes])

  const formatDate = (ts: string) => {
    if (!ts) return ''
    try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return ts }
  }

  const handleAdd = async () => {
    const text = newNote.trim()
    if (!text) return
    const tempId = `temp_${Date.now()}`
    const optimistic: Note = { id: tempId, note: text, createdTime: new Date().toISOString() }
    setOptimisticNotes(prev => [optimistic, ...prev])
    setNewNote("")
    setIsAdding(false)
    try {
      await fetch('/api/airtable/notes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Note': text, 'Client': [clientId] } }),
      })
      setOptimisticNotes(prev => prev.filter(n => n.id !== tempId))
      mutate()
    } catch {
      setOptimisticNotes(prev => prev.filter(n => n.id !== tempId))
    }
  }

  const handleEdit = async (note: Note) => {
    const text = editText.trim()
    if (!text || text === note.note) { setEditingId(null); return }
    setEditingId(null)
    try {
      await fetch(`/api/airtable/notes/${note.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Note': text } }),
      })
      mutate()
    } catch { mutate() }
  }

  const handleDelete = async (noteId: string) => {
    setDeletedIds(prev => new Set([...prev, noteId]))
    try {
      await fetch(`/api/airtable/notes/${noteId}`, { method: 'DELETE', headers: authHeaders })
      mutate()
      setDeletedIds(prev => { const s = new Set(prev); s.delete(noteId); return s })
    } catch {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(noteId); return s })
    }
  }

  return (
    <CollapsibleSection title="Notes">
      <div className="flex flex-col gap-3">
        {/* Add note toggle */}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-sky-600 hover:text-sky-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Note
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write a note about this client…"
              className="w-full min-h-[80px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={!newNote.trim()}
                className="h-7 px-3 rounded-lg bg-foreground text-background text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Add
              </button>
              <button
                onClick={() => { setIsAdding(false); setNewNote("") }}
                className="h-7 px-3 rounded-lg border border-border text-[12px] font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {notes.length === 0 && !isAdding && (
          <p className="text-[13px] text-muted-foreground/60">No notes yet</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="group flex flex-col gap-1 p-3 rounded-lg bg-background border border-border">
            {editingId === note.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[60px] px-2 py-1 rounded-md border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="h-6 px-2.5 rounded-md bg-foreground text-background text-[11px] font-medium hover:opacity-90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="h-6 px-2.5 rounded-md border border-border text-[11px] font-medium hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] text-foreground whitespace-pre-wrap flex-1">{note.note}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditingId(note.id); setEditText(note.note) }}
                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                      title="Edit note"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
                {note.createdTime && (
                  <p className="text-[11px] text-muted-foreground">{formatDate(note.createdTime)}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  )
}

/* ── Contacts Tab ── */
function ContactsTab({
  clientId,
  clientName,
  contactIds,
  authHeaders,
}: {
  clientId: string
  clientName: string
  contactIds: string[]
  authHeaders: HeadersInit
}) {
  // Filter contacts by matching the Brand Name linked field to this client's name.
  // In Airtable filterByFormula, linked fields evaluate to the primary field text value.
  const { data: rawContacts, mutate } = useAirtable<Record<string, unknown>>('contacts', {
    filterExtra: `{Brand Name} = "${clientName}"`,
    enabled: !!clientName,
  })

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [optimisticContacts, setOptimisticContacts] = useState<Contact[]>([])
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)

  const contacts = useMemo<Contact[]>(() => {
    const fetched = (rawContacts ?? [])
      .filter(r => !deletedIds.has(r.id))
      .map(r => {
        const f = r.fields as Record<string, unknown>
        return {
          id: r.id,
          clientId,
          fullName: (f['Full Name'] as string) ?? '',
          email: (f['User Email'] as string) ?? '',
          userType: ((f['User Type'] as string) ?? 'Main Point of Contact') as Contact['userType'],
          slackMemberId: (f['User Slack Member ID'] as string) ?? '',
          companySlackChannelId: (f['Company Slack Channel ID'] as string) ?? '',
          receiveNotifications: Boolean(f['Receive Notifications']),
          callRecords: 0,
        }
      })
    return [
      ...optimisticContacts,
      ...fetched.filter(c => !optimisticContacts.find(o => o.id === c.id)),
    ]
  }, [rawContacts, deletedIds, clientId, optimisticContacts])

  const userTypeOptions = ["Main Point of Contact", "C-Suite", "Management", "Finance", "Marketing", "Legal", "Contractor"] as const

  const handleDelete = async (contact: Contact) => {
    setDeletedIds(prev => new Set([...prev, contact.id]))
    setDeletingContact(null)
    try {
      await fetch(`/api/airtable/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      mutate()
      setDeletedIds(prev => { const s = new Set(prev); s.delete(contact.id); return s })
    } catch {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(contact.id); return s })
    }
  }

  const handleSaveContact = async (data: Omit<Contact, 'id'>, existingId?: string) => {
    if (existingId) {
      try {
        await fetch(`/api/airtable/contacts/${existingId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            fields: {
              'Full Name': data.fullName,
              'User Email': data.email,
              'User Type': data.userType,
              'User Slack Member ID': data.slackMemberId,
              'Company Slack Channel ID': data.companySlackChannelId,
              'Receive Notifications': data.receiveNotifications,
            },
          }),
        })
        mutate()
      } catch { mutate() }
    } else {
      // Optimistic add
      const tempId = `temp_${Date.now()}`
      const optimistic: Contact = { ...data, id: tempId }
      setOptimisticContacts(prev => [...prev, optimistic])
      try {
        await fetch('/api/airtable/contacts', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            fields: {
              'Full Name': data.fullName,
              'User Email': data.email,
              'User Type': data.userType,
              'User Slack Member ID': data.slackMemberId,
              'Company Slack Channel ID': data.companySlackChannelId,
              'Receive Notifications': data.receiveNotifications,
              'Brand Name': [clientId],
            },
          }),
        })
        setOptimisticContacts(prev => prev.filter(c => c.id !== tempId))
        mutate()
      } catch {
        setOptimisticContacts(prev => prev.filter(c => c.id !== tempId))
      }
    }
    setIsAddingContact(false)
    setEditingContact(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsAddingContact(true)}
          className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-foreground hover:opacity-90 text-background px-3.5 text-[12px] font-medium transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[13px] text-muted-foreground mb-2">No contacts yet</p>
          <button
            onClick={() => setIsAddingContact(true)}
            className="text-[12px] font-medium text-sky-600 hover:text-sky-700"
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">User Type</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Slack Member ID</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Notifications</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b last:border-0 border-border hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-foreground">{contact.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-border bg-accent text-foreground">
                      {contact.userType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{contact.slackMemberId || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {contact.receiveNotifications ? (
                      <span className="text-emerald-600 text-[11px] font-medium">Yes</span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingContact(contact)}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                        title="Edit Contact"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeletingContact(contact)}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddingContact || editingContact) && (
        <ContactModal
          contact={editingContact}
          clientId={clientId}
          clientName={clientName}
          userTypeOptions={userTypeOptions}
          onSave={handleSaveContact}
          onCancel={() => { setIsAddingContact(false); setEditingContact(null) }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full flex flex-col gap-4">
            <h3 className="text-[15px] font-semibold text-foreground">Delete Contact?</h3>
            <p className="text-[13px] text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{deletingContact.fullName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingContact(null)}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingContact)}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Contact Modal ── */
function ContactModal({
  contact,
  clientId,
  clientName,
  userTypeOptions,
  onSave,
  onCancel,
}: {
  contact: Contact | null
  clientId: string
  clientName: string
  userTypeOptions: readonly string[]
  onSave: (data: Omit<Contact, 'id'>, existingId?: string) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Omit<Contact, 'id'>>(
    contact
      ? { ...contact }
      : {
          clientId,
          fullName: "",
          email: "",
          userType: "Main Point of Contact",
          slackMemberId: "",
          companySlackChannelId: "",
          receiveNotifications: true,
          callRecords: 0,
        }
  )

  const handleSubmit = () => {
    if (formData.fullName) {
      onSave(formData, contact?.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-[15px] font-semibold text-foreground">
            {contact ? "Edit Contact" : "Add Contact"}
          </h3>
          <button onClick={onCancel} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Full Name <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Company</label>
              <input
                type="text"
                value={clientName}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-muted text-muted-foreground text-[13px]"
                disabled
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">User Type</label>
              <SelectField
                value={formData.userType}
                onChange={(v) => setFormData({ ...formData, userType: v as Contact['userType'] })}
                options={userTypeOptions}
                containerClassName="w-full"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Slack Member ID</label>
              <input
                type="text"
                value={formData.slackMemberId}
                onChange={(e) => setFormData({ ...formData, slackMemberId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="U07SZ69E511"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Company Slack Channel ID</label>
              <input
                type="text"
                value={formData.companySlackChannelId}
                onChange={(e) => setFormData({ ...formData, companySlackChannelId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="C09NTD9QDJR"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.receiveNotifications}
              onChange={(e) => setFormData({ ...formData, receiveNotifications: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-foreground cursor-pointer"
            />
            <span className="text-[13px] text-foreground">Receive Notifications</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.fullName}
            className={cn(
              "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-opacity",
              formData.fullName
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-foreground/30 text-background cursor-not-allowed"
            )}
          >
            {contact ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Experiment Ideas Tab ── */
const ideaGoalColors: Record<string, string> = {
  CVR: "bg-sky-50 text-sky-700 border-sky-200",
  ATC: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RPV: "bg-violet-50 text-violet-700 border-violet-200",
  AOV: "bg-amber-50 text-amber-700 border-amber-200",
  PPV: "bg-rose-50 text-rose-700 border-rose-200",
  CTR: "bg-teal-50 text-teal-700 border-teal-200",
  SCVR: "bg-indigo-50 text-indigo-700 border-indigo-200",
}

function ExperimentIdeasTab({ clientId }: { clientId: string }) {
  const { data: rawIdeas, isLoading } = useAirtable<Record<string, unknown>>('experiment-ideas', {
    // Match via Brand Name linked field (set on unsynced ideas) OR the batch-derived lookup
    filterExtra: `OR(FIND("${clientId}", CONCATENATE({Brand Name})) > 0, FIND("${clientId}", CONCATENATE({Record ID (from Brand Name)})) > 0)`,
    sort: [{ field: 'Last Modified', direction: 'desc' }],
  })

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const ideas = useMemo(() => (rawIdeas ?? []).map(r => {
    const f = r.fields as Record<string, unknown>
    const goalsRaw = f['Category Primary Goals']
    const goals = Array.isArray(goalsRaw)
      ? (goalsRaw as string[])
      : typeof goalsRaw === 'string' && goalsRaw
        ? goalsRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
    const priorityRaw = f['Confidence Level']
    const priority = typeof priorityRaw === 'number'
      ? priorityRaw
      : typeof priorityRaw === 'string' ? parseFloat(priorityRaw) || 0 : 0
    return {
      id: r.id,
      description: (f['Test Description'] as string) ?? '',
      hypothesis: (f['Hypothesis'] as string) ?? '',
      rationale: (f['Rationale'] as string) ?? '',
      placement: (f['Placement'] as string) ?? '',
      placementUrl: (f['Placement URL'] as string) ?? '',
      devices: (f['Devices'] as string) ?? '',
      geos: (f['GEOs'] as string) ?? '',
      goals,
      priority,
    }
  }), [rawIdeas])

  if (isLoading) return <LoadingRow />
  if (ideas.length === 0) return <EmptyState label="No experiment ideas yet" />

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="w-8 px-0 pl-3 py-3" />
            <th className="px-4 py-3 text-left font-semibold text-foreground">Test Description</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Placement</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Primary Goals</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Priority</th>
          </tr>
        </thead>
        <tbody>
          {ideas.map((idea) => {
            const isExpanded = expandedRows.has(idea.id)
            return (
              <Fragment key={idea.id}>
                <tr
                  onClick={() => toggleRow(idea.id)}
                  className="border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <td className="w-8 px-0 pl-3 py-3.5 align-middle">
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </td>
                  <td className="px-4 py-3.5 text-foreground max-w-[280px] align-middle">
                    <span className="block truncate font-medium">{idea.description || "—"}</span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground align-middle whitespace-nowrap">
                    {idea.placement || "—"}
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex flex-wrap gap-1">
                      {idea.goals.length > 0 ? idea.goals.map(g => (
                        <span
                          key={g}
                          className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border", ideaGoalColors[g] ?? "bg-accent text-foreground border-border")}
                        >
                          {g}
                        </span>
                      )) : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    {idea.priority > 0 ? (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-2 w-4 rounded-sm",
                              i < idea.priority
                                ? idea.priority >= 4 ? "bg-emerald-500"
                                  : idea.priority >= 3 ? "bg-amber-400"
                                  : "bg-rose-400"
                                : "bg-muted"
                            )}
                          />
                        ))}
                        <span className="ml-1 text-[11px] font-medium text-muted-foreground">{idea.priority}/5</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b border-border">
                    <td colSpan={5} className="bg-accent/20 px-5 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-4">
                        {idea.hypothesis && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hypothesis</span>
                            <p className="text-[13px] text-foreground leading-relaxed">{idea.hypothesis}</p>
                          </div>
                        )}
                        {idea.rationale && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rationale</span>
                            <p className="text-[13px] text-foreground leading-relaxed">{idea.rationale}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-6 pl-4 mt-4">
                        {idea.placementUrl && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">URL</span>
                            <a
                              href={idea.placementUrl.startsWith('http') ? idea.placementUrl : `https://${idea.placementUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[12px] text-sky-600 hover:underline inline-flex items-center gap-1"
                            >
                              <span className="truncate max-w-[200px]">{idea.placementUrl}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                        )}
                        {idea.devices && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Devices</span>
                            <p className="text-[13px] text-foreground">{idea.devices}</p>
                          </div>
                        )}
                        {idea.geos && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">GEOs</span>
                            <p className="text-[13px] text-foreground">{idea.geos}</p>
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
  )
}

/* ── Experiments in Schedule Tab ── */
function ExperimentsScheduleTab({ clientId }: { clientId: string }) {
  const { data: rawExps, isLoading } = useAirtable<Record<string, unknown>>('experiments', {
    filterExtra: `AND(FIND("${clientId}", CONCATENATE({Record ID (from Brand Name)})) > 0, OR({Test Status} = "Live - Collecting Data", {Test Status} = "Pending Launch", {Test Status} = "In Queue"))`,
    sort: [{ field: 'Launch Date', direction: 'desc' }],
  })

  const [selectedExp, setSelectedExp] = useState<Record<string, unknown> | null>(null)

  const experiments = useMemo(() => (rawExps ?? []).map(r => {
    const f = r.fields as Record<string, unknown>
    const goalsRaw = f['Category Primary Goals'] ?? f['Primary Goal']
    const goals = Array.isArray(goalsRaw)
      ? (goalsRaw as string[])
      : typeof goalsRaw === 'string' && goalsRaw ? goalsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    return {
      id: r.id,
      description: (f['Test Description'] as string) ?? '',
      status: (f['Test Status'] as string) ?? '',
      launchDate: (f['Launch Date'] as string) ?? '',
      endDate: (f['End Date'] as string) ?? '',
      placement: (f['Placement'] as string) ?? '',
      placementUrl: (f['Placement URL'] as string) ?? '',
      devices: Array.isArray(f['Devices']) ? (f['Devices'] as string[]).join(', ') : ((f['Devices'] as string) ?? ''),
      geos: Array.isArray(f['GEOs']) ? (f['GEOs'] as string[]).join(', ') : ((f['GEOs'] as string) ?? ''),
      hypothesis: (f['Hypothesis'] as string) ?? '',
      rationale: (f['Rationale'] as string) ?? '',
      goals,
      _raw: f,
    }
  }), [rawExps])

  if (isLoading) return <LoadingRow />
  if (experiments.length === 0) return <EmptyState label="No active experiments" />

  const selected = selectedExp
    ? experiments.find(e => e.id === (selectedExp as { id: string }).id) ?? null
    : null

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Test</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Launch Date</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Placement</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((exp) => (
              <tr
                key={exp.id}
                onClick={() => setSelectedExp(exp)}
                className="border-b last:border-0 border-border hover:bg-accent/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-foreground max-w-[250px]">
                  <p className="line-clamp-2 font-medium">{exp.description || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={exp.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{exp.launchDate || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{exp.placement || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ExperimentDetailsModal
          isOpen={true}
          experiment={{
            name: selected.description,
            description: selected.description,
            status: selected.status,
            placement: selected.placement,
            placementUrl: selected.placementUrl,
            devices: selected.devices,
            geos: selected.geos,
            variants: '',
            revenue: '',
            primaryGoals: selected.goals,
            hypothesis: selected.hypothesis,
            rationale: selected.rationale,
            launchDate: selected.launchDate,
            endDate: selected.endDate,
          }}
          onClose={() => setSelectedExp(null)}
        />
      )}
    </>
  )
}

/* ── Experiment Results Tab ── */
function ExperimentResultsTab({ client, clientId, clientName }: { client: Client; clientId: string; clientName: string }) {
  return (
    <div className="flex flex-col gap-5">
      {/* ── Summary metrics (merged from former Client Results tab) ── */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Tests Run" value={client.experimentsExecuted} />
        <MetricCard label="Successful Tests" value={client.successful} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Revenue Added" value={client.revenueAdded > 0 ? `$${client.revenueAdded.toLocaleString()}` : '$0'} />
        <MetricCard label="ROI" value={client.roi} />
        <MetricCard label="Sentiment" value={client.sentiment !== null ? `${client.sentiment}/5` : '—'} />
      </div>
      {/* ── Results grid (client pre-filtered, no client dropdown) ── */}
      <ResultsGrid initialClientName={clientName} hideClientFilter />
    </div>
  )
}

/* ── Shared UI helpers ── */
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const cls = s.includes('successful') && !s.includes('un')
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s.includes('unsuccessful') || s.includes('live')
    ? s.includes('live')
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : "bg-rose-50 text-rose-700 border-rose-200"
    : s.includes('inconclusive')
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : s.includes('pending') || s.includes('queue')
    ? "bg-violet-50 text-violet-700 border-violet-200"
    : "bg-muted text-muted-foreground border-border"
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", cls)}>
      {status || "—"}
    </span>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-12 text-[13px] text-muted-foreground">
      Loading…
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-[13px] text-muted-foreground">{label}</p>
    </div>
  )
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 py-3 border-t border-border bg-background/50">{children}</div>}
    </div>
  )
}

function StatCard({ label, value, small }: { label: string; value: string | number | React.ReactNode; small?: boolean }) {
  return (
    <MetricCard
      label={label}
      value={value}
      small={small}
    />
  )
}
