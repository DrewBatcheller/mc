'use client'

/**
 * Submit Test Ideas to Batch — hosted form at /forms/submit-ideas?id=recXXX
 *
 * Strategist submits test ideas for a batch. Uses ?id= with a Client record ID.
 * Flow: select/create batch → add ideas (existing or new) → send to client.
 * Supports ?id=preview for display-only mode with sample data.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2, Globe, ChevronDown, Plus, Check, X, AlertTriangle, MessageSquare, Clock, Pencil, FileText, Bell,
} from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { NotesPanel } from '@/components/shared/notes-panel'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/lib/utils'
import {
  FormPage, FormHeader, FormBody, FormError,
  StepCard, FormField, inputCls,
  FormSuccess,
  isPreviewMode, PreviewBanner, PreviewShell,
} from '@/components/forms'

// ─── Constants (duplicated from modals to keep form self-contained) ──────────

const PRIMARY_GOALS = ['ATC', 'SCVR', 'CVR', 'AOV', 'RPV', 'APPV', 'PPV', 'CTR', 'Other', 'LTV', 'Bounce Rate', 'Session Depth', 'Search Usage', 'Units per Order', 'Add to Cart Rate', 'Trust Score', 'Bundle CTR']
const DEVICES = ['All Devices', 'Desktop', 'Mobile']
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Mexico', 'European Union', 'Germany', 'France', 'Spain', 'Italy', 'Japan', 'South Korea', 'India', 'Brazil', 'New Zealand', 'AU (Primary Focus)', 'All GEOs', 'International']

// ─── Types ───────────────────────────────────────────────────────────────────
interface Batch { id: string; label: string; launchDate: string; notificationTracking: string }
interface ExistingIdea {
  id: string; name: string; placement: string; placementUrl: string
  hypothesis: string; rationale: string; goals: string[]; devices: string
  geos: string[]; weighting: string; designBrief: string; devBrief: string
  mediaLinks: string; walkthroughUrl: string; noteIds: string[]; noteCount: number
}
interface BatchExperiment {
  id: string; name: string; placement: string; placementUrl: string
  hypothesis: string; rationale: string; goals: string[]; devices: string
  geos: string[]; weighting: string; designBrief: string; devBrief: string
  mediaLinks: string; walkthroughUrl: string; noteIds: string[]; noteCount: number
  feedbackStatus: string | null; rejectedAt: string | null
}

interface IdeaFormData {
  title: string
  placementLabel: string
  placementUrl: string
  hypothesis: string
  rationale: string
  primaryGoals: string[]
  devices: string
  countries: string[]
  weighting: string
  designBrief: string
  developmentBrief: string
  mediaLinks: string
  walkthroughUrl: string
}

const EMPTY_IDEA: IdeaFormData = {
  title: '', placementLabel: '', placementUrl: '', hypothesis: '', rationale: '',
  primaryGoals: [], devices: 'All Devices', countries: [], weighting: '',
  designBrief: '', developmentBrief: '', mediaLinks: '', walkthroughUrl: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from)
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d
}

function toDateInput(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getExpectedTests(planType: string): number | null {
  const match = planType.match(/(\d+)\s*Test/i)
  return match ? parseInt(match[1], 10) : null
}

const goalColors: Record<string, string> = {
  CVR: 'bg-sky-50 text-sky-700 border-sky-200',
  ATC: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RPV: 'bg-violet-50 text-violet-700 border-violet-200',
  AOV: 'bg-amber-50 text-amber-700 border-amber-200',
  PPV: 'bg-rose-50 text-rose-700 border-rose-200',
  CTR: 'bg-teal-50 text-teal-700 border-teal-200',
  SCVR: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

// ─── Preview mock data ───────────────────────────────────────────────────────

const PREVIEW_CLIENT = {
  name: 'Acme Corp', website: 'acmecorp.com', planType: '3 Tests',
  strategistId: 'prev_s', designerId: 'prev_d', developerId: 'prev_dev', qaId: 'prev_q',
}
const PREVIEW_BATCHES: Batch[] = [
  { id: 'prev_b1', label: 'Acme Corp | 2026 April 15', launchDate: '2026-04-15', notificationTracking: '' },
]
const PREVIEW_IDEAS: ExistingIdea[] = [
  { id: 'prev_i1', name: 'Sticky ATC on Mobile PDP', placement: 'Product Page', placementUrl: 'https://store.example.com/products/sample', hypothesis: 'Making ATC sticky will improve conversion', rationale: 'Heatmap data shows users scroll past ATC', goals: ['CVR', 'ATC'], devices: 'Mobile', geos: ['United States'], weighting: '50/50', designBrief: 'Sticky bar at bottom of viewport', devBrief: '', mediaLinks: '', walkthroughUrl: '', noteIds: ['prev_n1'], noteCount: 1 },
  { id: 'prev_i2', name: 'Trust Badge Below Price', placement: 'Product Page', placementUrl: 'https://store.example.com/products/sample', hypothesis: 'Trust badges increase confidence and CVR', rationale: 'Post-purchase surveys indicate trust concerns', goals: ['CVR'], devices: 'All Devices', geos: ['United States'], weighting: '50/50', designBrief: 'Three inline badges below price', devBrief: '', mediaLinks: '', walkthroughUrl: '', noteIds: [], noteCount: 0 },
]
// ─── Inner Form ──────────────────────────────────────────────────────────────

function SubmitIdeasInner() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('id') ?? ''
  const preview = isPreviewMode(clientId)
  const { user } = useUser()

  const authHeaders: Record<string, string> = user
    ? {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-id': user.id,
        'x-user-name': user.name,
        ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
      }
    : { 'Content-Type': 'application/json' }

  // ── Data fetches ─────────────────────────────────────────────────────────

  const { data: rawClient, isLoading: clientLoading } = useAirtable<Record<string, unknown>>('clients', {
    fields: ['Brand Name', 'Website', 'Plan Type', 'Developer', 'Designer', 'Strategist', 'QA'],
    filterExtra: `RECORD_ID() = "${clientId}"`,
    maxRecords: 1,
    enabled: !!clientId && !preview,
  })

  const batchFilter = clientId
    ? `AND(IS_AFTER({Launch Date}, TODAY()), FIND("${clientId}", CONCATENATE({Record ID (from Client)})) > 0)`
    : 'IS_AFTER({Launch Date}, TODAY())'

  const { data: rawBatches, mutate: mutateBatches } = useAirtable('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'Experiments Attached', 'Notification Tracking'],
    filterExtra: batchFilter,
    sort: [{ field: 'Launch Date', direction: 'desc' }],
    enabled: !!clientId && !preview,
  })

  const { data: rawIdeas, mutate: mutateIdeas } = useAirtable<Record<string, unknown>>('experiment-ideas', {
    fields: [
      'Test Description', 'Placement', 'Placement URL', 'Hypothesis', 'Rationale',
      'Category Primary Goals', 'Devices', 'GEOs', 'Variants Weight',
      'Design Brief', 'Development Brief', 'Media/Links', 'Walkthrough Video URL',
      'Notes', 'Record ID (from Brand Name)',
    ],
    filterExtra: clientId ? `FIND("${clientId}", CONCATENATE({Record ID (from Brand Name)})) > 0` : undefined,
    sort: [{ field: 'Test Description', direction: 'asc' }],
    enabled: !!clientId && !preview,
  })

  // ── Derived data ─────────────────────────────────────────────────────────

  const client = useMemo(() => {
    if (preview) return PREVIEW_CLIENT
    if (!rawClient || rawClient.length === 0) return null
    const f = rawClient[0].fields as Record<string, unknown>
    const getFirst = (key: string) => { const v = f[key]; return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '') }
    return {
      name: String(f['Brand Name'] ?? ''),
      website: String(f['Website'] ?? ''),
      planType: String(f['Plan Type'] ?? ''),
      strategistId: getFirst('Strategist'),
      designerId: getFirst('Designer'),
      developerId: getFirst('Developer'),
      qaId: getFirst('QA'),
    }
  }, [rawClient, preview])

  const batches = useMemo<Batch[]>(() => {
    if (preview) return PREVIEW_BATCHES
    if (!rawBatches) return []
    return rawBatches.map(rec => {
      const f = rec.fields as Record<string, unknown>
      const batchKey = String(f['Batch Key'] ?? '')
      const brandArr = f['Brand Name']
      const brand = Array.isArray(brandArr) ? String(brandArr[0] ?? '') : String(brandArr ?? '')
      const launch = f['Launch Date'] ? String(f['Launch Date']).split('T')[0] : ''
      return { id: rec.id, label: batchKey || (brand && launch ? `${brand} — ${launch}` : brand || launch || rec.id), launchDate: launch, notificationTracking: String(f['Notification Tracking'] ?? '') }
    })
  }, [rawBatches, preview])

  const existingIdeas = useMemo<ExistingIdea[]>(() => {
    if (preview) return PREVIEW_IDEAS
    if (!rawIdeas) return []
    return rawIdeas.map(rec => {
      const f = rec.fields as Record<string, unknown>
      const goalsRaw = f['Category Primary Goals']
      const geosRaw = f['GEOs']
      return {
        id: rec.id,
        name: String(f['Test Description'] ?? ''),
        placement: String(f['Placement'] ?? ''),
        placementUrl: String(f['Placement URL'] ?? ''),
        hypothesis: String(f['Hypothesis'] ?? ''),
        rationale: String(f['Rationale'] ?? ''),
        goals: Array.isArray(goalsRaw) ? (goalsRaw as string[]) : goalsRaw ? [String(goalsRaw)] : [],
        devices: String(f['Devices'] ?? ''),
        geos: Array.isArray(geosRaw) ? (geosRaw as string[]) : geosRaw ? [String(geosRaw)] : [],
        weighting: String(f['Variants Weight'] ?? ''),
        designBrief: String(f['Design Brief'] ?? ''),
        devBrief: String(f['Development Brief'] ?? ''),
        mediaLinks: String(f['Media/Links'] ?? ''),
        walkthroughUrl: String(f['Walkthrough Video URL'] ?? ''),
        noteIds: Array.isArray(f['Notes']) ? (f['Notes'] as string[]) : [],
        noteCount: Array.isArray(f['Notes']) ? (f['Notes'] as string[]).length : 0,
      }
    })
  }, [rawIdeas, preview])

  const minNewBatchDate = useMemo(() => {
    const today = new Date()
    const minFromToday = addWorkingDays(today, 13)
    let minFromBatches = new Date(0)
    if (batches.length > 0 && batches[0].launchDate) {
      const latest = new Date(batches[0].launchDate + 'T00:00:00')
      minFromBatches = new Date(latest)
      minFromBatches.setDate(minFromBatches.getDate() + 28)
    }
    return toDateInput(minFromBatches > minFromToday ? minFromBatches : minFromToday)
  }, [batches])

  // ── State ────────────────────────────────────────────────────────────────

  // Batch
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [batchOpen, setBatchOpen] = useState(false)
  const [newBatchMode, setNewBatchMode] = useState(false)
  const [newBatchDate, setNewBatchDate] = useState('')
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)
  const batchRef = useRef<HTMLDivElement>(null)

  // Team
  const [strategistId, setStrategistId] = useState('')
  const [designerId, setDesignerId] = useState('')
  const [developerId, setDeveloperId] = useState('')
  const [qaId, setQaId] = useState('')
  const defaultsApplied = useRef(false)

  // Ideas
  const [syncedIdeas, setSyncedIdeas] = useState<Map<string, ExistingIdea>>(new Map())
  const [restoredIdeas, setRestoredIdeas] = useState<ExistingIdea[]>([])
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showNewIdeaForm, setShowNewIdeaForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [ideaForm, setIdeaForm] = useState<IdeaFormData>({ ...EMPTY_IDEA })
  const [isCreatingIdea, setIsCreatingIdea] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [showCountriesMenu, setShowCountriesMenu] = useState(false)

  // Notes modal
  const [notesModalExp, setNotesModalExp] = useState<{ id: string; name: string; noteIds: string[] } | null>(null)
  // Track note IDs created this session per experiment — survives modal close/reopen
  const [sessionNotesByExp, setSessionNotesByExp] = useState<Map<string, string[]>>(new Map())

  // Optimistic removal — tracks experiments removed from batch before SWR re-fetches confirm
  const [removedFromBatchIds, setRemovedFromBatchIds] = useState<Set<string>>(new Set())

  // Submission
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // ── Batch experiments (server-loaded) ────────────────────────────────────

  // Extract experiment record IDs from the selected batch's linked field
  const selectedBatchExpIds = useMemo<string[]>(() => {
    if (!selectedBatchId || !rawBatches) return []
    const batchRec = rawBatches.find((r: { id: string }) => r.id === selectedBatchId)
    if (!batchRec) return []
    const raw = (batchRec.fields as Record<string, unknown>)['Experiments Attached']
    return Array.isArray(raw) ? (raw as string[]) : []
  }, [rawBatches, selectedBatchId])

  const batchExpFilter = useMemo(() => {
    if (selectedBatchExpIds.length === 0) return undefined
    if (selectedBatchExpIds.length === 1) return `RECORD_ID() = "${selectedBatchExpIds[0]}"`
    return `OR(${selectedBatchExpIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`
  }, [selectedBatchExpIds])

  const { data: rawBatchExperiments, mutate: mutateBatchExps } = useAirtable<Record<string, unknown>>('experiments', {
    fields: [
      'Test Description', 'Placement', 'Placement URL', 'Hypothesis', 'Rationale',
      'Category Primary Goals', 'Devices', 'GEOs', 'Variants Weight',
      'Design Brief', 'Development Brief', 'Media/Links', 'Walkthrough Video URL',
      'Notes', 'Feedback Status', 'Rejected At',
    ],
    filterExtra: batchExpFilter,
    enabled: selectedBatchExpIds.length > 0 && !preview,
  })

  const batchExperiments = useMemo<BatchExperiment[]>(() => {
    if (!rawBatchExperiments) return []
    return rawBatchExperiments
      .filter(rec => !removedFromBatchIds.has(rec.id))  // Optimistically hide removed experiments
      .map(rec => {
        const f = rec.fields as Record<string, unknown>
        const goalsRaw = f['Category Primary Goals']
        const geosRaw = f['GEOs']
        return {
          id: rec.id,
          name: String(f['Test Description'] ?? ''),
          placement: String(f['Placement'] ?? ''),
          placementUrl: String(f['Placement URL'] ?? ''),
          hypothesis: String(f['Hypothesis'] ?? ''),
          rationale: String(f['Rationale'] ?? ''),
          goals: Array.isArray(goalsRaw) ? (goalsRaw as string[]) : goalsRaw ? [String(goalsRaw)] : [],
          devices: String(f['Devices'] ?? ''),
          geos: Array.isArray(geosRaw) ? (geosRaw as string[]) : geosRaw ? [String(geosRaw)] : [],
          weighting: String(f['Variants Weight'] ?? ''),
          designBrief: String(f['Design Brief'] ?? ''),
          devBrief: String(f['Development Brief'] ?? ''),
          mediaLinks: String(f['Media/Links'] ?? ''),
          walkthroughUrl: String(f['Walkthrough Video URL'] ?? ''),
          noteIds: Array.isArray(f['Notes']) ? (f['Notes'] as string[]) : [],
          noteCount: Array.isArray(f['Notes']) ? (f['Notes'] as string[]).length : 0,
          feedbackStatus: typeof f['Feedback Status'] === 'string' ? (f['Feedback Status'] as string) : null,
          rejectedAt: typeof f['Rejected At'] === 'string' ? (f['Rejected At'] as string) : null,
        }
      })
  }, [rawBatchExperiments, removedFromBatchIds])

  // Collect note IDs from rejected experiments for inline feedback display
  const rejectedNoteIds = useMemo(() => {
    const ids: string[] = []
    for (const exp of batchExperiments) {
      if (exp.feedbackStatus === 'Client Rejected Idea' && exp.noteIds.length > 0) {
        ids.push(...exp.noteIds)
      }
    }
    return ids
  }, [batchExperiments])

  const batchNoteFilter = useMemo(() => {
    if (rejectedNoteIds.length === 0) return undefined
    // Use RECORD_ID() pattern — reliable, unlike ARRAYJOIN which returns display names
    const idFilter = rejectedNoteIds.length === 1
      ? `RECORD_ID() = "${rejectedNoteIds[0]}"`
      : `OR(${rejectedNoteIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`
    return `AND({Experiment Type} = "Client Idea Feedback", ${idFilter})`
  }, [rejectedNoteIds])

  const { data: rawBatchNotes } = useAirtable<Record<string, unknown>>('notes', {
    fields: ['Note', 'Experiments', 'Created Time'],
    filterExtra: batchNoteFilter,
    enabled: rejectedNoteIds.length > 0 && !preview,
  })

  const batchNotesByExp = useMemo<Map<string, { note: string; createdTime: string }[]>>(() => {
    const map = new Map<string, { note: string; createdTime: string }[]>()
    if (!rawBatchNotes) return map
    for (const rec of rawBatchNotes) {
      const f = rec.fields as Record<string, unknown>
      const note = String(f['Note'] ?? '')
      const time = String(f['Created Time'] ?? '')
      const expIds = (f['Experiments'] as string[]) ?? []
      for (const eid of expIds) {
        if (!map.has(eid)) map.set(eid, [])
        map.get(eid)!.push({ note, createdTime: time })
      }
    }
    return map
  }, [rawBatchNotes])

  // ── Effects ──────────────────────────────────────────────────────────────

  // Click outside closes batch dropdown
  useEffect(() => {
    if (!batchOpen) return
    const handle = (e: MouseEvent) => {
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) setBatchOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [batchOpen])

  // Pre-populate team from client defaults
  useEffect(() => {
    if (defaultsApplied.current || !client) return
    setStrategistId(client.strategistId)
    setDesignerId(client.designerId)
    setDeveloperId(client.developerId)
    setQaId(client.qaId)
    defaultsApplied.current = true
  }, [client])

  // Clean up restored ideas once SWR refetch brings them back into existingIdeas
  useEffect(() => {
    if (restoredIdeas.length === 0) return
    const stillNeeded = restoredIdeas.filter(ri => !existingIdeas.some(ei => ei.id === ri.id))
    if (stillNeeded.length < restoredIdeas.length) setRestoredIdeas(stillNeeded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingIdeas])

  // Clean up syncedIdeas once server data confirms them in batchExperiments
  useEffect(() => {
    if (syncedIdeas.size === 0 || batchExperiments.length === 0) return
    const serverIds = new Set(batchExperiments.map(e => e.id))
    const stillLocal = new Map<string, ExistingIdea>()
    for (const [id, idea] of syncedIdeas) {
      if (!serverIds.has(id)) stillLocal.set(id, idea)
    }
    if (stillLocal.size < syncedIdeas.size) setSyncedIdeas(stillLocal)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchExperiments])

  // Clean up removedFromBatchIds once SWR re-fetches confirm experiments are gone from raw data
  useEffect(() => {
    if (removedFromBatchIds.size === 0) return
    const rawIds = new Set(rawBatchExperiments?.map(r => r.id) ?? [])
    const stillPending = new Set<string>()
    for (const id of removedFromBatchIds) {
      if (rawIds.has(id)) stillPending.add(id)  // Still in raw data — keep hiding
    }
    if (stillPending.size < removedFromBatchIds.size) setRemovedFromBatchIds(stillPending)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawBatchExperiments])

  // ── Note helpers (merge server + session note IDs) ───────────────────────

  /** Get all note IDs for an experiment — server IDs + any created this session */
  const getMergedNoteIds = (expId: string, serverNoteIds: string[]): string[] => {
    const sessionIds = sessionNotesByExp.get(expId) ?? []
    if (sessionIds.length === 0) return serverNoteIds
    // Deduplicate — session IDs might already be in server data after SWR refetch
    const set = new Set(serverNoteIds)
    for (const id of sessionIds) set.add(id)
    return [...set]
  }

  /** Get note count including session-created notes (uses deduplicated merge) */
  const getMergedNoteCount = (expId: string, serverNoteIds: string[]): number => {
    return getMergedNoteIds(expId, serverNoteIds).length
  }

  /** Handle a note being created — track the new ID in the session map */
  const handleNoteCreated = (expId: string, noteId?: string) => {
    if (noteId) {
      setSessionNotesByExp(prev => {
        const next = new Map(prev)
        const existing = next.get(expId) ?? []
        if (!existing.includes(noteId)) {
          next.set(expId, [...existing, noteId])
        }
        return next
      })
    }
    mutateIdeas()
    mutateBatchExps()
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  const selectedBatch = batches.find(b => b.id === selectedBatchId)
  const expectedTests = client ? getExpectedTests(client.planType) : null
  // Total = server-loaded batch experiments + locally-synced (not yet in server data)
  const serverExpIds = new Set(batchExperiments.map(e => e.id))
  const localOnlyCount = [...syncedIdeas.keys()].filter(id => !serverExpIds.has(id)).length
  const addedCount = batchExperiments.length + localOnlyCount
  const countMismatch = expectedTests !== null && addedCount > 0 && addedCount !== expectedTests

  // Available (unsynced) ideas — merges SWR data with optimistically restored ideas
  const availableIdeas = useMemo(() => {
    const seen = new Set<string>()
    const result: ExistingIdea[] = []
    for (const idea of existingIdeas) {
      if (!syncedIdeas.has(idea.id) && !seen.has(idea.id)) {
        seen.add(idea.id)
        result.push(idea)
      }
    }
    for (const idea of restoredIdeas) {
      if (!syncedIdeas.has(idea.id) && !seen.has(idea.id)) {
        seen.add(idea.id)
        result.push(idea)
      }
    }
    return result
  }, [existingIdeas, syncedIdeas, restoredIdeas])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreateBatch = async () => {
    if (!newBatchDate || newBatchDate < minNewBatchDate) return
    setIsCreatingBatch(true)
    setError(null)
    try {
      const fields: Record<string, unknown> = { 'Launch Date': newBatchDate }
      if (clientId) fields['Brand Name'] = [clientId]

      const res = await fetch('/api/airtable/batches', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create batch') }
      const { record } = await res.json()

      // Fire n8n webhook for task creation
      try {
        await fetch(`https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?clientID=${clientId}&batchID=${record.id}`, { method: 'GET' })
      } catch { /* webhook fire-and-forget */ }

      await mutateBatches()
      setSelectedBatchId(record.id)
      setNewBatchMode(false)
      setNewBatchDate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch')
    } finally {
      setIsCreatingBatch(false)
    }
  }

  const syncIdeaToBatch = async (ideaId: string, ideaData?: ExistingIdea) => {
    if (!selectedBatchId) return
    setSyncingId(ideaId)
    setError(null)

    // Capture idea data for display before it disappears from experiment-ideas query
    const idea = ideaData ?? existingIdeas.find(i => i.id === ideaId) ?? {
      id: ideaId, name: ideaId, placement: '', placementUrl: '', hypothesis: '', rationale: '',
      goals: [], devices: '', geos: [], weighting: '', designBrief: '', devBrief: '', mediaLinks: '', walkthroughUrl: '', noteIds: [] as string[], noteCount: 0,
    }

    try {
      const fields: Record<string, unknown> = {
        'Batch': [selectedBatchId],
        'Feedback Status': null, // Clear any previous approval/rejection on resubmission
      }
      if (strategistId) fields['Strategist'] = [strategistId]
      if (designerId)   fields['Designer']   = [designerId]
      if (developerId)  fields['Developer']  = [developerId]
      if (qaId)         fields['QA']         = [qaId]

      const res = await fetch(`/api/airtable/experiments/${ideaId}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Failed to add idea to batch (${res.status})`) }

      setSyncedIdeas(prev => new Map(prev).set(ideaId, idea))
      // Remove from restored list if it was there (re-syncing a previously removed idea)
      setRestoredIdeas(prev => prev.filter(i => i.id !== ideaId))
      mutateIdeas()
      mutateBatches()   // Refresh batch's Experiments Attached so batchExpFilter updates
      mutateBatchExps()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add idea')
    } finally {
      setSyncingId(null)
    }
  }

  const unsyncFromBatch = async (ideaId: string) => {
    setRemovingId(ideaId)
    setError(null)

    // Capture idea data before removing so we can restore it to the available list
    const localIdea = syncedIdeas.get(ideaId)
    const serverIdea = batchExperiments.find(e => e.id === ideaId)

    try {
      const res = await fetch(`/api/airtable/experiments/${ideaId}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({
          fields: {
            'Batch': [],
            'Strategist': [],
            'Designer': [],
            'Developer': [],
            'QA': [],
            'Feedback Status': null,
            'Rejected At': null,
          },
        }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to remove idea from batch') }

      // Optimistically hide from "In Batch" list immediately
      setRemovedFromBatchIds(prev => new Set(prev).add(ideaId))
      setSyncedIdeas(prev => { const next = new Map(prev); next.delete(ideaId); return next })
      // Optimistically restore to available ideas list
      const idea = localIdea ?? (serverIdea ? {
        id: serverIdea.id, name: serverIdea.name, placement: serverIdea.placement,
        placementUrl: serverIdea.placementUrl, hypothesis: serverIdea.hypothesis,
        rationale: serverIdea.rationale, goals: serverIdea.goals, devices: serverIdea.devices,
        geos: serverIdea.geos, weighting: serverIdea.weighting, designBrief: serverIdea.designBrief,
        devBrief: serverIdea.devBrief, mediaLinks: serverIdea.mediaLinks, walkthroughUrl: serverIdea.walkthroughUrl,
        noteIds: serverIdea.noteIds, noteCount: serverIdea.noteCount,
      } : null)
      if (idea) setRestoredIdeas(prev => [...prev, idea])
      // Trigger SWR re-fetches (these run in background — optimistic state covers the gap)
      mutateBatches()
      mutateIdeas()
      mutateBatchExps()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove idea')
    } finally {
      setRemovingId(null)
    }
  }

  const handleCreateIdea = async () => {
    if (!ideaForm.title.trim() || !ideaForm.placementLabel.trim() || !ideaForm.placementUrl.trim() ||
        !ideaForm.hypothesis.trim() || !ideaForm.rationale.trim() || ideaForm.primaryGoals.length === 0 ||
        !ideaForm.weighting.trim() || !ideaForm.designBrief.trim()) {
      setError('Please fill in all required fields for the new idea.')
      return
    }
    setIsCreatingIdea(true)
    setError(null)
    try {
      // 1. Create the idea record
      const ideaFields: Record<string, unknown> = {
        'Test Description': ideaForm.title.trim(),
        'Brand Name': [clientId],
        'Placement': ideaForm.placementLabel.trim(),
        'Placement URL': ideaForm.placementUrl.trim(),
        'Hypothesis': ideaForm.hypothesis.trim(),
        'Rationale': ideaForm.rationale.trim(),
        'Category Primary Goals': ideaForm.primaryGoals,
        'Devices': ideaForm.devices,
        'GEOs': ideaForm.countries,
        'Variants Weight': ideaForm.weighting.trim(),
        'Design Brief': ideaForm.designBrief.trim(),
      }
      if (ideaForm.developmentBrief.trim()) ideaFields['Development Brief'] = ideaForm.developmentBrief.trim()
      if (ideaForm.mediaLinks.trim()) ideaFields['Media/Links'] = ideaForm.mediaLinks.trim()
      if (ideaForm.walkthroughUrl.trim()) ideaFields['Walkthrough Video URL'] = ideaForm.walkthroughUrl.trim()

      const createRes = await fetch('/api/airtable/experiment-ideas', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ fields: ideaFields }),
      })
      if (!createRes.ok) { const err = await createRes.json().catch(() => ({})); throw new Error(err.error || 'Failed to create idea') }
      const { record } = await createRes.json()

      // 2. Sync to batch immediately (pass idea data since it won't be in existingIdeas yet)
      await syncIdeaToBatch(record.id, {
        id: record.id,
        name: ideaForm.title.trim(),
        placement: ideaForm.placementLabel.trim(),
        placementUrl: ideaForm.placementUrl.trim(),
        hypothesis: ideaForm.hypothesis.trim(),
        rationale: ideaForm.rationale.trim(),
        goals: [...ideaForm.primaryGoals],
        devices: ideaForm.devices,
        geos: [...ideaForm.countries],
        weighting: ideaForm.weighting.trim(),
        designBrief: ideaForm.designBrief.trim(),
        devBrief: ideaForm.developmentBrief.trim(),
        mediaLinks: ideaForm.mediaLinks.trim(),
        walkthroughUrl: ideaForm.walkthroughUrl.trim(),
        noteIds: [],
        noteCount: 0,
      })

      setIdeaForm({ ...EMPTY_IDEA })
      setShowNewIdeaForm(false)
      mutateIdeas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create idea')
    } finally {
      setIsCreatingIdea(false)
    }
  }

  const startEdit = (exp: ExistingIdea) => {
    setShowNewIdeaForm(false)
    setEditingId(exp.id)
    setIdeaForm({
      title: exp.name,
      placementLabel: exp.placement,
      placementUrl: exp.placementUrl,
      hypothesis: exp.hypothesis,
      rationale: exp.rationale,
      primaryGoals: [...exp.goals],
      devices: exp.devices || 'All Devices',
      countries: [...exp.geos],
      weighting: exp.weighting,
      designBrief: exp.designBrief,
      developmentBrief: exp.devBrief,
      mediaLinks: exp.mediaLinks,
      walkthroughUrl: exp.walkthroughUrl,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !ideaForm.title.trim()) return
    setIsSavingEdit(true)
    setError(null)
    try {
      const fields: Record<string, unknown> = {
        'Test Description': ideaForm.title.trim(),
        'Placement': ideaForm.placementLabel.trim(),
        'Placement URL': ideaForm.placementUrl.trim(),
        'Hypothesis': ideaForm.hypothesis.trim(),
        'Rationale': ideaForm.rationale.trim(),
        'Category Primary Goals': ideaForm.primaryGoals,
        'Devices': ideaForm.devices,
        'GEOs': ideaForm.countries,
        'Variants Weight': ideaForm.weighting.trim(),
        'Design Brief': ideaForm.designBrief.trim(),
      }
      if (ideaForm.developmentBrief.trim()) fields['Development Brief'] = ideaForm.developmentBrief.trim()
      else fields['Development Brief'] = ''
      if (ideaForm.mediaLinks.trim()) fields['Media/Links'] = ideaForm.mediaLinks.trim()
      else fields['Media/Links'] = ''
      if (ideaForm.walkthroughUrl.trim()) fields['Walkthrough Video URL'] = ideaForm.walkthroughUrl.trim()
      else fields['Walkthrough Video URL'] = ''

      const res = await fetch(`/api/airtable/experiments/${editingId}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to update experiment') }

      setEditingId(null)
      setIdeaForm({ ...EMPTY_IDEA })
      mutateIdeas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIdeaForm({ ...EMPTY_IDEA })
  }

  // Notification tracking check — ideas is level 1
  const alreadyNotifiedIdeas = !!selectedBatch && !!selectedBatch.notificationTracking

  const handleSendToClient = async () => {
    if (alreadyNotifiedIdeas || isSending) return
    setIsSending(true)
    setError(null)
    try {
      // 1. PATCH batch to set Notification Tracking
      const patchRes = await fetch(`/api/airtable/batches/${selectedBatchId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Notification Tracking': 'Client Notified (Ideas)' } }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to update tracking (${patchRes.status})`)
      }

      // 2. Fire webhook (fire-and-forget)
      try {
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?batchID=${selectedBatchId}&clientID=${clientId}&action=submit_ideas_notify_client`,
          { method: 'GET' },
        )
      } catch { /* fire-and-forget */ }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setIsSending(false)
    }
  }

  const toggleGoal = (goal: string) => {
    setIdeaForm(prev => ({
      ...prev,
      primaryGoals: prev.primaryGoals.includes(goal)
        ? prev.primaryGoals.filter(g => g !== goal)
        : [...prev.primaryGoals, goal],
    }))
  }

  const toggleCountry = (country: string) => {
    setIdeaForm(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country],
    }))
  }

  // ── Shared edit form renderer ────────────────────────────────────────────

  const renderIdeaEditForm = (id: string, feedbackNotes?: { note: string; createdTime: string }[]) => (
    <div key={id} className="rounded-xl border border-sky-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold text-neutral-800">Edit Test Idea</h4>
        <button type="button" onClick={cancelEdit}
          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-neutral-100 transition-colors">
          <X className="h-3.5 w-3.5 text-neutral-400" />
        </button>
      </div>

      {feedbackNotes && feedbackNotes.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Client Feedback</p>
          {feedbackNotes.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <MessageSquare className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-800 whitespace-pre-wrap">{n.note}</p>
            </div>
          ))}
        </div>
      )}

      <FormField label="Test Description" required>
        <input type="text" value={ideaForm.title}
          onChange={e => setIdeaForm(p => ({ ...p, title: e.target.value }))}
          className={inputCls} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Placement" required>
          <input type="text" value={ideaForm.placementLabel}
            onChange={e => setIdeaForm(p => ({ ...p, placementLabel: e.target.value }))}
            className={inputCls} />
        </FormField>
        <FormField label="Placement URL" required>
          <input type="text" value={ideaForm.placementUrl}
            onChange={e => setIdeaForm(p => ({ ...p, placementUrl: e.target.value }))}
            className={inputCls} />
        </FormField>
      </div>
      <FormField label="Hypothesis" required>
        <textarea value={ideaForm.hypothesis}
          onChange={e => setIdeaForm(p => ({ ...p, hypothesis: e.target.value }))}
          rows={3} className={inputCls + ' resize-none'} />
      </FormField>
      <FormField label="Rationale" required>
        <textarea value={ideaForm.rationale}
          onChange={e => setIdeaForm(p => ({ ...p, rationale: e.target.value }))}
          rows={3} className={inputCls + ' resize-none'} />
      </FormField>
      <FormField label="Primary Goals" required>
        <div className="grid grid-cols-3 gap-1.5">
          {PRIMARY_GOALS.map(goal => (
            <button key={goal} type="button" onClick={() => toggleGoal(goal)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors',
                ideaForm.primaryGoals.includes(goal)
                  ? 'bg-neutral-800 border-neutral-800 text-white'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
              )}>{goal}</button>
          ))}
        </div>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Devices">
          <select value={ideaForm.devices}
            onChange={e => setIdeaForm(p => ({ ...p, devices: e.target.value }))} className={inputCls}>
            {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </FormField>
        <FormField label="Countries">
          <div className="relative">
            <button type="button" onClick={() => setShowCountriesMenu(o => !o)} className={inputCls + ' text-left'}>
              {ideaForm.countries.length === 0 ? 'Select countries...' : `${ideaForm.countries.length} selected`}
            </button>
            {showCountriesMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {COUNTRIES.map(c => (
                  <label key={c} className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0">
                    <input type="checkbox" checked={ideaForm.countries.includes(c)} onChange={() => toggleCountry(c)} className="mr-2 cursor-pointer" />
                    <span className="text-[12px] text-neutral-700">{c}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </FormField>
      </div>
      <FormField label="Weighting" required>
        <input type="text" value={ideaForm.weighting}
          onChange={e => setIdeaForm(p => ({ ...p, weighting: e.target.value }))}
          className={inputCls} />
      </FormField>
      <FormField label="Design Brief" required>
        <textarea value={ideaForm.designBrief}
          onChange={e => setIdeaForm(p => ({ ...p, designBrief: e.target.value }))}
          rows={3} className={inputCls + ' resize-none'} />
      </FormField>
      <FormField label="Development Brief">
        <textarea value={ideaForm.developmentBrief}
          onChange={e => setIdeaForm(p => ({ ...p, developmentBrief: e.target.value }))}
          rows={3} className={inputCls + ' resize-none'} />
      </FormField>
      <FormField label="Media/Links">
        <textarea value={ideaForm.mediaLinks}
          onChange={e => setIdeaForm(p => ({ ...p, mediaLinks: e.target.value }))}
          rows={2} className={inputCls + ' resize-none'} />
      </FormField>
      <FormField label="Walkthrough Video URL">
        <input type="text" value={ideaForm.walkthroughUrl}
          onChange={e => setIdeaForm(p => ({ ...p, walkthroughUrl: e.target.value }))}
          className={inputCls} />
      </FormField>
      <div className="flex items-center gap-2 pt-2">
        <button type="button" onClick={handleSaveEdit} disabled={isSavingEdit}
          className="h-9 px-5 rounded-lg bg-sky-500 text-white text-[13px] font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center gap-2">
          {isSavingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isSavingEdit ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" onClick={cancelEdit}
          className="h-9 px-4 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )

  // ── Guards ───────────────────────────────────────────────────────────────

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        No client ID provided. Use ?id=recXXX in the URL.
      </div>
    )
  }

  if (!preview && clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading client...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        Client not found (ID: {clientId})
      </div>
    )
  }

  if (submitted) {
    return (
      <FormSuccess
        title="Batch Sent for Review"
        description={
          <>
            Test ideas for <span className="font-semibold text-neutral-700">{client.name}</span> have been
            submitted. The client will be notified to review the batch.
          </>
        }
      />
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const formContent = (
    <>
      <FormHeader
        title="Submit Test Ideas"
        entityName={client.name}
        badge={client.planType || undefined}
        badgeColor="sky"
      />

      {preview && <PreviewBanner />}

      <FormBody>
        <FormError message={error} />

        {/* Step 1 — Client Info */}
        <StepCard num="01" title="Client Info">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                {(client.name[0] ?? '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Client</p>
                <p className="text-[13px] font-medium text-neutral-800 truncate">{client.name}</p>
              </div>
            </div>
            {client.website && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <Globe className="h-3.5 w-3.5 text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Website</p>
                  <p className="text-[13px] text-neutral-800 truncate">{client.website}</p>
                </div>
              </div>
            )}
            {client.planType && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-bold text-neutral-500">
                    {expectedTests ?? '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Plan</p>
                  <p className="text-[13px] text-neutral-800">{client.planType}</p>
                </div>
              </div>
            )}
          </div>
        </StepCard>

        {/* Step 2 — Select or Create Batch (custom card — needs overflow-visible for dropdown) */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
            <span className="h-6 w-6 rounded-full bg-sky-500/10 text-sky-600 text-[11px] font-bold flex items-center justify-center shrink-0">02</span>
            <h2 className="text-[14px] font-semibold text-neutral-800 tracking-tight">Select or Create Batch</h2>
          </div>
          <div className="p-6">
          <div className="space-y-1.5 relative" ref={batchRef}>
            {!newBatchMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setBatchOpen(o => !o)}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-left text-[13px] flex items-center justify-between hover:border-neutral-300 transition-colors"
                >
                  <span className={selectedBatch ? 'text-neutral-800 font-medium' : 'text-neutral-400'}>
                    {selectedBatch ? selectedBatch.label : 'Select a batch…'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                </button>

                {batchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                    {batches.length === 0 ? (
                      <div className="px-3 py-4 text-[13px] text-neutral-400 text-center">No upcoming batches</div>
                    ) : batches.map(b => (
                      <button key={b.id} type="button"
                        onClick={() => { setSelectedBatchId(b.id); setBatchOpen(false) }}
                        className={cn(
                          'w-full text-left px-3 py-2.5 text-[13px] hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0',
                          b.id === selectedBatchId ? 'bg-sky-50 font-medium text-neutral-800' : 'text-neutral-700'
                        )}>
                        {b.label}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => { setBatchOpen(false); setNewBatchMode(true); setNewBatchDate(minNewBatchDate) }}
                      className="w-full text-left px-3 py-2.5 text-[13px] text-sky-700 hover:bg-sky-50 transition-colors border-t border-neutral-200 flex items-center gap-1.5 font-medium">
                      <Plus className="h-3.5 w-3.5" />
                      Create new batch…
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-neutral-800">New Batch</span>
                  <button type="button" onClick={() => { setNewBatchMode(false); setNewBatchDate('') }}
                    className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">
                    ← Back to list
                  </button>
                </div>
                <FormField label="Launch Date" required
                  description={`Earliest: ${minNewBatchDate}${batches.length > 0 ? ' (13 working days from today; 28 days after latest batch)' : ' (13 working days from today)'}`}>
                  <input type="date" value={newBatchDate} min={minNewBatchDate}
                    onChange={e => setNewBatchDate(e.target.value)} className={inputCls} />
                </FormField>
                <button type="button" onClick={handleCreateBatch}
                  disabled={!newBatchDate || newBatchDate < minNewBatchDate || isCreatingBatch}
                  className="w-full h-9 rounded-lg bg-sky-500 text-white text-[13px] font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isCreatingBatch && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCreatingBatch ? 'Creating…' : 'Create Batch'}
                </button>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Step 3 — Add Test Ideas (appears after batch selected) */}
        {selectedBatchId && (
          <StepCard num="03" title="Add Test Ideas">
            {/* Counter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-neutral-800">
                  {addedCount} {addedCount === 1 ? 'test' : 'tests'} added
                </span>
                {expectedTests !== null && (
                  <span className="text-[12px] text-neutral-400">of {expectedTests} expected</span>
                )}
              </div>
              {countMismatch && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium">
                    {addedCount < expectedTests! ? `${expectedTests! - addedCount} more expected` : `${addedCount - expectedTests!} extra`}
                  </span>
                </div>
              )}
            </div>

            {/* Existing unsynced ideas */}
            {availableIdeas.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                  Existing Ideas for {client.name}
                </p>
                <div className="space-y-2">
                  {availableIdeas.map(idea => {
                    if (editingId === idea.id) {
                      return renderIdeaEditForm(idea.id)
                    }
                    return (
                      <div key={idea.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:shadow-sm transition-shadow">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-neutral-800 truncate">{idea.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {idea.placement && (
                              <span className="text-[11px] text-neutral-400">{idea.placement}</span>
                            )}
                            {idea.goals.slice(0, 3).map(g => (
                              <span key={g} className={cn(
                                'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                                goalColors[g] ?? 'bg-neutral-50 text-neutral-500 border-neutral-200'
                              )}>{g}</span>
                            ))}
                            {getMergedNoteCount(idea.id, idea.noteIds) > 0 && (
                              <button type="button"
                                onClick={() => setNotesModalExp({ id: idea.id, name: idea.name, noteIds: getMergedNoteIds(idea.id, idea.noteIds) })}
                                className="inline-flex items-center gap-1 text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors">
                                <FileText className="h-3 w-3" />
                                {getMergedNoteCount(idea.id, idea.noteIds)} {getMergedNoteCount(idea.id, idea.noteIds) === 1 ? 'Note' : 'Notes'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => startEdit(idea)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="Edit idea">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => syncIdeaToBatch(idea.id)}
                            disabled={syncingId === idea.id}
                            className="h-8 px-3 rounded-lg bg-sky-500 text-white text-[12px] font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                            {syncingId === idea.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Plus className="h-3 w-3" />}
                            Add
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* In-batch experiments (server-loaded + locally-synced, deduped) */}
            {(batchExperiments.length > 0 || syncedIdeas.size > 0) && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">In Batch</p>
                <div className="space-y-2">
                  {/* Server-loaded batch experiments */}
                  {batchExperiments.map(exp => {
                    const isRejected = exp.feedbackStatus === 'Client Rejected Idea'
                    const isApproved = exp.feedbackStatus === 'Client Approved Idea'
                    const notes = batchNotesByExp.get(exp.id) ?? []

                    return (
                      <div key={exp.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {isRejected
                                ? <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                : isApproved
                                  ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  : <div className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 shrink-0" />
                              }
                              <p className={cn(
                                'text-[13px] font-medium truncate',
                                isRejected ? 'text-red-800' : isApproved ? 'text-emerald-800' : 'text-neutral-800',
                              )}>{exp.name}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 ml-[22px] flex-wrap">
                              {exp.placement && (
                                <span className={cn('text-[11px]', isRejected ? 'text-red-500/70' : isApproved ? 'text-emerald-600/70' : 'text-neutral-400')}>{exp.placement}</span>
                              )}
                              {exp.goals.slice(0, 3).map(g => (
                                <span key={g} className={cn(
                                  'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                                  goalColors[g] ?? 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                )}>{g}</span>
                              ))}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                  Rejected
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  Approved
                                </span>
                              )}
                              {isRejected && exp.rejectedAt && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-red-500">
                                  <Clock className="h-3 w-3" />
                                  {timeAgo(exp.rejectedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => unsyncFromBatch(exp.id)}
                              disabled={removingId === exp.id}
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Remove from batch">
                              {removingId === exp.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <X className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Note count hyperlink */}
                        {getMergedNoteCount(exp.id, exp.noteIds) > 0 && (
                          <div className="mt-2 ml-[22px]">
                            <button type="button"
                              onClick={() => setNotesModalExp({ id: exp.id, name: exp.name, noteIds: getMergedNoteIds(exp.id, exp.noteIds) })}
                              className="inline-flex items-center gap-1 text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors">
                              <FileText className="h-3 w-3" />
                              {getMergedNoteCount(exp.id, exp.noteIds)} {getMergedNoteCount(exp.id, exp.noteIds) === 1 ? 'Note' : 'Notes'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Locally-synced ideas not yet confirmed by server */}
                  {[...syncedIdeas.entries()]
                    .filter(([id]) => !serverExpIds.has(id))
                    .map(([id, idea]) => (
                    <div key={id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <p className="text-[13px] font-medium text-emerald-800 truncate">{idea.name}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-[22px]">
                            {idea.placement && (
                              <span className="text-[11px] text-emerald-600/70">{idea.placement}</span>
                            )}
                            {idea.goals.slice(0, 3).map(g => (
                              <span key={g} className={cn(
                                'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                                goalColors[g] ?? 'bg-neutral-50 text-neutral-500 border-neutral-200'
                              )}>{g}</span>
                            ))}
                          </div>
                        </div>
                        <button type="button" onClick={() => unsyncFromBatch(id)}
                          disabled={removingId === id}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-emerald-600 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                          title="Remove from batch">
                          {removingId === id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <X className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {/* Note count hyperlink */}
                      {getMergedNoteCount(idea.id, idea.noteIds) > 0 && (
                        <div className="mt-2 ml-[22px]">
                          <button type="button"
                            onClick={() => setNotesModalExp({ id: idea.id, name: idea.name, noteIds: getMergedNoteIds(idea.id, idea.noteIds) })}
                            className="inline-flex items-center gap-1 text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors">
                            <FileText className="h-3 w-3" />
                            {getMergedNoteCount(idea.id, idea.noteIds)} {getMergedNoteCount(idea.id, idea.noteIds) === 1 ? 'Note' : 'Notes'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create new idea */}
            {!showNewIdeaForm ? (
              <button type="button" onClick={() => { setEditingId(null); setShowNewIdeaForm(true) }}
                className="w-full py-3 rounded-xl border-2 border-dashed border-neutral-200 text-[13px] font-medium text-neutral-400 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Idea
              </button>
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-semibold text-neutral-800">New Test Idea</h4>
                  <button type="button" onClick={() => { setShowNewIdeaForm(false); setIdeaForm({ ...EMPTY_IDEA }) }}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-neutral-100 transition-colors">
                    <X className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                </div>

                <FormField label="Test Description" required>
                  <input type="text" value={ideaForm.title}
                    onChange={e => setIdeaForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. 'Sticky Add to Cart on PDP'" className={inputCls} />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Placement" required>
                    <input type="text" value={ideaForm.placementLabel}
                      onChange={e => setIdeaForm(p => ({ ...p, placementLabel: e.target.value }))}
                      placeholder="e.g. Below ATC" className={inputCls} />
                  </FormField>
                  <FormField label="Placement URL" required>
                    <input type="text" value={ideaForm.placementUrl}
                      onChange={e => setIdeaForm(p => ({ ...p, placementUrl: e.target.value }))}
                      placeholder="e.g. https://store.com/product" className={inputCls} />
                  </FormField>
                </div>

                <FormField label="Hypothesis" required
                  description="State the expected outcome and the reasoning behind it.">
                  <textarea value={ideaForm.hypothesis}
                    onChange={e => setIdeaForm(p => ({ ...p, hypothesis: e.target.value }))}
                    placeholder="If we change [X], then [Y] will happen because..." rows={3} className={inputCls + ' resize-none'} />
                </FormField>

                <FormField label="Rationale" required
                  description="Evidence supporting your hypothesis (analytics, heatmaps, etc.)">
                  <textarea value={ideaForm.rationale}
                    onChange={e => setIdeaForm(p => ({ ...p, rationale: e.target.value }))}
                    placeholder="Based on [evidence], this change will..." rows={3} className={inputCls + ' resize-none'} />
                </FormField>

                <FormField label="Primary Goals" required description="Select the metrics this test aims to influence.">
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRIMARY_GOALS.map(goal => (
                      <button key={goal} type="button" onClick={() => toggleGoal(goal)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors',
                          ideaForm.primaryGoals.includes(goal)
                            ? 'bg-neutral-800 border-neutral-800 text-white'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
                        )}>
                        {goal}
                      </button>
                    ))}
                  </div>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Devices">
                    <select value={ideaForm.devices}
                      onChange={e => setIdeaForm(p => ({ ...p, devices: e.target.value }))} className={inputCls}>
                      {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Countries">
                    <div className="relative">
                      <button type="button" onClick={() => setShowCountriesMenu(o => !o)} className={inputCls + ' text-left'}>
                        {ideaForm.countries.length === 0 ? 'Select countries...' : `${ideaForm.countries.length} selected`}
                      </button>
                      {showCountriesMenu && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {COUNTRIES.map(c => (
                            <label key={c} className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0">
                              <input type="checkbox" checked={ideaForm.countries.includes(c)} onChange={() => toggleCountry(c)} className="mr-2 cursor-pointer" />
                              <span className="text-[12px] text-neutral-700">{c}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormField>
                </div>

                <FormField label="Weighting" required description="Traffic split between variants (e.g. 50/50, 33/33/33).">
                  <input type="text" value={ideaForm.weighting}
                    onChange={e => setIdeaForm(p => ({ ...p, weighting: e.target.value }))}
                    placeholder="e.g. 50/50" className={inputCls} />
                </FormField>

                <FormField label="Design Brief" required
                  description="Link a Loom describing how the test should be designed.">
                  <textarea value={ideaForm.designBrief}
                    onChange={e => setIdeaForm(p => ({ ...p, designBrief: e.target.value }))}
                    placeholder="Paste Loom link or description..." rows={3} className={inputCls + ' resize-none'} />
                </FormField>

                <FormField label="Development Brief" description="Technical requirements for implementing the test.">
                  <textarea value={ideaForm.developmentBrief}
                    onChange={e => setIdeaForm(p => ({ ...p, developmentBrief: e.target.value }))}
                    placeholder="Paste Loom link or description..." rows={3} className={inputCls + ' resize-none'} />
                </FormField>

                <FormField label="Media/Links" description="Supporting assets, references, or screenshots.">
                  <textarea value={ideaForm.mediaLinks}
                    onChange={e => setIdeaForm(p => ({ ...p, mediaLinks: e.target.value }))}
                    placeholder="Paste links or describe media..." rows={2} className={inputCls + ' resize-none'} />
                </FormField>

                <FormField label="Walkthrough Video URL">
                  <input type="text" value={ideaForm.walkthroughUrl}
                    onChange={e => setIdeaForm(p => ({ ...p, walkthroughUrl: e.target.value }))}
                    placeholder="e.g. https://loom.com/share/..." className={inputCls} />
                </FormField>

                <div className="flex items-center gap-2 pt-2">
                  <button type="button" onClick={handleCreateIdea} disabled={isCreatingIdea}
                    className="h-9 px-5 rounded-lg bg-sky-500 text-white text-[13px] font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isCreatingIdea && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isCreatingIdea ? 'Creating…' : 'Add to Batch'}
                  </button>
                  <button type="button" onClick={() => { setShowNewIdeaForm(false); setIdeaForm({ ...EMPTY_IDEA }) }}
                    className="h-9 px-4 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </StepCard>
        )}

        {/* Step 4 — Send to Client (appears when ideas added) */}
        {selectedBatchId && addedCount > 0 && (
          <StepCard num="04" title="Send to Client for Review">
            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wide">Batch</span>
                  <p className="text-neutral-800 font-medium mt-0.5">{selectedBatch?.label ?? selectedBatchId}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wide">Launch Date</span>
                  <p className="text-neutral-800 font-medium mt-0.5">{selectedBatch?.launchDate ?? '—'}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wide">Tests</span>
                  <p className="text-neutral-800 font-medium mt-0.5">{addedCount} {addedCount === 1 ? 'test' : 'tests'}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wide">Client</span>
                  <p className="text-neutral-800 font-medium mt-0.5">{client.name}</p>
                </div>
              </div>

              {countMismatch && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-[12px] text-amber-700">
                    The client&apos;s plan expects {expectedTests} {expectedTests === 1 ? 'test' : 'tests'} but {addedCount} {addedCount === 1 ? 'has' : 'have'} been added.
                  </p>
                </div>
              )}
            </div>

            {alreadyNotifiedIdeas ? (
              <button type="button" disabled
                className="w-full h-10 rounded-xl bg-neutral-100 text-neutral-400 text-[13px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                <Bell className="h-4 w-4" />
                Client Already Notified
              </button>
            ) : (
              <button type="button" onClick={handleSendToClient} disabled={isSending}
                className="w-full h-10 rounded-xl bg-sky-500 text-white text-[13px] font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-sky-500/20">
                {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSending ? 'Sending…' : 'Send this batch to the client for review'}
              </button>
            )}
          </StepCard>
        )}
      </FormBody>
    </>
  )

  const notesModal = notesModalExp && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => setNotesModalExp(null)}>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-neutral-800">Experiment Notes</h3>
            <p className="text-[12px] text-neutral-400 mt-0.5 truncate">{notesModalExp.name}</p>
          </div>
          <button type="button" onClick={() => setNotesModalExp(null)}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors shrink-0">
            <X className="h-4 w-4 text-neutral-400" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <NotesPanel
            linkedField="Experiments"
            linkedRecordId={notesModalExp.id}
            authHeaders={authHeaders}
            placeholder="Write a note about this experiment…"
            noteIds={notesModalExp.noteIds}
            showVisibilityToggle
            onNoteCreated={(noteId) => handleNoteCreated(notesModalExp.id, noteId)}
          />
        </div>
      </div>
    </div>
  )

  if (preview) {
    return <PreviewShell>{formContent}</PreviewShell>
  }

  return (
    <>
      {formContent}
      {notesModal}
    </>
  )
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function SubmitIdeasPage() {
  return (
    <FormPage>
      <SubmitIdeasInner />
    </FormPage>
  )
}
