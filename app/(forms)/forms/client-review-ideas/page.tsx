'use client'

/**
 * Client Review & Approve Ideas — hosted form at /forms/client-review-ideas?id=recBatchID
 *
 * Client reviews test ideas submitted by their strategist for a batch.
 * Each idea can be individually approved or rejected with feedback.
 * Rejections create a Note linked to the experiment; approvals/rejections
 * each fire an n8n webhook so the strategist is notified in real-time.
 *
 * Rejection does NOT remove the idea from the batch — the strategist decides
 * whether to desync → edit → resync, or replace with a new idea.
 *
 * Supports ?id=preview for display-only mode with sample data.
 */

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2, ChevronDown, ChevronUp, Check, X, ThumbsUp, ThumbsDown,
  ExternalLink, AlertTriangle, FileText,
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

interface ReviewExperiment {
  id: string
  name: string
  hypothesis: string
  rationale: string
  placement: string
  placementUrl: string
  goals: string[]
  devices: string
  geos: string
  weighting: string
  designBrief: string
  devBrief: string
  mediaLinks: string
  walkthroughUrl: string
  feedbackStatus: string | null
  noteIds: string[]
  noteCount: number
}

interface BatchInfo {
  name: string
  clientName: string
  clientId: string
  launchDate: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const PREVIEW_BATCH: BatchInfo = {
  name: 'Acme Corp | 2026 April 15',
  clientName: 'Acme Corp',
  clientId: 'prev_client',
  launchDate: '2026-04-15',
}

const PREVIEW_EXPERIMENTS: ReviewExperiment[] = [
  {
    id: 'prev_e1',
    name: 'Sticky Add to Cart on Mobile PDP',
    hypothesis: 'If we make the Add to Cart button sticky on mobile product pages, then ATC rate will increase because users will always have the action visible.',
    rationale: 'Heatmap data shows 40% of mobile users scroll past the ATC button and never scroll back. Session recordings confirm drop-off at fold.',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    goals: ['ATC', 'CVR'],
    devices: 'Mobile',
    geos: 'United States',
    weighting: '50/50',
    designBrief: 'Sticky bar at bottom of viewport with product name + price + ATC button. Should collapse when user is at the top of the page.',
    devBrief: 'Use IntersectionObserver to detect when original ATC is out of viewport. Render fixed bar with same add-to-cart functionality.',
    mediaLinks: '',
    walkthroughUrl: 'https://loom.com/share/example1',
    feedbackStatus: null,
    noteIds: [],
    noteCount: 0,
  },
  {
    id: 'prev_e2',
    name: 'Trust Badges Below Price',
    hypothesis: 'If we add trust badges (shipping, returns, secure checkout) below the price, then CVR will increase because users will feel more confident purchasing.',
    rationale: 'Post-purchase survey indicates 25% of customers cite "trust" as a concern. Competitor analysis shows top 3 competitors all use trust badges.',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    goals: ['CVR'],
    devices: 'All Devices',
    geos: 'United States, Canada',
    weighting: '50/50',
    designBrief: 'Three inline badges with icons: Free Shipping, 30-Day Returns, Secure Checkout. Placed directly below the price and above variant selectors.',
    devBrief: '',
    mediaLinks: 'https://figma.com/file/example',
    walkthroughUrl: '',
    feedbackStatus: 'Client Approved Idea',
    noteIds: ['prev_n1'],
    noteCount: 1,
  },
  {
    id: 'prev_e3',
    name: 'Recently Viewed Products Carousel',
    hypothesis: 'If we show recently viewed products on the PDP, then session depth and RPV will increase because users will explore more products.',
    rationale: 'Analytics shows average session depth is 2.1 pages. Adding cross-navigation could increase this to 3+ pages.',
    placement: 'Product Page — Below Reviews',
    placementUrl: 'https://store.acmecorp.com/products/example',
    goals: ['RPV', 'CVR'],
    devices: 'All Devices',
    geos: 'All GEOs',
    weighting: '50/50',
    designBrief: 'Horizontal scrollable carousel with product cards (image, name, price). Max 8 items.',
    devBrief: 'Use localStorage to track viewed product IDs. Fetch product data via storefront API.',
    mediaLinks: '',
    walkthroughUrl: '',
    feedbackStatus: null,
    noteIds: [],
    noteCount: 0,
  },
]

// ─── Detail Field Component ──────────────────────────────────────────────────

function DetailField({ label, value, isUrl }: { label: string; value: string; isUrl?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">{label}</p>
      {isUrl ? (
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-[13px] text-sky-600 hover:text-sky-700 underline underline-offset-2 break-all flex items-center gap-1">
          {value}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <p className="text-[13px] text-neutral-700 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  )
}

// ─── Inner Form ──────────────────────────────────────────────────────────────

function ClientReviewIdeasInner() {
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

  // ── Data fetches ─────────────────────────────────────────────────────────

  const { data: rawBatch, isLoading: batchLoading } = useAirtable<Record<string, unknown>>('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'Record ID (from Client)', 'Experiments Attached'],
    filterExtra: `RECORD_ID() = "${batchId}"`,
    maxRecords: 1,
    enabled: !!batchId && !preview,
  })

  // Extract experiment record IDs from the batch's linked "Experiments Attached" field.
  // Airtable returns linked record fields as arrays of record IDs via REST API.
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

  const { data: rawExperiments, isLoading: experimentsLoading } = useAirtable<Record<string, unknown>>('experiments', {
    fields: [
      'Test Description', 'Hypothesis', 'Rationale', 'Placement', 'Placement URL',
      'Category Primary Goals', 'Devices', 'GEOs', 'Variants Weight',
      'Design Brief', 'Development Brief', 'Media/Links', 'Walkthrough Video URL',
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

  const experiments = useMemo<ReviewExperiment[]>(() => {
    if (preview) return PREVIEW_EXPERIMENTS
    if (!rawExperiments) return []
    return rawExperiments.map(rec => {
      const f = rec.fields as Record<string, unknown>
      const goalsRaw = f['Category Primary Goals']
      const status = f['Feedback Status']
      const notesRaw = f['Notes']
      return {
        id: rec.id,
        name: String(f['Test Description'] ?? ''),
        hypothesis: String(f['Hypothesis'] ?? ''),
        rationale: String(f['Rationale'] ?? ''),
        placement: String(f['Placement'] ?? ''),
        placementUrl: String(f['Placement URL'] ?? ''),
        goals: Array.isArray(goalsRaw) ? (goalsRaw as string[]) : goalsRaw ? [String(goalsRaw)] : [],
        devices: String(f['Devices'] ?? ''),
        geos: String(f['GEOs'] ?? ''),
        weighting: String(f['Variants Weight'] ?? ''),
        designBrief: String(f['Design Brief'] ?? ''),
        devBrief: String(f['Development Brief'] ?? ''),
        mediaLinks: String(f['Media/Links'] ?? ''),
        walkthroughUrl: String(f['Walkthrough Video URL'] ?? ''),
        feedbackStatus: typeof status === 'string' ? status : null,
        noteIds: Array.isArray(notesRaw) ? (notesRaw as string[]) : [],
        noteCount: Array.isArray(notesRaw) ? (notesRaw as string[]).length : 0,
      }
    })
  }, [rawExperiments, preview])

  // ── Fetch existing feedback notes ────────────────────────────────────────

  // Collect all note IDs from experiments for RECORD_ID() filter
  const allNoteIds = useMemo(() => {
    const ids: string[] = []
    for (const exp of experiments) {
      if (exp.noteIds.length > 0) ids.push(...exp.noteIds)
    }
    return ids
  }, [experiments])

  const noteFilter = useMemo(() => {
    if (allNoteIds.length === 0) return undefined
    // Use RECORD_ID() pattern — reliable, unlike ARRAYJOIN which returns display names
    return allNoteIds.length === 1
      ? `RECORD_ID() = "${allNoteIds[0]}"`
      : `OR(${allNoteIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`
  }, [allNoteIds])

  const { data: rawNotes, mutate: mutateNotes } = useAirtable<Record<string, unknown>>('notes', {
    fields: ['Note', 'Experiments', 'Created Time', 'Created By (Client)', 'Created By (Team)', 'Visibility'],
    filterExtra: noteFilter,
    enabled: allNoteIds.length > 0 && !preview,
  })

  const notesByExperiment = useMemo<Map<string, { note: string; createdTime: string; createdByClient?: string; visibility?: string }[]>>(() => {
    const map = new Map<string, { note: string; createdTime: string; createdByClient?: string; visibility?: string }[]>()
    if (!rawNotes) return map
    for (const rec of rawNotes) {
      const f = rec.fields as Record<string, unknown>
      const note = String(f['Note'] ?? '')
      const time = String(f['Created Time'] ?? '')
      const clientArr = f['Created By (Client)']
      const createdByClient = Array.isArray(clientArr) ? String(clientArr[0] ?? '') : typeof clientArr === 'string' ? clientArr : undefined
      const vis = (f['Visibility'] as string) ?? undefined
      const expIds = (f['Experiments'] as string[]) ?? []
      for (const eid of expIds) {
        if (!map.has(eid)) map.set(eid, [])
        map.get(eid)!.push({ note, createdTime: time, createdByClient, visibility: vis })
      }
    }
    return map
  }, [rawNotes])

  // ── State ────────────────────────────────────────────────────────────────

  // Session-level decisions override server data (for same-session approvals/rejections)
  const [sessionDecisions, setSessionDecisions] = useState<Map<string, 'approved' | 'rejected'>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Notes modal
  const [notesModalExp, setNotesModalExp] = useState<{ id: string; name: string; noteIds: string[] } | null>(null)
  // Track note IDs created this session per experiment — survives modal close/reopen
  const [sessionNotesByExp, setSessionNotesByExp] = useState<Map<string, string[]>>(new Map())

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject'
    expId: string
    expName: string
    feedbackNote?: string
  } | null>(null)

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
    mutateNotes()
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  // Merge server data + session overrides — session decisions always win
  const decisions = useMemo(() => {
    const merged = new Map<string, 'approved' | 'rejected'>()
    for (const exp of experiments) {
      if (exp.feedbackStatus === 'Client Approved Idea') {
        merged.set(exp.id, 'approved')
      } else if (exp.feedbackStatus === 'Client Rejected Idea') {
        merged.set(exp.id, 'rejected')
      }
    }
    for (const [id, decision] of sessionDecisions) {
      merged.set(id, decision)
    }
    return merged
  }, [experiments, sessionDecisions])

  const reviewedCount = decisions.size
  const totalCount = experiments.length
  const allReviewed = totalCount > 0 && reviewedCount === totalCount

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleApprove = async (experimentId: string) => {
    if (processingId) return
    setProcessingId(experimentId)
    setError(null)

    try {
      const res = await fetch(`/api/airtable/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Feedback Status': 'Client Approved Idea' } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to approve (${res.status})`)
      }

      // Fire webhook (fire-and-forget)
      try {
        const clientId = batch?.clientId ?? user?.clientId ?? ''
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/TODO_UUID?experimentID=${experimentId}&batchID=${batchId}&clientID=${clientId}&action=approved`,
          { method: 'GET' },
        )
      } catch { /* webhook fire-and-forget */ }

      setSessionDecisions(prev => new Map(prev).set(experimentId, 'approved'))
      setRejectingId(null)
      setFeedbackText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve idea')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (experimentId: string) => {
    if (processingId || !feedbackText.trim()) return
    setProcessingId(experimentId)
    setError(null)

    try {
      // 1. Create rejection Note
      const noteFields: Record<string, unknown> = {
        Note: feedbackText.trim(),
        Experiments: [experimentId],
      }
      if (user) {
        if (user.role === 'client') {
          noteFields['Created By (Client)'] = [user.id]
        } else {
          noteFields['Created By (Team)'] = [user.id]
        }
      }
      noteFields['Experiment Type'] = 'Client Idea Feedback'

      const noteRes = await fetch('/api/airtable/notes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ fields: noteFields }),
      })
      if (!noteRes.ok) {
        const err = await noteRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create feedback note')
      }

      // 2. PATCH experiment — mark as not approved (stays in batch)
      const patchRes = await fetch(`/api/airtable/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Feedback Status': 'Client Rejected Idea', 'Rejected At': new Date().toISOString() } }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to update experiment (${patchRes.status})`)
      }

      // 3. Fire webhook (fire-and-forget)
      try {
        const clientId = batch?.clientId ?? user?.clientId ?? ''
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/TODO_UUID?experimentID=${experimentId}&batchID=${batchId}&clientID=${clientId}&action=rejected`,
          { method: 'GET' },
        )
      } catch { /* webhook fire-and-forget */ }

      setSessionDecisions(prev => new Map(prev).set(experimentId, 'rejected'))
      setRejectingId(null)
      setFeedbackText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rejection')
    } finally {
      setProcessingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
    // Close rejection form if collapsing
    if (expandedId === id) {
      setRejectingId(null)
      setFeedbackText('')
    }
  }

  const startRejection = (id: string) => {
    setRejectingId(id)
    setFeedbackText('')
    // Ensure card is expanded
    if (expandedId !== id) setExpandedId(id)
  }

  // Confirmation flow — show modal before committing
  const requestApproval = (expId: string, expName: string) => {
    setConfirmAction({ type: 'approve', expId, expName })
  }
  const requestRejection = (expId: string, expName: string) => {
    if (!feedbackText.trim()) return
    setConfirmAction({ type: 'reject', expId, expName, feedbackNote: feedbackText.trim() })
  }
  const confirmAndExecute = async () => {
    if (!confirmAction) return
    if (confirmAction.type === 'approve') {
      await handleApprove(confirmAction.expId)
    } else {
      await handleReject(confirmAction.expId)
    }
    setConfirmAction(null)
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
        No test ideas found for this batch.
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const formContent = (
    <>
      <FormHeader
        title="Review Test Ideas"
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
                <span className="text-[12px] font-bold text-neutral-500">{totalCount}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Tests</p>
                <p className="text-[13px] text-neutral-800">{totalCount} {totalCount === 1 ? 'idea' : 'ideas'} to review</p>
              </div>
            </div>
            {batch.launchDate && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-neutral-500">📅</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Launch Date</p>
                  <p className="text-[13px] text-neutral-800">{batch.launchDate}</p>
                </div>
              </div>
            )}
          </div>
        </StepCard>

        {/* Progress indicator */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-neutral-800">
              {reviewedCount} of {totalCount} reviewed
            </span>
            {allReviewed && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                All reviewed
              </span>
            )}
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                allReviewed ? 'bg-emerald-500' : 'bg-sky-500'
              )}
              style={{ width: totalCount > 0 ? `${(reviewedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Step 2 — Experiment cards */}
        <StepCard num="02" title="Test Ideas">
          <div className="space-y-3">
            {experiments.map(exp => {
              const decision = decisions.get(exp.id)
              const isExpanded = expandedId === exp.id
              const isRejecting = rejectingId === exp.id
              const isProcessing = processingId === exp.id

              return (
                <div key={exp.id} className="rounded-xl border border-neutral-200 bg-white transition-colors">
                  {/* Card header — always visible */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(exp.id)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {decision === 'approved' && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        {decision === 'rejected' && <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <p className={cn(
                          'text-[13px] font-medium truncate',
                          decision === 'approved' && 'text-emerald-800',
                          decision === 'rejected' && 'text-red-800',
                          !decision && 'text-neutral-800',
                        )}>
                          {exp.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-0">
                        {exp.placement && (
                          <span className="text-[11px] text-neutral-400">{exp.placement}</span>
                        )}
                        {exp.goals.slice(0, 3).map(g => (
                          <span key={g} className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                            goalColors[g] ?? 'bg-neutral-50 text-neutral-500 border-neutral-200',
                          )}>
                            {g}
                          </span>
                        ))}
                        {getMergedNoteCount(exp.id, exp.noteIds) > 0 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setNotesModalExp({ id: exp.id, name: exp.name, noteIds: getMergedNoteIds(exp.id, exp.noteIds) }) }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); setNotesModalExp({ id: exp.id, name: exp.name, noteIds: getMergedNoteIds(exp.id, exp.noteIds) }) } }}
                            className="inline-flex items-center gap-1 text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors cursor-pointer">
                            <FileText className="h-3 w-3" />
                            {getMergedNoteCount(exp.id, exp.noteIds)} {getMergedNoteCount(exp.id, exp.noteIds) === 1 ? 'Note' : 'Notes'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {decision === 'approved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          Approved
                        </span>
                      )}
                      {decision === 'rejected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                          Rejected
                        </span>
                      )}
                      {!decision && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500">
                          Pending
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-neutral-400" />
                        : <ChevronDown className="h-4 w-4 text-neutral-400" />
                      }
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-neutral-100 pt-4">
                      {/* Detail fields */}
                      <div className="space-y-3">
                        <DetailField label="Hypothesis" value={exp.hypothesis} />
                        <DetailField label="Rationale" value={exp.rationale} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailField label="Placement URL" value={exp.placementUrl} isUrl />
                          <DetailField label="Devices" value={exp.devices} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailField label="Countries" value={exp.geos} />
                          <DetailField label="Weighting" value={exp.weighting} />
                        </div>

                        {exp.goals.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Primary Goals</p>
                            <div className="flex flex-wrap gap-1.5">
                              {exp.goals.map(g => (
                                <span key={g} className={cn(
                                  'inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold border',
                                  goalColors[g] ?? 'bg-neutral-50 text-neutral-500 border-neutral-200',
                                )}>
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <DetailField label="Design Brief" value={exp.designBrief} />
                        <DetailField label="Development Brief" value={exp.devBrief} />
                        <DetailField label="Media / Links" value={exp.mediaLinks} isUrl={!!exp.mediaLinks && exp.mediaLinks.startsWith('http')} />
                        <DetailField label="Walkthrough Video" value={exp.walkthroughUrl} isUrl />
                      </div>

                      {/* Existing notes — visibility filtered for clients */}
                      {(() => {
                        const allExpNotes = notesByExperiment.get(exp.id) ?? []
                        // Clients see: notes they created + notes with "All" visibility
                        const visibleExpNotes = user?.role === 'client'
                          ? allExpNotes.filter(n =>
                              (n.createdByClient && (n.createdByClient === user?.id || n.createdByClient === user?.clientId))
                              || n.visibility === 'All'
                            )
                          : allExpNotes
                        if (visibleExpNotes.length === 0) return null
                        return (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                              Notes
                            </p>
                            {visibleExpNotes.map((n, i) => (
                              <div key={i} className="text-[13px] text-neutral-700 whitespace-pre-wrap bg-white rounded-lg border border-amber-100 px-3 py-2">
                                {n.note}
                                <div className="flex items-center gap-2 mt-1">
                                  {n.createdByClient
                                    ? <span className="text-[10px] text-neutral-500">Client</span>
                                    : <span className="text-[10px] text-neutral-500">Strategy Team</span>
                                  }
                                  {n.createdTime && (
                                    <span className="text-[11px] text-neutral-400">
                                      {new Date(n.createdTime).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric',
                                        hour: 'numeric', minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Action buttons — locked once a decision exists */}
                      {!isRejecting && !decision && (
                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                          <button
                            type="button"
                            onClick={() => requestApproval(exp.id, exp.name)}
                            disabled={isProcessing}
                            className="h-9 px-4 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors disabled:opacity-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => startRejection(exp.id)}
                            disabled={isProcessing}
                            className="h-9 px-4 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Locked status — decision made */}
                      {!isRejecting && decision && (
                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                          <button
                            type="button"
                            disabled
                            className="h-9 px-4 rounded-lg bg-neutral-100 text-neutral-400 text-[13px] font-medium flex items-center gap-2 cursor-not-allowed"
                          >
                            {decision === 'approved' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                            {decision === 'approved' ? 'Approved' : 'Rejected'}
                          </button>
                          {decision === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => setNotesModalExp({ id: exp.id, name: exp.name, noteIds: getMergedNoteIds(exp.id, exp.noteIds) })}
                              className="h-9 px-4 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-2"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Add Note
                            </button>
                          )}
                        </div>
                      )}

                      {/* Rejection feedback form — only when no decision yet */}
                      {isRejecting && !decision && (
                        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            <p className="text-[13px] font-medium text-red-800">
                              Provide feedback for this idea
                            </p>
                          </div>
                          <FormField label="What would you like changed?" required>
                            <textarea
                              value={feedbackText}
                              onChange={e => setFeedbackText(e.target.value)}
                              placeholder="Explain what you'd like changed or why this idea doesn't fit…"
                              rows={4}
                              className={inputCls + ' resize-none'}
                            />
                          </FormField>
                          {error && (
                            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => requestRejection(exp.id, exp.name)}
                              disabled={!feedbackText.trim() || isProcessing}
                              className="h-9 px-4 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Submit Rejection
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectingId(null); setFeedbackText('') }}
                              className="h-9 px-4 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </StepCard>

        {/* Completion banner */}
        {allReviewed && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-emerald-800">Review Complete</p>
                <p className="text-[13px] text-emerald-600 mt-0.5">
                  You&apos;ve reviewed all {totalCount} {totalCount === 1 ? 'idea' : 'ideas'} in this batch.
                  Your strategist has been notified of your feedback.
                </p>
              </div>
            </div>
          </div>
        )}
      </FormBody>
    </>
  )

  const confirmModal = confirmAction && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4">
        {confirmAction.type === 'approve' ? (
          <>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ThumbsUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-neutral-800">Approve this idea?</h3>
                <p className="text-[13px] text-neutral-500 mt-0.5">This action is permanent.</p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3">
              <p className="text-[13px] font-medium text-neutral-800">{confirmAction.expName}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={confirmAndExecute} disabled={!!processingId}
                className="h-9 px-5 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {processingId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Yes, Approve
              </button>
              <button type="button" onClick={() => setConfirmAction(null)}
                className="h-9 px-4 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <ThumbsDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-neutral-800">Reject this idea?</h3>
                <p className="text-[13px] text-neutral-500 mt-0.5">This action is permanent. Please confirm your feedback is accurate.</p>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3">
              <p className="text-[13px] font-medium text-neutral-800">{confirmAction.expName}</p>
            </div>
            {confirmAction.feedbackNote && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 mb-1.5">Your Feedback</p>
                <p className="text-[13px] text-neutral-700 whitespace-pre-wrap">{confirmAction.feedbackNote}</p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={confirmAndExecute} disabled={!!processingId}
                className="h-9 px-5 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {processingId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Yes, Reject
              </button>
              <button type="button" onClick={() => setConfirmAction(null)}
                className="h-9 px-4 rounded-lg border border-neutral-200 text-[13px] font-medium text-neutral-500 hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
            experimentType="Client Idea Feedback"
            placeholder="Add a note about this experiment…"
            noteIds={notesModalExp.noteIds}
            mode="add-only"
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
      {confirmModal}
      {notesModal}
    </>
  )
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function ClientReviewIdeasPage() {
  return (
    <FormPage>
      <ClientReviewIdeasInner />
    </FormPage>
  )
}
