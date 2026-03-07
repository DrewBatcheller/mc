'use client'

/**
 * Submit Design Mockups (Figma) — hosted form at /forms/submit-mockups?id=recBatchID
 *
 * Designer submits Figma URLs for each experiment in a batch.
 * Shows design review status, strategy/client feedback notes, and
 * lets the designer notify strategy when revisions are ready for re-review.
 *
 * This form replaces the old "Design Ready Confirmation" form by combining
 * URL submission + status tracking + re-review notification in one place.
 *
 * Supports ?id=preview for display-only mode with sample data.
 */

import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2, ExternalLink, ChevronDown, ChevronUp, Check, AlertTriangle,
  MessageSquare, Send, Figma, FileText, RefreshCw, Pencil, Clock,
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface BatchInfo {
  name: string
  clientName: string
  clientId: string
  launchDate: string
}

interface MockupExperiment {
  id: string
  name: string
  placement: string
  placementUrl: string
  designBrief: string
  devices: string
  figmaUrl: string
  feedbackStatus: string | null
  noteIds: string[]
  noteCount: number
}

// ─── Feedback Status helpers ─────────────────────────────────────────────────

/** Display config for each Feedback Status value */
const FEEDBACK_CONFIG: Record<string, {
  label: string
  bg: string
  text: string
  border: string
  dot: string
}> = {
  'Awaiting Strategy Review':  { label: 'Awaiting Review',     bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200',   dot: 'bg-amber-500' },
  'Strategy Approved Design':  { label: 'Strategy Approved',   bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Strategy Rejected Design':  { label: 'Revision Needed',     bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200',    dot: 'bg-rose-500' },
  'Client Approved Design':    { label: 'Client Approved',     bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Client Rejected Design':    { label: 'Revision Needed',     bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200',    dot: 'bg-rose-500' },
}

/** Is this feedback status a rejection? */
function isFeedbackRejection(feedbackStatus: string | null): boolean {
  return feedbackStatus === 'Strategy Rejected Design' || feedbackStatus === 'Client Rejected Design'
}

/** Is this feedback status an approval? */
function isFeedbackApproval(feedbackStatus: string | null): boolean {
  return feedbackStatus === 'Strategy Approved Design' || feedbackStatus === 'Client Approved Design'
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

// ─── Preview mock data ───────────────────────────────────────────────────────

const PREVIEW_BATCH: BatchInfo = {
  name: 'Acme Corp | 2026 April 15',
  clientName: 'Acme Corp',
  clientId: 'prev_client',
  launchDate: '2026-04-15',
}

const PREVIEW_EXPERIMENTS: MockupExperiment[] = [
  {
    id: 'prev_e1',
    name: 'Sticky Add to Cart on Mobile PDP',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    designBrief: 'Sticky bar at bottom of viewport with product name + price + ATC button. Should collapse when user is at the top of the page.',
    devices: 'Mobile',
    figmaUrl: 'https://www.figma.com/design/abc123/sticky-atc',
    feedbackStatus: 'Strategy Rejected Design',
    noteIds: ['prev_n1'],
    noteCount: 1,
  },
  {
    id: 'prev_e2',
    name: 'Trust Badges Below Price',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    designBrief: 'Three inline badges with icons: Free Shipping, 30-Day Returns, Secure Checkout. Placed directly below the price.',
    devices: 'All Devices',
    figmaUrl: 'https://www.figma.com/design/def456/trust-badges',
    feedbackStatus: 'Awaiting Strategy Review',
    noteIds: [],
    noteCount: 0,
  },
  {
    id: 'prev_e3',
    name: 'Recently Viewed Products Carousel',
    placement: 'Product Page — Below Reviews',
    placementUrl: 'https://store.acmecorp.com/products/example',
    designBrief: 'Horizontal scrollable carousel with product cards (image, name, price). Max 8 items.',
    devices: 'All Devices',
    figmaUrl: 'https://www.figma.com/design/xyz789/carousel',
    feedbackStatus: 'Client Approved Design',
    noteIds: [],
    noteCount: 0,
  },
]

const PREVIEW_NOTES = new Map<string, { note: string; createdTime: string; author: string; type: string }[]>([
  ['prev_e1', [
    { note: 'CTA button needs more contrast against the hero image. Please use the primary brand green (#2D8B4E) instead of the current grey.', createdTime: '2026-03-04T14:30:00Z', author: 'Sarah (Strategy)', type: 'Strategy Feedback' },
  ]],
])

// ─── Inner Form ──────────────────────────────────────────────────────────────

function SubmitMockupsInner() {
  const searchParams = useSearchParams()
  const batchId = searchParams.get('id') ?? ''
  const preview = isPreviewMode(batchId)
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

  // Optimistic feedback status overrides — clears stale rejection after re-submit until SWR refreshes
  const [feedbackOverrides, setFeedbackOverrides] = useState<Map<string, string | null>>(new Map())

  // ── Data fetches ─────────────────────────────────────────────────────────

  const { data: rawBatch, isLoading: batchLoading } = useAirtable<Record<string, unknown>>('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'Record ID (from Client)', 'Experiments Attached'],
    filterExtra: `RECORD_ID() = "${batchId}"`,
    maxRecords: 1,
    enabled: !!batchId && !preview,
  })

  const experimentIds = useMemo<string[]>(() => {
    if (!rawBatch || rawBatch.length === 0) return []
    const raw = (rawBatch[0].fields as Record<string, unknown>)['Experiments Attached']
    return Array.isArray(raw) ? (raw as string[]) : []
  }, [rawBatch])

  const expFilter = useMemo(() => {
    if (experimentIds.length === 0) return undefined
    if (experimentIds.length === 1) return `RECORD_ID() = "${experimentIds[0]}"`
    return `OR(${experimentIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`
  }, [experimentIds])

  const { data: rawExperiments, isLoading: experimentsLoading, mutate: mutateExperiments } = useAirtable<Record<string, unknown>>('experiments', {
    fields: [
      'Test Description', 'Placement', 'Placement URL',
      'Design Brief', 'Devices', 'FIGMA Url',
      'Feedback Status', 'Notes',
    ],
    filterExtra: expFilter,
    enabled: experimentIds.length > 0 && !preview,
  })

  // ── Derived data ─────────────────────────────────────────────────────────

  const batch = useMemo<BatchInfo | null>(() => {
    if (preview) return PREVIEW_BATCH
    if (!rawBatch || rawBatch.length === 0) return null
    const f = rawBatch[0].fields as Record<string, unknown>
    const brandArr = f['Brand Name']
    const clientIdArr = f['Record ID (from Client)']
    return {
      name: String(f['Batch Key'] ?? ''),
      clientName: Array.isArray(brandArr) ? String(brandArr[0] ?? '') : String(brandArr ?? ''),
      clientId: Array.isArray(clientIdArr) ? String(clientIdArr[0] ?? '') : String(clientIdArr ?? ''),
      launchDate: f['Launch Date'] ? String(f['Launch Date']).split('T')[0] : '',
    }
  }, [rawBatch, preview])

  const experiments = useMemo<MockupExperiment[]>(() => {
    if (preview) return PREVIEW_EXPERIMENTS
    if (!rawExperiments) return []
    return rawExperiments.map(rec => {
      const f = rec.fields as Record<string, unknown>
      const notesRaw = f['Notes']
      // Apply optimistic feedback overrides (cleared after re-submit, before SWR refreshes)
      const serverFeedback = typeof f['Feedback Status'] === 'string' ? (f['Feedback Status'] as string) : null
      const feedbackStatus = feedbackOverrides.has(rec.id) ? (feedbackOverrides.get(rec.id) ?? null) : serverFeedback
      return {
        id: rec.id,
        name: String(f['Test Description'] ?? ''),
        placement: String(f['Placement'] ?? ''),
        placementUrl: String(f['Placement URL'] ?? ''),
        designBrief: String(f['Design Brief'] ?? ''),
        devices: String(f['Devices'] ?? ''),
        figmaUrl: String(f['FIGMA Url'] ?? ''),
        feedbackStatus,
        noteIds: Array.isArray(notesRaw) ? (notesRaw as string[]) : [],
        noteCount: Array.isArray(notesRaw) ? (notesRaw as string[]).length : 0,
      }
    })
  }, [rawExperiments, preview, feedbackOverrides])

  // ── Fetch feedback notes for experiments with revision statuses ─────────

  const feedbackNoteIds = useMemo(() => {
    const ids: string[] = []
    for (const exp of experiments) {
      if (exp.noteIds.length > 0) ids.push(...exp.noteIds)
    }
    return ids
  }, [experiments])

  const noteFilter = useMemo(() => {
    if (feedbackNoteIds.length === 0) return undefined
    const idFilter = feedbackNoteIds.length === 1
      ? `RECORD_ID() = "${feedbackNoteIds[0]}"`
      : `OR(${feedbackNoteIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`
    // Only fetch Strategy Feedback and Client Design Feedback notes
    return `AND(${idFilter}, OR({Experiment Type} = "Strategy Feedback", {Experiment Type} = "Client Design Feedback"))`
  }, [feedbackNoteIds])

  const { data: rawNotes } = useAirtable<Record<string, unknown>>('notes', {
    fields: ['Note', 'Experiments', 'Created Time', 'Experiment Type', 'Created By (Team)', 'Created By (Client)'],
    filterExtra: noteFilter,
    sort: [{ field: 'Created Time', direction: 'desc' }],
    enabled: feedbackNoteIds.length > 0 && !preview,
  })

  const notesByExperiment = useMemo<Map<string, { note: string; createdTime: string; type: string; author: string }[]>>(() => {
    if (preview) return PREVIEW_NOTES
    const map = new Map<string, { note: string; createdTime: string; type: string; author: string }[]>()
    if (!rawNotes) return map
    for (const rec of rawNotes) {
      const f = rec.fields as Record<string, unknown>
      const note = String(f['Note'] ?? '')
      const time = String(f['Created Time'] ?? '')
      const type = String(f['Experiment Type'] ?? '')
      const teamArr = f['Created By (Team)']
      const clientArr = f['Created By (Client)']
      const author = Array.isArray(teamArr) && teamArr.length > 0
        ? String(teamArr[0])
        : Array.isArray(clientArr) && clientArr.length > 0
          ? String(clientArr[0])
          : ''
      const expIds = (f['Experiments'] as string[]) ?? []
      for (const eid of expIds) {
        if (!map.has(eid)) map.set(eid, [])
        map.get(eid)!.push({ note, createdTime: time, type, author })
      }
    }
    return map
  }, [rawNotes, preview])

  // ── State ────────────────────────────────────────────────────────────────

  // Per-experiment local Figma URL edits (in-progress editing, before save)
  const [localUrls, setLocalUrls] = useState<Map<string, string>>(new Map())
  // Optimistic saved URLs — survives between save and SWR refetch
  const [savedUrls, setSavedUrls] = useState<Map<string, string>>(new Map())
  // Track which experiments have been saved this session (for "Saved" confirmation)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  // Track which experiment's URL is being edited (for edit-mode toggle)
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null)
  // Track in-flight saves
  const [savingId, setSavingId] = useState<string | null>(null)
  // Track in-flight notify actions
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  // Expanded experiment cards
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Notes modal
  const [notesModalExp, setNotesModalExp] = useState<{ id: string; name: string; noteIds: string[] } | null>(null)
  // Track note IDs created this session per experiment — survives modal close/reopen
  const [sessionNotesByExp, setSessionNotesByExp] = useState<Map<string, string[]>>(new Map())
  // Error
  const [error, setError] = useState<string | null>(null)

  // ── Note helpers (merge server + session note IDs) ───────────────────────

  const getMergedNoteIds = (expId: string, serverNoteIds: string[]): string[] => {
    const sessionIds = sessionNotesByExp.get(expId) ?? []
    if (sessionIds.length === 0) return serverNoteIds
    const set = new Set(serverNoteIds)
    for (const id of sessionIds) set.add(id)
    return [...set]
  }

  const getMergedNoteCount = (expId: string, serverNoteIds: string[]): number => {
    return getMergedNoteIds(expId, serverNoteIds).length
  }

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
    mutateExperiments()
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  /** Get the current Figma URL — local edit > saved (optimistic) > server value */
  const getFigmaUrl = useCallback((exp: MockupExperiment) => {
    if (localUrls.has(exp.id)) return localUrls.get(exp.id)!
    if (savedUrls.has(exp.id)) return savedUrls.get(exp.id)!
    return exp.figmaUrl
  }, [localUrls, savedUrls])

  /** Has the local URL changed from the last saved or server value? */
  const hasUnsavedChanges = useCallback((exp: MockupExperiment) => {
    if (!localUrls.has(exp.id)) return false
    const baseline = savedUrls.has(exp.id) ? savedUrls.get(exp.id)! : exp.figmaUrl
    return localUrls.get(exp.id) !== baseline
  }, [localUrls, savedUrls])

  // Summary counts
  const totalCount = experiments.length
  const withUrl = experiments.filter(e => getFigmaUrl(e).trim() !== '').length
  const approvedCount = experiments.filter(e => isFeedbackApproval(e.feedbackStatus)).length
  const revisionCount = experiments.filter(e => isFeedbackRejection(e.feedbackStatus)).length

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUrlChange = (expId: string, url: string) => {
    setLocalUrls(prev => new Map(prev).set(expId, url))
  }

  const handleSaveUrl = async (exp: MockupExperiment) => {
    const url = getFigmaUrl(exp).trim()
    if (savingId || notifyingId) return

    setSavingId(exp.id)
    setError(null)

    try {
      const res = await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'FIGMA Url': url } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to save (${res.status})`)
      }

      // Optimistic: store the saved URL so it persists until SWR refreshes
      setSavedUrls(prev => new Map(prev).set(exp.id, url))
      setSavedIds(prev => new Set(prev).add(exp.id))
      setLocalUrls(prev => { const next = new Map(prev); next.delete(exp.id); return next })
      setEditingUrlId(null)
      mutateExperiments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Figma URL')
    } finally {
      setSavingId(null)
    }
  }

  const handleNotifyStrategy = async (exp: MockupExperiment) => {
    const url = getFigmaUrl(exp).trim()
    if (!url) {
      setError('Please enter a Figma URL before notifying strategy.')
      return
    }
    if (notifyingId || savingId) return

    setNotifyingId(exp.id)
    setError(null)

    try {
      // 1. Save Figma URL
      const fields: Record<string, unknown> = { 'FIGMA Url': url }

      // 2. Set to "Awaiting Strategy Review" so the designer sees a waiting state
      fields['Feedback Status'] = 'Awaiting Strategy Review'

      const res = await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to notify strategy (${res.status})`)
      }

      // 3. Fire webhook for Slack notification (fire-and-forget)
      try {
        const clientId = batch?.clientId ?? ''
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?experimentID=${exp.id}&batchID=${batchId}&clientID=${clientId}&action=design_submitted`,
          { method: 'GET' },
        )
      } catch { /* webhook fire-and-forget */ }

      // Optimistic: store the saved URL and clear feedback so UI updates immediately
      setSavedUrls(prev => new Map(prev).set(exp.id, url))
      setSavedIds(prev => new Set(prev).add(exp.id))
      setLocalUrls(prev => { const next = new Map(prev); next.delete(exp.id); return next })
      setEditingUrlId(null)
      setFeedbackOverrides(prev => new Map(prev).set(exp.id, 'Awaiting Strategy Review'))
      mutateExperiments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify strategy')
    } finally {
      setNotifyingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  // ── Guards ───────────────────────────────────────────────────────────────

  if (!batchId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        No batch ID provided. Use ?id=recXXX in the URL.
      </div>
    )
  }

  if (!preview && (batchLoading || (experimentIds.length > 0 && experimentsLoading))) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading batch…
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        Batch not found (ID: {batchId})
      </div>
    )
  }

  if (!preview && experiments.length === 0 && !batchLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        No experiments found for this batch.
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const formContent = (
    <>
      <FormHeader
        title="Submit Design Mockups"
        entityName={batch.clientName}
        badge={batch.name || undefined}
        badgeColor="sky"
      />

      {preview && <PreviewBanner />}

      <FormBody>
        <FormError message={error} />

        {/* Step 1 — Batch Info */}
        <StepCard num="01" title="Batch Overview">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                {(batch.clientName[0] ?? '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Client</p>
                <p className="text-[13px] font-medium text-neutral-800 truncate">{batch.clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <Figma className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Designs</p>
                <p className="text-[13px] text-neutral-800">{withUrl} of {totalCount} submitted</p>
              </div>
            </div>
            {batch.launchDate && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <Clock className="h-3.5 w-3.5 text-neutral-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Launch</p>
                  <p className="text-[13px] text-neutral-800">{batch.launchDate}</p>
                </div>
              </div>
            )}
          </div>
        </StepCard>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-neutral-800">
              {approvedCount} of {totalCount} approved
            </span>
            <div className="flex items-center gap-3">
              {revisionCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {revisionCount} revision{revisionCount !== 1 ? 's' : ''} requested
                </span>
              )}
              {approvedCount === totalCount && totalCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  All approved
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                approvedCount === totalCount && totalCount > 0 ? 'bg-emerald-500' : 'bg-sky-500'
              )}
              style={{ width: totalCount > 0 ? `${(approvedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Step 2 — Experiment Cards */}
        <StepCard num="02" title="Design Mockups">
          <div className="space-y-3">
            {experiments.map(exp => {
              const fbConfig = exp.feedbackStatus ? FEEDBACK_CONFIG[exp.feedbackStatus] : null
              const isRejection = isFeedbackRejection(exp.feedbackStatus)
              const isApproval = isFeedbackApproval(exp.feedbackStatus)
              const hasUrl = getFigmaUrl(exp).trim() !== ''
              // Editable when: no feedback, or feedback is a rejection (designer revises)
              const editable = !exp.feedbackStatus || isRejection
              // Show notify button when: has URL AND (no feedback yet OR rejection needing re-submit)
              const showNotify = hasUrl && (!exp.feedbackStatus || isRejection)
              const isExpanded = expandedId === exp.id
              const currentUrl = getFigmaUrl(exp)
              const unsaved = hasUnsavedChanges(exp)
              const isSaving = savingId === exp.id
              const isNotifying = notifyingId === exp.id
              const notes = notesByExperiment.get(exp.id) ?? []
              const justSaved = savedIds.has(exp.id) && !unsaved

              // Status badge: derived from feedback status + URL presence
              const badgeLabel = fbConfig?.label ?? (hasUrl ? 'Ready' : 'No Design')
              const badgeBg = fbConfig?.bg ?? (hasUrl ? 'bg-sky-50' : 'bg-neutral-50')
              const badgeText = fbConfig?.text ?? (hasUrl ? 'text-sky-700' : 'text-neutral-500')
              const badgeBorder = fbConfig?.border ?? (hasUrl ? 'border-sky-200' : 'border-neutral-200')
              const dotColor = fbConfig?.dot ?? (hasUrl ? 'bg-sky-500' : 'bg-neutral-400')

              return (
                <div
                  key={exp.id}
                  className={cn(
                    'rounded-xl border transition-all',
                    'border-neutral-200 bg-white',
                  )}
                >
                  {/* Card header — always visible */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(exp.id)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                  >
                    {/* Status dot */}
                    <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)} />

                    {/* Name + metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-neutral-800 truncate">{exp.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {exp.placement && (
                          <span className="text-[11px] text-neutral-400">{exp.placement}</span>
                        )}
                        {exp.devices && (
                          <span className="text-[11px] text-neutral-400">· {exp.devices}</span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0',
                      badgeBg, badgeText, badgeBorder,
                    )}>
                      {badgeLabel}
                    </span>

                    {/* Figma indicator */}
                    {currentUrl ? (
                      <Figma className="h-4 w-4 text-neutral-400 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded border border-dashed border-neutral-300 shrink-0" />
                    )}

                    {/* Chevron */}
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-neutral-400 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
                    }
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-neutral-100 pt-4">

                      {/* Revision feedback callout — highlighted when feedback is a rejection */}
                      {isRejection && notes.length > 0 && (() => {
                        const isStrategyRevision = exp.feedbackStatus === 'Strategy Rejected Design'
                        return (
                        <div className={cn(
                          'rounded-lg border p-3 space-y-2',
                          isStrategyRevision
                            ? 'border-rose-200 bg-rose-50'
                            : 'border-orange-200 bg-orange-50',
                        )}>
                          <p className={cn(
                            'text-[11px] font-semibold uppercase tracking-wide',
                            isStrategyRevision
                              ? 'text-rose-600'
                              : 'text-orange-600',
                          )}>
                            {isStrategyRevision
                              ? 'Strategy Feedback'
                              : 'Client Feedback'}
                          </p>
                          {notes
                            .filter(n =>
                              isStrategyRevision
                                ? n.type === 'Strategy Feedback'
                                : n.type === 'Client Design Feedback'
                            )
                            .map((n, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <MessageSquare className={cn(
                                'h-3 w-3 shrink-0 mt-0.5',
                                isStrategyRevision ? 'text-rose-400' : 'text-orange-400',
                              )} />
                              <div className="min-w-0">
                                <p className={cn(
                                  'text-[12px] whitespace-pre-wrap',
                                  isStrategyRevision ? 'text-rose-800' : 'text-orange-800',
                                )}>{n.note}</p>
                                <p className="text-[10px] text-neutral-400 mt-0.5">{timeAgo(n.createdTime)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        )
                      })()}

                      {/* Design brief */}
                      {exp.designBrief && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Design Brief</p>
                          <p className="text-[13px] text-neutral-700 whitespace-pre-wrap leading-relaxed">{exp.designBrief}</p>
                        </div>
                      )}

                      {/* Placement URL */}
                      {exp.placementUrl && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Placement URL</p>
                          <a
                            href={exp.placementUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-sky-600 hover:text-sky-700 underline underline-offset-2 break-all inline-flex items-center gap-1"
                          >
                            {exp.placementUrl}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {/* Figma URL */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
                          Figma URL
                        </p>

                        {(() => {
                          // Determine if we're actively editing this URL
                          // Show input if: user clicked the edit pencil (any status), OR no URL yet and status allows editing
                          const isEditingUrl = editingUrlId === exp.id || (editable && !currentUrl.trim())

                          if (isEditingUrl) {
                            // ── Input mode: no URL yet, or user clicked edit ──
                            return (
                              <div className="space-y-2">
                                <input
                                  type="url"
                                  autoFocus={editingUrlId === exp.id}
                                  value={localUrls.has(exp.id) ? localUrls.get(exp.id)! : currentUrl}
                                  onChange={e => handleUrlChange(exp.id, e.target.value)}
                                  placeholder="https://www.figma.com/design/..."
                                  className={cn(inputCls, unsaved && 'border-sky-400 ring-2 ring-sky-400/20')}
                                />

                                <div className="flex items-center gap-2">
                                  {/* Save button */}
                                  {unsaved && (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveUrl(exp)}
                                      disabled={isSaving}
                                      className="h-8 px-4 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-[12px] font-medium hover:bg-sky-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                      {isSaving
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <Check className="h-3 w-3" />}
                                      {isSaving ? 'Saving…' : 'Save URL'}
                                    </button>
                                  )}

                                  {/* Cancel edit — only when editing an existing URL */}
                                  {editingUrlId === exp.id && currentUrl.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUrlId(null)
                                        setLocalUrls(prev => { const next = new Map(prev); next.delete(exp.id); return next })
                                      }}
                                      className="h-8 px-3 rounded-lg border border-neutral-200 text-neutral-500 text-[12px] font-medium hover:bg-neutral-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          }

                          if (currentUrl.trim()) {
                            // ── Display mode: URL exists, show "Open in Figma" + edit button ──
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={currentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors text-[12px] text-neutral-700 group"
                                  >
                                    <Figma className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-600" />
                                    <span className="truncate max-w-[300px]">Open in Figma</span>
                                    <ExternalLink className="h-3 w-3 text-neutral-400 shrink-0" />
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUrlId(exp.id)
                                      // Pre-fill localUrls with the current value so the input is populated
                                      setLocalUrls(prev => new Map(prev).set(exp.id, currentUrl))
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 transition-colors shrink-0"
                                    title="Edit Figma URL"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>

                                {/* Saved confirmation */}
                                {justSaved && !unsaved && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                    <Check className="h-3 w-3" />
                                    Saved
                                  </span>
                                )}
                              </div>
                            )
                          }

                          // ── No URL, non-editable status ──
                          return <p className="text-[12px] text-neutral-400 italic">No Figma URL submitted</p>
                        })()}
                      </div>

                      {/* All notes (non-revision view) — collapsed by default */}
                      {!isRejection && notes.length > 0 && (
                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                            Feedback Notes
                          </p>
                          {notes.map((n, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <MessageSquare className="h-3 w-3 text-neutral-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-[12px] text-neutral-700 whitespace-pre-wrap">{n.note}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-neutral-400">{timeAgo(n.createdTime)}</span>
                                  {n.type && (
                                    <span className={cn(
                                      'text-[9px] font-semibold px-1.5 py-0.5 rounded border',
                                      n.type === 'Strategy Feedback'
                                        ? 'bg-violet-50 text-violet-600 border-violet-200'
                                        : 'bg-orange-50 text-orange-600 border-orange-200',
                                    )}>{n.type === 'Strategy Feedback' ? 'Strategy' : 'Client'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Note count link to notes modal */}
                      {getMergedNoteCount(exp.id, exp.noteIds) > 0 && (
                        <button
                          type="button"
                          onClick={() => setNotesModalExp({ id: exp.id, name: exp.name, noteIds: getMergedNoteIds(exp.id, exp.noteIds) })}
                          className="inline-flex items-center gap-1 text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          View all {getMergedNoteCount(exp.id, exp.noteIds)} {getMergedNoteCount(exp.id, exp.noteIds) === 1 ? 'note' : 'notes'}
                        </button>
                      )}

                      {/* Action buttons */}
                      {showNotify && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleNotifyStrategy(exp)}
                            disabled={isNotifying || !currentUrl.trim()}
                            className={cn(
                              'h-10 px-5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm',
                              isRejection
                                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
                                : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/20',
                            )}
                          >
                            {isNotifying
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : isRejection
                                ? <RefreshCw className="h-3.5 w-3.5" />
                                : <Send className="h-3.5 w-3.5" />
                            }
                            {isNotifying
                              ? 'Sending…'
                              : isRejection
                                ? 'Re-submit to Strategy'
                                : 'Notify Strategy'
                            }
                          </button>
                          {!currentUrl.trim() && (
                            <span className="text-[11px] text-neutral-400">
                              Enter a Figma URL first
                            </span>
                          )}
                        </div>
                      )}

                      {/* Read-only status messages — feedback status only */}
                      {exp.feedbackStatus === 'Awaiting Strategy Review' && (
                        <div className="flex items-center gap-2 py-1">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-[12px] text-amber-700 font-medium">Submitted — awaiting strategy review</span>
                        </div>
                      )}
                      {exp.feedbackStatus === 'Strategy Approved Design' && (
                        <div className="flex items-center gap-2 py-1">
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[12px] text-emerald-700 font-medium">Strategy approved — awaiting client review</span>
                        </div>
                      )}
                      {exp.feedbackStatus === 'Client Approved Design' && (
                        <div className="flex items-center gap-2 py-1">
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[12px] text-emerald-700 font-medium">Design approved — no action needed</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </StepCard>
      </FormBody>
    </>
  )

  return (
    <>
      {preview ? (
        <>
          {formContent}
          <PreviewShell><div /></PreviewShell>
        </>
      ) : (
        formContent
      )}

      {/* Notes modal */}
      {notesModalExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-neutral-800 truncate">{notesModalExp.name}</h3>
                <p className="text-[11px] text-neutral-400">Notes & Feedback</p>
              </div>
              <button
                type="button"
                onClick={() => setNotesModalExp(null)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors text-neutral-400"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <NotesPanel
                linkedField="Experiments"
                linkedRecordId={notesModalExp.id}
                authHeaders={authHeaders}
                noteIds={notesModalExp.noteIds}
                placeholder="Add a note about this experiment…"
                mode="full"
                showVisibilityToggle
                onNoteCreated={(noteId) => handleNoteCreated(notesModalExp.id, noteId)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function SubmitMockupsPage() {
  return (
    <FormPage>
      <SubmitMockupsInner />
    </FormPage>
  )
}
