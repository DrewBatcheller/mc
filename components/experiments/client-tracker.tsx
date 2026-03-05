"use client"

import { Fragment, useState, useMemo, useEffect, useRef, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  Search,
  Play,
  Pencil,
  Trash2,
  ExternalLink,
  Layers,
  FlaskConical,
  Zap,
  CheckCircle2,
  ArrowLeftRight,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "./experiment-details-modal"
import { ThankYouAnimation } from "@/components/shared/thank-you-animation"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"
import type { AirtableRecord } from "@/lib/types"

/* ── Types ── */
interface Experiment {
  id: string
  name: string
  description: string
  status: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: string
  revenue: string
  primaryGoals?: string[]
  hypothesis?: string
  rationale?: string
  weighting?: string
  revenueAddedMrr?: string
  nextSteps?: string
  variantData?: {
    name: string
    status?: string
    trafficPercent?: number
    visitors: number
    conversions: number
    cr?: number
    crPercent?: number
    crImprovement: number
    crConfidence?: number
    rpv: number
    rpvImprovement: number
    rpvConfidence?: number
    revenue: number
    revenueImprovement: number
    appv?: number
    appvImprovement?: number
  }[]
  launchDate?: string
  endDate?: string
  deployed?: boolean
  whatHappened?: string
  [key: string]: unknown
}

interface Batch {
  id: string
  batchKey: string
  client: string
  clientId: string
  launchDate: string
  launchDateRaw: string
  finishDate: string
  status: string
  tests: number
  revenueImpact: string
  experimentIds: string[]
  experiments: Experiment[]
}

/* ── Status helpers ── */
const statusStyles: Record<string, string> = {
  "In Progress": "bg-sky-50 text-sky-700",
  Live:          "bg-emerald-50 text-emerald-700",
  Completed:     "bg-violet-50 text-violet-700",
  Pending:       "bg-accent text-muted-foreground",
  Mixed:         "bg-amber-50 text-amber-700",
  "No Tests":    "bg-accent text-muted-foreground",
  Unsuccessful:  "bg-rose-50 text-rose-700",
  Blocked:       "bg-red-50 text-red-700",
  Successful:    "bg-emerald-50 text-emerald-700",
  Inconclusive:  "bg-amber-50 text-amber-700",
  "Live - Collecting Data": "bg-emerald-50 text-emerald-700",
}

const mapBatchStatus = (status: string): "Pending" | "In Progress" | "Live" | "Completed" => {
  const s = status.toLowerCase()
  if (s === "live" || s === "live - collecting data") return "Live"
  if (s === "completed" || s === "successful" || s === "unsuccessful" || s === "inconclusive" || s === "mixed") return "Completed"
  if (s === "in progress" || s === "design" || s === "qa" || s === "launch" || s === "development") return "In Progress"
  return "Pending"
}

// Maps launch menu items to the All Tests Status value they set
const launchActionStatus: Record<string, string> = {
  'Launch Strategy': 'In Progress',
  'Launch Design': 'Design',
  'Launch Dev': 'In Progress',
  'Launch QA': 'QA',
  'Launch Tests': 'Live',
  'Launch Mid-test Checkin': 'In Progress',
  'Launch PTA': 'Launch',
}

const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]

/* ── Mappers ── */

// Safe date formatter: strips ISO time component and avoids UTC→local timezone shift.
// Airtable stores date-only fields as midnight UTC ("2025-03-15T00:00:00.000Z").
// Using new Date() + toLocaleDateString() shifts them back by 1 day in UTC- timezones.
// Instead, we parse the YYYY-MM-DD string directly and never invoke Date parsing.
function formatDateSafe(raw: string): string {
  const ymd = raw.split('T')[0]
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return raw
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m[2]-1]} ${+m[3]}, ${m[1]}`
}

function getImageUrl(field: unknown): string | undefined {
  if (Array.isArray(field) && field.length > 0) return (field[0] as { url?: string }).url ?? String(field[0])
  if (typeof field === 'string' && field) return field
  return undefined
}

function mapExperiment(rec: AirtableRecord): Experiment {
  const f = rec.fields
  const devices = Array.isArray(f['Devices'])
    ? (f['Devices'] as string[]).join(', ')
    : String(f['Devices'] ?? '')
  const geos = Array.isArray(f['GEOs'])
    ? (f['GEOs'] as string[]).join(', ')
    : String(f['GEOs'] ?? '')
  return {
    id: rec.id,
    name: String(f['Test Description'] ?? 'Untitled'),
    description: String(f['Test Description'] ?? ''),
    status: String(f['Test Status'] ?? 'Pending'),
    placement: String(f['Placement'] ?? ''),
    placementUrl: f['Placement URL'] ? String(f['Placement URL']) : undefined,
    devices,
    geos,
    variants: '-',
    revenue: f['Revenue Added (MRR) (Regular Format)'] ? `$${f['Revenue Added (MRR) (Regular Format)']}` : '$0',
    revenueAddedMrr: f['Revenue Added (MRR) (Regular Format)'] ? `$${f['Revenue Added (MRR) (Regular Format)']}` : undefined,
    primaryGoals: Array.isArray(f['Category Primary Goals'])
      ? (f['Category Primary Goals'] as string[])
      : f['Category Primary Goals'] ? [String(f['Category Primary Goals'])] : undefined,
    hypothesis: f['Hypothesis'] ? String(f['Hypothesis']) : undefined,
    launchDate: f['Launch Date'] ? formatDateSafe(String(f['Launch Date'])) : undefined,
    endDate: f['End Date'] ? formatDateSafe(String(f['End Date'])) : undefined,
  }
}

function mapBatch(rec: AirtableRecord, expMap: Map<string, Experiment>): Batch {
  const f = rec.fields
  const clientArr = f['Brand Name']
  const client = Array.isArray(clientArr) ? String(clientArr[0] ?? '') : String(clientArr ?? '')
  const clientIdArr = f['Record ID (from Client)']
  const clientId = Array.isArray(clientIdArr) ? String(clientIdArr[0] ?? '') : String(clientIdArr ?? '')
  const experimentIds: string[] = Array.isArray(f['Experiments Attached'])
    ? (f['Experiments Attached'] as string[])
    : []
  const experiments = experimentIds
    .map(id => expMap.get(id))
    .filter((e): e is Experiment => !!e)
  const launchRaw = f['Launch Date'] ? String(f['Launch Date']) : ''
  const finishRaw = f['PTA (Scheduled Finish)'] ? String(f['PTA (Scheduled Finish)']) : ''
  const fmt = (d: string): string => d ? formatDateSafe(d) : '—'
  return {
    id: rec.id,
    batchKey: String(f['Batch Key'] ?? ''),
    client,
    clientId,
    launchDate: fmt(launchRaw),
    launchDateRaw: launchRaw ? launchRaw.split('T')[0] : '',
    finishDate: fmt(finishRaw),
    status: f['Calculated Batch Status']
      ? String(f['Calculated Batch Status'])
      : mapBatchStatus(String(f['All Tests Status'] ?? 'Pending')),
    tests: experiments.length,
    revenueImpact: f['Revenue Added (MRR)'] ? String(f['Revenue Added (MRR)']) : '$0',
    experimentIds,
    experiments,
  }
}

/* ── Component ── */
export function ClientTracker() {
  const { user } = useUser()

  // ── UI state ────────────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [clientFilter, setClientFilter] = useState("All Clients")
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set())
  const [isMutating, setIsMutating] = useState(false)

  // Action modal state
  const [actionBatch, setActionBatch] = useState<Batch | null>(null)
  const [launchMenuBatch, setLaunchMenuBatch] = useState<Batch | null>(null)
  const [launchMenuOpen, setLaunchMenuOpen] = useState(false)
  const [editingLaunchDate, setEditingLaunchDate] = useState<string>("")
  const [confirmAction, setConfirmAction] = useState<{ type: string; batch: Batch } | null>(null)
  const [deleteTestsModal, setDeleteTestsModal] = useState<Batch | null>(null)
  const [selectBatchModal, setSelectBatchModal] = useState<Batch | null>(null)
  const [convertExperimentModal, setConvertExperimentModal] = useState<Experiment | null>(null)
  const [isCreatingNewBatch, setIsCreatingNewBatch] = useState(false)
  const [newBatchDate, setNewBatchDate] = useState("")
  const [showThankYou, setShowThankYou] = useState(false)

  const launchMenuRef = useRef<HTMLDivElement>(null)

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: batchRecords, isLoading: batchLoading, mutate: mutateBatches } = useAirtable('batches', {
    fields: [
      'Batch Key', 'Brand Name', 'Launch Date', 'PTA (Scheduled Finish)',
      'All Tests Status', 'Calculated Batch Status', 'Experiments Attached', 'Revenue Added (MRR)',
      'Record ID (from Client)',
    ],
    sort: [{ field: 'Launch Date', direction: 'desc' }],
  })

  const { data: expRecords, isLoading: expLoading, mutate: mutateExperiments } = useAirtable('experiments', {
    fields: [
      'Test Description', 'Test Status', 'Placement', 'Placement URL',
      'Devices', 'GEOs', 'Revenue Added (MRR) (Regular Format)',
      'Category Primary Goals', 'Hypothesis', 'Launch Date', 'End Date',
    ],
    enabled: !batchLoading,
  })

  // Build experiment ID → Experiment lookup map
  const expMap = useMemo(() => {
    const map = new Map<string, Experiment>()
    for (const rec of expRecords ?? []) map.set(rec.id, mapExperiment(rec))
    return map
  }, [expRecords])

  // Assemble final batch objects with nested experiments
  const batches = useMemo(
    () => (batchRecords ?? []).map(rec => mapBatch(rec, expMap)),
    [batchRecords, expMap]
  )

  const isLoading = batchLoading || expLoading

  // ── Derived stats ────────────────────────────────────────────────────────────
  const allExperiments = useMemo(() => batches.flatMap(b => b.experiments), [batches])

  const statCards = useMemo(() => [
    { label: "Total Batches",     value: isLoading ? '—' : String(batches.length),        icon: Layers },
    { label: "Total Experiments", value: isLoading ? '—' : String(allExperiments.length), icon: FlaskConical },
    {
      label: "Live Now",
      value: isLoading ? '—' : String(
        allExperiments.filter(e => e.status === 'Live - Collecting Data' || e.status === 'Live').length
      ),
      icon: Zap,
    },
    {
      label: "Successful",
      value: isLoading ? '—' : String(allExperiments.filter(e => e.status === 'Successful').length),
      icon: CheckCircle2,
    },
  ], [batches, allExperiments, isLoading])

  // ── Filter options derived from live data ────────────────────────────────────
  const allClients = useMemo(
    () => ["All Clients", ...Array.from(new Set(batches.map(b => b.client))).filter(Boolean).sort()],
    [batches]
  )

  // ── Auth headers for mutations ───────────────────────────────────────────────
  const authHeaders = useMemo((): HeadersInit => ({
    'Content-Type': 'application/json',
    'x-user-role': user?.role ?? '',
    'x-user-id': user?.id ?? '',
    'x-user-name': user?.name ?? '',
    ...(user?.clientId ? { 'x-client-id': user.clientId } : {}),
  }), [user])

  // ── Filtering & selection ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...batches]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(b =>
        b.client.toLowerCase().includes(q) ||
        b.batchKey.toLowerCase().includes(q) ||
        b.experiments.some(e => e.name.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== "All Statuses") result = result.filter(b => b.status === statusFilter)
    if (clientFilter !== "All Clients") result = result.filter(b => b.client === clientFilter)
    return result
  }, [batches, search, statusFilter, clientFilter])

  const allFilteredSelected = filtered.length > 0 && filtered.every(b => selectedBatchIds.has(b.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedBatchIds(new Set())
    } else {
      setSelectedBatchIds(new Set(filtered.map(b => b.id)))
    }
  }

  const toggleBatch = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── CSV Export ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const selected = filtered.filter(b => selectedBatchIds.has(b.id))
    if (selected.length === 0) return

    const rows: string[][] = []
    rows.push([
      "Client", "Batch Key", "Launch Date", "Finish Date", "Batch Status", "Tests",
      "Experiment", "Description", "Exp Status", "Placement", "Placement URL",
      "Devices", "GEOs", "Variants", "Revenue", "Hypothesis",
      "Primary Goals", "Revenue Added MRR", "Launch Date (Exp)", "End Date (Exp)",
    ])

    for (const batch of selected) {
      if (batch.experiments.length === 0) {
        rows.push([
          batch.client, batch.batchKey, batch.launchDate, batch.finishDate,
          batch.status, String(batch.tests),
          ...Array(14).fill(""),
        ])
        continue
      }
      for (const exp of batch.experiments) {
        rows.push([
          batch.client, batch.batchKey, batch.launchDate, batch.finishDate,
          batch.status, String(batch.tests),
          exp.name, exp.description, exp.status, exp.placement, exp.placementUrl ?? "",
          exp.devices, exp.geos, exp.variants, exp.revenue,
          exp.hypothesis ?? "", (exp.primaryGoals ?? []).join("; "),
          exp.revenueAddedMrr ?? "", exp.launchDate ?? "", exp.endDate ?? "",
        ])
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batch-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Click-outside for launch menu ────────────────────────────────────────────
  useEffect(() => {
    if (!launchMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (launchMenuRef.current && !launchMenuRef.current.contains(e.target as Node)) {
        setLaunchMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [launchMenuOpen])

  // ── Mutation handlers ─────────────────────────────────────────────────────────
  const handleSaveLaunchDate = useCallback(async () => {
    if (!actionBatch || !editingLaunchDate) return
    setIsMutating(true)
    try {
      await fetch(`/api/airtable/batches/${actionBatch.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Launch Date': editingLaunchDate } }),
      })
      await mutateBatches()
    } finally {
      setIsMutating(false)
      setActionBatch(null)
    }
  }, [actionBatch, editingLaunchDate, authHeaders, mutateBatches])

  const handleLaunchAction = useCallback(async (actionType: string, batch: Batch) => {
    const newStatus = launchActionStatus[actionType]
    if (!newStatus) return
    setIsMutating(true)
    try {
      await fetch(`/api/airtable/batches/${batch.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'All Tests Status': newStatus } }),
      })
      await mutateBatches()
    } finally {
      setIsMutating(false)
      setConfirmAction(null)
    }
  }, [authHeaders, mutateBatches])

  const handleConvertToIdea = useCallback(async () => {
    if (!convertExperimentModal) return
    setIsMutating(true)
    try {
      await fetch(`/api/airtable/experiments/${convertExperimentModal.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Is Experiment': false, 'Batch': [] } }),
      })
      await Promise.all([mutateExperiments(), mutateBatches()])
    } finally {
      setIsMutating(false)
      setConvertExperimentModal(null)
      setShowThankYou(true)
    }
  }, [convertExperimentModal, authHeaders, mutateExperiments, mutateBatches])

  const handleDesync = useCallback(async (batch: Batch) => {
    setIsMutating(true)
    try {
      await Promise.all(
        batch.experiments.map(exp =>
          fetch(`/api/airtable/experiments/${exp.id}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ fields: { 'Is Experiment': false, 'Batch': [] } }),
          })
        )
      )
      await Promise.all([mutateExperiments(), mutateBatches()])
    } finally {
      setIsMutating(false)
      setDeleteTestsModal(null)
    }
  }, [authHeaders, mutateExperiments, mutateBatches])

  const handleMoveExperiments = useCallback(async (targetBatchId: string) => {
    if (!selectBatchModal) return
    setIsMutating(true)
    try {
      await Promise.all(
        selectBatchModal.experiments.map(exp =>
          fetch(`/api/airtable/experiments/${exp.id}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ fields: { 'Batch': [targetBatchId] } }),
          })
        )
      )
      await Promise.all([mutateExperiments(), mutateBatches()])
    } finally {
      setIsMutating(false)
      setSelectBatchModal(null)
      setIsCreatingNewBatch(false)
    }
  }, [selectBatchModal, authHeaders, mutateExperiments, mutateBatches])

  const handleCreateNewBatch = useCallback(async () => {
    if (!selectBatchModal || !newBatchDate) return
    setIsMutating(true)
    try {
      const createRes = await fetch('/api/airtable/batches', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          fields: {
            'Launch Date': newBatchDate,
            ...(selectBatchModal.clientId ? { 'Client': [selectBatchModal.clientId] } : {}),
          },
        }),
      })
      const newBatch = await createRes.json()
      if (newBatch?.id) {
        await handleMoveExperiments(newBatch.id)
      }
    } finally {
      setIsMutating(false)
      setNewBatchDate("")
    }
  }, [selectBatchModal, newBatchDate, authHeaders, handleMoveExperiments])

  // ── Open experiment modal (lazy-loads rich detail fields) ────────────────────
  const openExperimentModal = useCallback(async (exp: Experiment, batch: Batch) => {
    // Show modal immediately with basic table data
    setSelectedExperiment(exp)
    setSelectedBatch(batch)
    setIsModalOpen(true)
    setIsDetailLoading(true)

    // Fetch full record details (images, rationale, results, etc.)
    try {
      const res = await fetch(`/api/airtable/experiments/${exp.id}`, {
        headers: authHeaders as Record<string, string>,
      })
      if (!res.ok) return
      const { record } = await res.json()
      if (!record?.fields) return
      const f = record.fields as Record<string, unknown>
      setSelectedExperiment(prev =>
        prev?.id === exp.id
          ? {
              ...prev,
              rationale:    f['Rationale']    ? String(f['Rationale'])    : undefined,
              deployed:     f['Deployed'] === true ? true : undefined,
              whatHappened: f['Describe what happened & what we learned'] ? String(f['Describe what happened & what we learned']) : undefined,
              nextSteps:    f['Next Steps (Action)']  ? String(f['Next Steps (Action)'])  : undefined,
              controlImage: getImageUrl(f['Control Image']),
              variantImage: getImageUrl(f['Variant Image']),
              resultImage:  getImageUrl(f['PTA Result Image']),
              resultVideo:  getImageUrl(f['Post-Test Analysis (Loom)']),
            }
          : prev
      )
    } catch {
      // Modal still works fine with just the basic data
    } finally {
      setIsDetailLoading(false)
    }
  }, [authHeaders])

  // ── Skeleton rows ─────────────────────────────────────────────────────────────
  const skeletonRows = Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-border">
      <td className="px-3 py-3.5"><div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" /></td>
      <td className="px-3 py-3.5"><div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-44 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-24 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-md bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-14 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5 text-right"><div className="h-7 w-20 rounded-md bg-muted animate-pulse ml-auto" /></td>
    </tr>
  ))

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Expandable table */}
      <div className="bg-card rounded-xl border border-border">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-border">
          <div className="flex items-center gap-2">
            <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
            <SelectField value={clientFilter} onChange={setClientFilter} options={allClients} />
          </div>
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batches, experiments..."
              className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={exportCSV}
            disabled={selectedBatchIds.size === 0}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-foreground px-3 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                  />
                </th>
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Batch</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Finish Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Tests</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? skeletonRows : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                    No batches found
                  </td>
                </tr>
              ) : filtered.map((batch) => {
                const isExpanded = expandedId === batch.id
                return (
                  <Fragment key={batch.id}>
                    {/* Batch row */}
                    <tr
                      className={cn(
                        "border-b border-border transition-colors hover:bg-accent/30 cursor-pointer",
                        isExpanded && "bg-accent/20"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : batch.id)}
                    >
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedBatchIds.has(batch.id)}
                          onChange={() => toggleBatch(batch.id)}
                          className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap">
                        {batch.client} | {batch.launchDate}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {batch.finishDate}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={cn(
                          "text-[12px] font-medium px-2.5 py-1 rounded-md",
                          statusStyles[batch.status] || "bg-accent text-foreground"
                        )}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {batch.tests} {batch.tests === 1 ? "test" : "tests"}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Launch menu */}
                          <div
                            className="relative"
                            ref={launchMenuBatch?.id === batch.id ? launchMenuRef : undefined}
                          >
                            <button
                              onClick={() => {
                                if (launchMenuBatch?.id === batch.id && launchMenuOpen) {
                                  setLaunchMenuOpen(false)
                                } else {
                                  setLaunchMenuBatch(batch)
                                  setLaunchMenuOpen(true)
                                }
                              }}
                              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                              title="Launch actions"
                            >
                              <Play className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            {launchMenuBatch?.id === batch.id && launchMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 w-52 flex flex-col">
                                {['Launch Strategy', 'Launch Design', 'Launch Dev', 'Launch QA', 'Launch Tests', 'Launch Mid-test Checkin', 'Launch PTA'].map((action, idx, arr) => (
                                  <button
                                    key={action}
                                    onClick={() => {
                                      setConfirmAction({ type: action, batch })
                                      setLaunchMenuOpen(false)
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 text-[12px] text-foreground text-left hover:bg-muted transition-colors",
                                      idx === 0 && "rounded-t-md",
                                      idx === arr.length - 1 && "rounded-b-md"
                                    )}
                                  >
                                    {action}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Edit launch date */}
                          <button
                            onClick={() => {
                              setActionBatch(batch)
                              setEditingLaunchDate(batch.launchDateRaw)
                            }}
                            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                            title="Edit launch date"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>

                          {/* Delete batch */}
                          <button
                            onClick={() => setConfirmAction({ type: 'delete', batch })}
                            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                            title="Delete batch"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded experiment rows */}
                    {isExpanded && batch.experiments.length > 0 && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="bg-accent/10 border-b border-border">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/60">
                                  <th className="px-6 py-2.5 text-[12px] font-medium text-muted-foreground text-left pl-14">Experiment</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Status</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Placement</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Devices</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">GEOs</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Variants</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-right">Revenue</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.experiments.map((exp) => (
                                  <tr
                                    key={exp.id}
                                    className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors cursor-pointer"
                                    onClick={() => openExperimentModal(exp, batch)}
                                  >
                                    <td className="px-6 py-3 pl-14">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[13px] font-medium text-foreground">{exp.name}</span>
                                        <span className="text-[11px] text-muted-foreground line-clamp-1">{exp.description}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={cn(
                                        "text-[11px] font-medium px-2 py-0.5 rounded-md",
                                        statusStyles[exp.status] || "bg-accent text-foreground"
                                      )}>
                                        {exp.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[12px] text-foreground">{exp.placement}</span>
                                        {exp.placementUrl && (
                                          <span className="text-[11px] text-sky-600 flex items-center gap-0.5">
                                            <ExternalLink className="h-2.5 w-2.5" />
                                            {exp.placementUrl}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.devices}</td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.geos}</td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.variants}</td>
                                    <td className={cn(
                                      "px-4 py-3 text-[12px] text-right whitespace-nowrap tabular-nums font-medium",
                                      exp.revenue !== "$0" && exp.revenue !== "-" ? "text-emerald-600" : "text-muted-foreground"
                                    )}>
                                      {exp.revenue}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setConvertExperimentModal(exp)
                                        }}
                                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors ml-auto"
                                        title="Convert experiment back into idea"
                                      >
                                        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
      </div>

      {/* ── Experiment Details Modal ── */}
      <ExperimentDetailsModal
        isOpen={isModalOpen}
        experiment={selectedExperiment}
        batchKey={selectedBatch ? `${selectedBatch.client} | ${selectedBatch.launchDate}` : undefined}
        isLoadingDetails={isDetailLoading}
        onClose={() => { setIsModalOpen(false); setIsDetailLoading(false) }}
      />

      {/* ── Edit Launch Date Modal ── */}
      {actionBatch && !confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-3">Edit Launch Date</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Batch: <span className="font-medium text-foreground">{actionBatch.client}</span>
            </p>
            <input
              type="date"
              value={editingLaunchDate}
              onChange={(e) => setEditingLaunchDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setActionBatch(null)}
                disabled={isMutating}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLaunchDate}
                disabled={isMutating || !editingLaunchDate}
                className="px-3 py-2 text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 rounded transition-colors disabled:opacity-50"
              >
                {isMutating ? 'Saving…' : 'Save Date'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Confirmation Modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">
              {confirmAction.type === 'delete' ? 'Delete Batch?' : `Confirm ${confirmAction.type}?`}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              {confirmAction.type === 'delete'
                ? `The "${confirmAction.batch.client}" batch will be removed. You'll choose what happens to its tests next.`
                : `Proceed with ${confirmAction.type.toLowerCase()} for the "${confirmAction.batch.client}" batch?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isMutating}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmAction.type === 'delete') {
                    setDeleteTestsModal(confirmAction.batch)
                    setConfirmAction(null)
                  } else {
                    await handleLaunchAction(confirmAction.type, confirmAction.batch)
                  }
                }}
                disabled={isMutating}
                className={cn(
                  "px-3 py-2 text-sm font-medium text-white rounded transition-colors disabled:opacity-50",
                  confirmAction.type === 'delete'
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-sky-600 hover:bg-sky-700"
                )}
              >
                {isMutating ? 'Working…' : confirmAction.type === 'delete' ? 'Continue' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete / Desync Modal ── */}
      {deleteTestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">What to do with existing tests?</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              The &quot;{deleteTestsModal.client}&quot; batch has {deleteTestsModal.tests} test{deleteTestsModal.tests === 1 ? '' : 's'}. Choose what to do with them:
            </p>
            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => handleDesync(deleteTestsModal)}
                disabled={isMutating}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="font-medium text-foreground text-sm">Desync</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">Convert tests back into test ideas</div>
              </button>
              <button
                onClick={() => {
                  setSelectBatchModal(deleteTestsModal)
                  setDeleteTestsModal(null)
                }}
                disabled={isMutating}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="font-medium text-foreground text-sm">Select Batch</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">Move tests to another batch</div>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setDeleteTestsModal(null)}
                disabled={isMutating}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Select Batch Modal ── */}
      {selectBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-md w-full shadow-lg">
            {!isCreatingNewBatch ? (
              <>
                <h3 className="text-base font-semibold text-foreground mb-2">Select Batch</h3>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Choose an existing {selectBatchModal.client} batch or create a new one:
                </p>
                <div className="mb-4 max-h-52 overflow-y-auto flex flex-col gap-1">
                  <button
                    onClick={() => { setIsCreatingNewBatch(true); setNewBatchDate("") }}
                    className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-border bg-accent/50 text-left hover:bg-accent transition-colors"
                  >
                    <div className="font-medium text-foreground text-sm">+ Create New Batch</div>
                  </button>
                  {batches
                    .filter(b => b.client === selectBatchModal.client && b.id !== selectBatchModal.id)
                    .map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleMoveExperiments(b.id)}
                        disabled={isMutating}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        <div className="font-medium text-foreground text-sm">{b.batchKey || b.client}</div>
                        <div className="text-[12px] text-muted-foreground">{b.launchDate}</div>
                      </button>
                    ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => { setSelectBatchModal(null); setIsCreatingNewBatch(false) }}
                    disabled={isMutating}
                    className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-foreground mb-2">Create New Batch</h3>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Select the launch date for the new {selectBatchModal.client} batch:
                </p>
                <div className="mb-4">
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Launch Date</label>
                  <input
                    type="date"
                    value={newBatchDate}
                    onChange={(e) => setNewBatchDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setIsCreatingNewBatch(false); setNewBatchDate("") }}
                    disabled={isMutating}
                    className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateNewBatch}
                    disabled={!newBatchDate || isMutating}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded transition-colors",
                      newBatchDate && !isMutating
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {isMutating ? 'Creating…' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Convert Experiment to Idea Modal ── */}
      {convertExperimentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">Convert Experiment to Idea?</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              &quot;{convertExperimentModal.name}&quot; will be removed from its batch and converted back into a test idea.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConvertExperimentModal(null)}
                disabled={isMutating}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToIdea}
                disabled={isMutating}
                className="px-3 py-2 text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 rounded transition-colors disabled:opacity-50"
              >
                {isMutating ? 'Converting…' : 'Convert to Idea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Thank You Animation ── */}
      <ThankYouAnimation
        isVisible={showThankYou}
        message="Your test is converting to Test Idea"
        onComplete={() => setShowThankYou(false)}
      />
    </div>
  )
}
