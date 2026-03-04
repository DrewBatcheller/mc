"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Star, FileText, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/shared/metric-card"
import { ContentCard } from "@/components/shared/content-card"
import { SelectField } from "@/components/shared/select-field"
import { ResultsGrid } from "@/components/experiments/results-grid"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip } from "recharts"
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
  slackChannel: string
  slackMembers: string
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
  roi: number
  revenueByMonth: { month: string; revenue: number }[]
  results: { name: string; status: "Successful" | "Unsuccessful" | "Inconclusive"; mrr: string }[]
  contracts: string[]
}

interface Contact {
  id: string
  clientId: string
  fullName: string
  email: string
  companyName: string
  userType: "Main Point of Contact" | "C-Suite" | "Management" | "Finance" | "Marketing" | "Legal" | "Contractor"
  slackMemberId: string
  companySlackChannelId: string
  receiveNotifications: boolean
  lastModified: string
  callRecords: number
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
    mrr: (f['MRR'] as number) ?? 0,
    totalPaid: (f['Total Paid'] as number) ?? 0,
    ltv: (f['LTV'] as number) ?? null,
    email: (f['Email'] as string) ?? '',
    website: (f['Website'] as string) ?? '',
    devHours: (f['Dev Hours'] as number) ?? null,
    closedDate: (f['Closed Date'] as string) ?? '',
    churnDate: (f['Churn Date'] as string) ?? null,
    churnReason: (f['Churn Reason'] as string) ?? null,
    churnFeedback: (f['Churn Feedback'] as string) ?? null,
    slackChannel: (f['Slack Channel'] as string) ?? '',
    slackMembers: (f['Slack Members'] as string) ?? '',
    // Team members: try lookup fields first, then linked field name resolution
    strategist: (f['Strategist Name'] as string) || resolveLinkedName(f['Strategist']),
    designer: (f['Designer Name'] as string) || resolveLinkedName(f['Designer']),
    developer: (f['Developer Name'] as string) || resolveLinkedName(f['Developer']),
    qa: (f['QA Name'] as string) || resolveLinkedName(f['QA']),
    experimentsExecuted: (f['Experiments Executed'] as number) ?? 0,
    inProgress: (f['Experiments In Progress'] as number) ?? 0,
    inconclusive: (f['Inconclusive'] as number) ?? 0,
    unsuccessful: (f['Unsuccessful'] as number) ?? 0,
    successful: (f['Successful'] as number) ?? 0,
    revenueAdded: (f['Revenue Added'] as number) ?? 0,
    roi: (f['ROI'] as number) ?? 0,
    revenueByMonth: [],
    results: [],
    contracts: [],
  }
}

const tip = {
  fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", backgroundColor: "white",
}

const tabs = [
  "Client Results",
  "Client Details",
  "Contacts",
  "Experiment Ideas",
  "Experiments in Schedule",
  "Experiment Results",
]

const statusColors = {
  Successful: { bg: "bg-emerald-50", color: "text-emerald-700", border: "border-emerald-200" },
  Unsuccessful: { bg: "bg-rose-50", color: "text-rose-700", border: "border-rose-200" },
  Inconclusive: { bg: "bg-amber-50", color: "text-amber-700", border: "border-amber-200" },
} as const

function Stars({ count }: { count: number | null }) {
  if (count === null) return <span className="text-[12px] text-muted-foreground">-</span>
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          )}
        />
      ))}
    </div>
  )
}

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
    fields: [
      'Brand Name', 'Client Status', 'Email', 'Website', 'Slack Channel',
      'Plan Type', 'Sentiment', 'MRR', 'Total Paid', 'LTV',
      'Dev Hours', 'Closed Date', 'Churn Date', 'Churn Reason', 'Churn Feedback',
      'Slack Members',
      // Team member linked fields + lookup names
      'Strategist', 'Strategist Name',
      'Designer', 'Designer Name',
      'Developer', 'Developer Name',
      'QA', 'QA Name',
      // Experiment count formula fields (may not exist in all bases)
      'Experiments Executed', 'Experiments In Progress', 'Successful', 'Unsuccessful', 'Inconclusive',
      'Revenue Added', 'ROI',
    ],
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
  const [activeTab, setActiveTab] = useState("Client Results")

  /* Auto-select first client */
  useEffect(() => {
    if (!selectedId && clients.length > 0) {
      setSelectedId(clients[0].id)
    }
  }, [clients, selectedId])

  /* Sync URL param */
  useEffect(() => {
    if (clientParam && clients.find(c => c.id === clientParam)) {
      setSelectedId(clientParam)
    }
  }, [clientParam, clients])

  const filtered = useMemo(
    () => clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [search, clients]
  )

  const client = clients.find(c => c.id === selectedId) ?? clients[0] ?? null

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
            ...(data.slackChannel ? { 'Slack Channel': data.slackChannel } : {}),
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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-3 text-[12px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setActiveTab("Client Results") }}
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
            {activeTab === "Client Results" && <ClientResultsTab client={client} />}
            {activeTab === "Client Details" && (
              <ClientDetailsTab client={client} authHeaders={authHeaders} onSave={handleClientSave} />
            )}
            {activeTab === "Contacts" && (
              <ContactsTab clientId={client.id} clientName={client.name} slackChannel={client.slackChannel} authHeaders={authHeaders} />
            )}
            {activeTab === "Experiment Ideas" && <EmptyTab label="No ideas yet" action="Add Test Idea" />}
            {activeTab === "Experiments in Schedule" && <EmptyTab label="No records yet" />}
            {activeTab === "Experiment Results" && <ExperimentResultsTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Client Results Tab ── */
function ClientResultsTab({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Experiments Executed" value={client.experimentsExecuted} />
        <StatCard label="Experiments in Progress" value={client.inProgress} />
      </div>
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Inconclusive" value={client.inconclusive} small />
        <StatCard label="Unsuccessful" value={client.unsuccessful} small />
        <StatCard label="Successful" value={client.successful} small />
        <StatCard label="Revenue Added (MRR)" value={`$${client.revenueAdded % 1 === 0 ? client.revenueAdded.toFixed(0) : client.revenueAdded.toFixed(2)}M`} small />
        <StatCard label="ROI" value={`${client.roi}%`} small />
      </div>
      {client.revenueByMonth.length > 0 && (
        <ContentCard title="Revenue Added by Month">
          <div className="p-5 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={client.revenueByMonth}>
                <CartesianGrid vertical={false} stroke="hsl(220,13%,91%)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(200,80%,55%)" dot={{ fill: "hsl(200,80%,55%)", r: 4 }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>
      )}
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
    slackChannel: client.slackChannel,
    planType: client.planType,
    strategist: client.strategist,
    designer: client.designer,
    developer: client.developer,
    qa: client.qa,
    notes: ""
  })

  // Sync form when client changes
  useEffect(() => {
    setFormData({
      name: client.name, email: client.email, website: client.website,
      slackChannel: client.slackChannel, planType: client.planType,
      strategist: client.strategist, designer: client.designer,
      developer: client.developer, qa: client.qa, notes: ""
    })
    setIsEditing(false)
  }, [client.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Fetch live team members for dropdowns */
  const { data: rawTeam } = useAirtable<Record<string, unknown>>('team', {
    fields: ['Full Name', 'Department', 'Status'],
    enabled: isEditing,
  })

  const teamByDept = useMemo(() => {
    const all = (rawTeam ?? []).map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean)
    return {
      strategists: (rawTeam ?? []).filter(r => r.fields['Department'] === 'Strategy').map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
      designers: (rawTeam ?? []).filter(r => r.fields['Department'] === 'Design').map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
      developers: (rawTeam ?? []).filter(r => r.fields['Department'] === 'Development').map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
      qa: (rawTeam ?? []).filter(r => r.fields['Department'] === 'QA').map(r => (r.fields['Full Name'] as string) ?? '').filter(Boolean),
    }
  }, [rawTeam])

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(client.id, {
      name: formData.name,
      email: formData.email,
      website: formData.website,
      slackChannel: formData.slackChannel,
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
                  slackChannel: client.slackChannel, planType: client.planType,
                  strategist: client.strategist, designer: client.designer,
                  developer: client.developer, qa: client.qa, notes: ""
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
          <ContentCard title="Notes">
            <div className="min-h-[80px] text-[13px] text-muted-foreground/50 p-5">
              {formData.notes || "No notes"}
            </div>
          </ContentCard>
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
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Slack Channel</label>
                  <input
                    type="text"
                    value={formData.slackChannel}
                    onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
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

          <ContentCard title="Notes">
            <div className="p-5">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full min-h-[120px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="Add notes about this client…"
              />
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
      <DetailField label="Slack Channel" value={client.slackChannel || "—"} />
      <DetailField label="Plan Type" value={client.planType || "—"} />
      <DetailField label="Dev Hours" value={client.devHours ? `${client.devHours} hrs` : "—"} />
      <DetailField label="Closed Date" value={client.closedDate || "—"} />
      {client.churnDate && <DetailField label="Churn Date" value={client.churnDate} />}
      {client.churnReason && <DetailField label="Churn Reason" value={client.churnReason} />}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-[14px] text-foreground">{value}</p>
    </div>
  )
}

/* ── Contacts Tab ── */
function ContactsTab({
  clientId,
  clientName,
  slackChannel,
  authHeaders,
}: {
  clientId: string
  clientName: string
  slackChannel: string
  authHeaders: HeadersInit
}) {
  const { data: rawContacts, mutate } = useAirtable<Record<string, unknown>>('contacts', {
    filterExtra: `{Record ID (from Client)} = "${clientId}"`,
    fields: ['Full Name', 'Email', 'Company Name', 'User Type', 'Slack Member ID',
             'Company Slack Channel ID', 'Receive Notifications', 'Call Records'],
  })

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)

  const contacts = useMemo<Contact[]>(() => {
    return (rawContacts ?? [])
      .filter(r => !deletedIds.has(r.id))
      .map(r => {
        const f = r.fields as Record<string, unknown>
        return {
          id: r.id,
          clientId,
          fullName: (f['Full Name'] as string) ?? '',
          email: (f['Email'] as string) ?? '',
          companyName: (f['Company Name'] as string) ?? clientName,
          userType: ((f['User Type'] as string) ?? 'Main Point of Contact') as Contact['userType'],
          slackMemberId: (f['Slack Member ID'] as string) ?? '',
          companySlackChannelId: (f['Company Slack Channel ID'] as string) ?? slackChannel,
          receiveNotifications: Boolean(f['Receive Notifications']),
          lastModified: '',
          callRecords: (f['Call Records'] as number) ?? 0,
        }
      })
  }, [rawContacts, deletedIds, clientId, clientName, slackChannel])

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
    } catch {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(contact.id); return s })
    }
  }

  const handleSaveContact = async (data: Omit<Contact, 'id'>, existingId?: string) => {
    if (existingId) {
      // Edit
      try {
        await fetch(`/api/airtable/contacts/${existingId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            fields: {
              'Full Name': data.fullName,
              'Email': data.email,
              'Company Name': data.companyName,
              'User Type': data.userType,
              'Slack Member ID': data.slackMemberId,
              'Company Slack Channel ID': data.companySlackChannelId,
              'Receive Notifications': data.receiveNotifications,
            },
          }),
        })
        mutate()
      } catch { /* mutate will reconcile */ }
    } else {
      // Create
      try {
        await fetch('/api/airtable/contacts', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            fields: {
              'Full Name': data.fullName,
              'Email': data.email,
              'Company Name': data.companyName,
              'User Type': data.userType,
              'Slack Member ID': data.slackMemberId,
              'Company Slack Channel ID': data.companySlackChannelId,
              'Receive Notifications': data.receiveNotifications,
              'Client': [clientId],
            },
          }),
        })
        mutate()
      } catch { /* mutate will reconcile */ }
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
                <th className="px-4 py-3 text-center font-semibold text-foreground">Call Records</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b last:border-0 border-border hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-foreground">{contact.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.email}</td>
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
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">{contact.callRecords}</td>
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
          slackChannel={slackChannel}
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
  slackChannel,
  userTypeOptions,
  onSave,
  onCancel,
}: {
  contact: Contact | null
  clientId: string
  clientName: string
  slackChannel: string
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
          companyName: clientName,
          userType: "Main Point of Contact",
          slackMemberId: "",
          companySlackChannelId: slackChannel,
          receiveNotifications: true,
          lastModified: new Date().toISOString().split('T')[0],
          callRecords: 0,
        }
  )

  const handleSubmit = () => {
    if (formData.fullName && formData.email) {
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
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Email <span className="text-destructive">*</span></label>
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
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
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
            disabled={!formData.fullName || !formData.email}
            className={cn(
              "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-opacity",
              formData.fullName && formData.email
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

function EmptyTab({ label, action }: { label: string; action?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-[13px] text-muted-foreground mb-2">{label}</p>
      {action && <button className="text-[12px] font-medium text-sky-600 hover:text-sky-700">{action}</button>}
    </div>
  )
}

function ExperimentResultsTab() {
  return (
    <div>
      <ResultsGrid />
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

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <MetricCard
      label={label}
      value={value}
      small={small}
    />
  )
}
