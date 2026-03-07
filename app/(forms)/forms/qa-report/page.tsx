'use client'

/**
 * QA Report — hosted form at /forms/qa-report?id=recBatchID
 *
 * QA team member reviews each experiment in a batch, submits optional
 * walkthrough video URLs, and approves (Pass) or rejects (Fail) each one.
 *
 * Failures create a Note (Experiment Type: "QA Feedback") linked to the
 * experiment and set Feedback Status to "QA Rejected".
 * Passes set Feedback Status to "QA Approved".
 *
 * Supports ?id=preview for display-only mode with sample data.
 */

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2, ChevronDown, ChevronUp, Check, X, ThumbsUp, ThumbsDown,
  ExternalLink, AlertTriangle, FileText, Figma, Video,
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

interface QAExperiment {
  id: string
  name: string
  placement: string
  placementUrl: string
  figmaUrl: string
  convertId: string
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

// ─── Feedback badge config ──────────────────────────────────────────────────

const FEEDBACK_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  'Awaiting QA Review': { label: 'Awaiting QA',    bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  'QA Approved':        { label: 'QA Approved',     bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'QA Rejected':        { label: 'Revision Needed', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
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

// ─── Preview mock data ──────────────────────────────────────────────────────

const PREVIEW_BATCH: BatchInfo = {
  name: 'Acme Corp | 2026 April 15',
  clientName: 'Acme Corp',
  clientId: 'prev_client',
  launchDate: '2026-04-15',
}

const PREVIEW_EXPERIMENTS: QAExperiment[] = [
  {
    id: 'prev_e1',
    name: 'Sticky Add to Cart on Mobile PDP',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    figmaUrl: 'https://www.figma.com/design/abc123/example',
    convertId: '100456789',
    walkthroughUrl: '',
    feedbackStatus: 'Awaiting QA Review',
    noteIds: [],
    noteCount: 0,
  },
  {
    id: 'prev_e2',
    name: 'Trust Badges Below Price',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    figmaUrl: 'https://www.figma.com/design/def456/example',
    convertId: '100456790',
    walkthroughUrl: 'https://www.loom.com/share/example-walkthrough',
    feedbackStatus: 'QA Approved',
    noteIds: ['prev_n1'],
    noteCount: 1,
  },
  {
    id: 'prev_e3',
    name: 'Recently Viewed Products Carousel',
    placement: 'Product Page — Below Reviews',
    placementUrl: 'https://store.acmecorp.com/products/example',
    figmaUrl: '',
    convertId: '100456791',
    walkthroughUrl: '',
    feedbackStatus: null,
    noteIds: [],
    noteCount: 0,
  },
]

// ─── Detail Field Component ─────────────────────────────────────────────────

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

// ─── Inner Form ─────────────────────────────────────────────────────────────

function QAReportInner() {
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

  // ── Data fetches ──────────────────────────────────────────────────────────

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
      'FIGMA Url', 'Convert Experiment ID', 'Walkthrough Video URL',
      'Feedback Status', 'Notes',
    ],
    filterExtra: expFilter,
    enabled: experimentIds.length > 0 && !preview,
  })

  // ── Derived data ──────────────────────────────────────────────────────────

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

  const experiments = useMemo<QAExperiment[]>(() => {
    if (preview) return PREVIEW_EXPERIMENTS
    if (!rawExperiments) return []
    return rawExperiments.map(rec => {
      const f = rec.fields as Record<string, unknown>
      const status = f['Feedback Status']
      const notesRaw = f['Notes']
      return {
        id: rec.id,
        name: String(f['Test Description'] ?? ''),
        placement: String(f['Placement'] ?? ''),
        placementUrl: String(f['Placement URL'] ?? ''),
        figmaUrl: String(f['FIGMA Url'] ?? ''),
        convertId: String(f['Convert Experiment ID'] ?? ''),
        walkthroughUrl: String(f['Walkthrough Video URL'] ?? ''),
        feedbackStatus: typeof status === 'string' ? status : null,
        noteIds: Array.isArray(notesRaw) ? (notesRaw as string[]) : [],
        noteCount: Array.isArray(notesRaw) ? (notesRaw as string[]).length : 0,
      }
    })
  }, [rawExperiments, preview])

  // ── Fetch QA feedback notes ───────────────────────────────────────────────

  const allNoteIds = useMemo(() => {
    const ids: string[] = []
    for (const exp of experiments) {
      if (exp.noteIds.length > 0) ids.push(...exp.noteIds)
    }
    return ids
  }, [experiments])

  const noteFilter = useMemo(() => {
    if (allNoteIds.length === 0) return undefined
    const idFilter = allNoteIds.length === 1
      ? `RECORD_ID() = "${allNoteIds[0]}"`
      : `OR(${allNoteIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`
    return `AND(${idFilter}, {Experiment Type} = "QA Feedback")`
  }, [allNoteIds])

  const { data: rawNotes, mutate: mutateNotes } = useAirtable<Record<string, unknown>>('notes', {
    fields: ['Note', 'Experiments', 'Created Time', 'Experiment Type', 'Created By (Team)'],
    filterExtra: noteFilter,
    sort: [{ field: 'Created Time', direction: 'desc' }],
    enabled: allNoteIds.length > 0 && !preview,
  })

  const notesByExperiment = useMemo<Map<string, { note: string; createdTime: string; author: string }[]>>(() => {
    const map = new Map<string, { note: string; createdTime: string; author: string }[]>()
    if (!rawNotes) return map
    for (const rec of rawNotes) {
      const f = rec.fields as Record<string, unknown>
      const note = String(f['Note'] ?? '')
      const time = String(f['Created Time'] ?? '')
      const teamArr = f['Created By (Team)']
      const author = Array.isArray(teamArr) ? String(teamArr[0] ?? '') : ''
      const expIds = (f['Experiments'] as string[]) ?? []
      for (const eid of expIds) {
        if (!map.has(eid)) map.set(eid, [])
        map.get(eid)!.push({ note, createdTime: time, author })
      }
    }
    return map
  }, [rawNotes])

  // ── State ─────────────────────────────────────────────────────────────────

  const [sessionDecisions, setSessionDecisions] = useState<Map<string, 'approved' | 'rejected'>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Per-experiment walkthrough URL inputs
  const [walkthroughInputs, setWalkthroughInputs] = useState<Map<string, string>>(new Map())

  // Notes modal
  const [notesModalExp, setNotesModalExp] = useState<{ id: string; name: string; noteIds: string[] } | null>(null)
  const [sessionNotesByExp, setSessionNotesByExp] = useState<Map<string, string[]>>(new Map())

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject'
    expId: string
    expName: string
    feedbackNote?: string
  } | null>(null)

  // ── Note helpers ──────────────────────────────────────────────────────────

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
    mutateExperiments()
  }

  // ── Walkthrough URL helper ────────────────────────────────────────────────

  const getWalkthroughUrl = (exp: QAExperiment): string => {
    return walkthroughInputs.get(exp.id) ?? exp.walkthroughUrl
  }

  const setWalkthroughUrl = (expId: string, value: string) => {
    setWalkthroughInputs(prev => {
      const next = new Map(prev)
      next.set(expId, value)
      return next
    })
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const decisions = useMemo(() => {
    const merged = new Map<string, 'approved' | 'rejected'>()
    for (const exp of experiments) {
      if (exp.feedbackStatus === 'QA Approved') {
        merged.set(exp.id, 'approved')
      } else if (exp.feedbackStatus === 'QA Rejected') {
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
  const allApproved = allReviewed && [...decisions.values()].every(d => d === 'approved')
  const approvedCount = [...decisions.values()].filter(d => d === 'approved').length
  const rejectedCount = [...decisions.values()].filter(d => d === 'rejected').length

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApprove = async (experimentId: string) => {
    if (processingId) return
    setProcessingId(experimentId)
    setError(null)

    try {
      const exp = experiments.find(e => e.id === experimentId)
      const url = getWalkthroughUrl(exp!)

      const fields: Record<string, unknown> = { 'Feedback Status': 'QA Approved' }
      if (url.trim()) fields['Walkthrough Video URL'] = url.trim()

      const res = await fetch(`/api/airtable/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to approve (${res.status})`)
      }

      // Fire webhook (fire-and-forget)
      try {
        const clientId = batch?.clientId ?? ''
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?experimentID=${experimentId}&batchID=${batchId}&clientID=${clientId}&action=qa_approved`,
          { method: 'GET' },
        )
      } catch { /* webhook fire-and-forget */ }

      setSessionDecisions(prev => new Map(prev).set(experimentId, 'approved'))
      setRejectingId(null)
      setFeedbackText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve experiment')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (experimentId: string) => {
    if (processingId || !feedbackText.trim()) return
    setProcessingId(experimentId)
    setError(null)

    try {
      // 1. Create rejection Note with "QA Feedback" type
      const noteFields: Record<string, unknown> = {
        Note: feedbackText.trim(),
        Experiments: [experimentId],
        'Experiment Type': 'QA Feedback',
      }
      if (user) {
        noteFields['Created By (Team)'] = [user.id]
      }

      const noteRes = await fetch('/api/airtable/notes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ fields: noteFields }),
      })
      if (!noteRes.ok) {
        const err = await noteRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create feedback note')
      }

      // Track the newly created note
      const noteData = await noteRes.json().catch(() => null)
      if (noteData?.id) {
        setSessionNotesByExp(prev => {
          const next = new Map(prev)
          const existing = next.get(experimentId) ?? []
          if (!existing.includes(noteData.id)) {
            next.set(experimentId, [...existing, noteData.id])
          }
          return next
        })
      }

      // 2. PATCH experiment — mark as rejected + save walkthrough URL if provided
      const exp = experiments.find(e => e.id === experimentId)
      const url = getWalkthroughUrl(exp!)

      const patchFields: Record<string, unknown> = {
        'Feedback Status': 'QA Rejected',
        'Rejected At': new Date().toISOString(),
      }
      if (url.trim()) patchFields['Walkthrough Video URL'] = url.trim()

      const patchRes = await fetch(`/api/airtable/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: patchFields }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to update experiment (${patchRes.status})`)
      }

      // 3. Fire webhook (fire-and-forget)
      try {
        const clientId = batch?.clientId ?? ''
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?experimentID=${experimentId}&batchID=${batchId}&clientID=${clientId}&action=qa_rejected`,
          { method: 'GET' },
        )
      } catch { /* webhook fire-and-forget */ }

      setSessionDecisions(prev => new Map(prev).set(experimentId, 'rejected'))
      setRejectingId(null)
      setFeedbackText('')
      mutateNotes()
      mutateExperiments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rejection')
    } finally {
      setProcessingId(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
    if (expandedId === id) {
      setRejectingId(null)
      setFeedbackText('')
    }
  }

  const startRejection = (id: string) => {
    setRejectingId(id)
    setFeedbackText('')
    if (expandedId !== id) setExpandedId(id)
  }

  // Confirmation flow
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

  // ── Guards ────────────────────────────────────────────────────────────────

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

  // ── Success — all approved ────────────────────────────────────────────────

  if (allApproved && !preview) {
    return (
      <FormSuccess
        title="QA Review Complete"
        description={
          <>
            All {totalCount} {totalCount === 1 ? 'experiment' : 'experiments'} for{' '}
            <span className="font-semibold text-neutral-700">{batch.clientName}</span>{' '}
            passed QA. The development team will be notified.
          </>
        }
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const formContent = (
    <>
      <FormHeader
        title="QA Report"
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
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Experiments</p>
                <p className="text-[13px] text-neutral-800">{totalCount} to review</p>
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
            <div className="flex items-center gap-3">
              {approvedCount > 0 && (
                <span className="text-[12px] font-medium text-emerald-600">
                  {approvedCount} passed
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="text-[12px] font-medium text-red-600">
                  {rejectedCount} failed
                </span>
              )}
              {allReviewed && (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  All reviewed
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                allApproved ? 'bg-emerald-500' : 'bg-sky-500'
              )}
              style={{ width: totalCount > 0 ? `${(reviewedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Step 2 — Experiment cards */}
        <StepCard num="02" title="Experiments">
          <div className="space-y-3">
            {experiments.map(exp => {
              const decision = decisions.get(exp.id)
              const isExpanded = expandedId === exp.id
              const isRejecting = rejectingId === exp.id
              const isProcessing = processingId === exp.id
              const notes = notesByExperiment.get(exp.id) ?? []
              const fb = exp.feedbackStatus ? FEEDBACK_CONFIG[exp.feedbackStatus] : null

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
                        <p className="text-[13px] font-medium text-neutral-800 truncate">
                          {exp.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-0">
                        {exp.placement && (
                          <span className="text-[11px] text-neutral-400">{exp.placement}</span>
                        )}
                        {exp.convertId && (
                          <span className="text-[11px] text-neutral-400">· ID: {exp.convertId}</span>
                        )}
                        {exp.figmaUrl && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 font-medium">
                            <Figma className="h-2.5 w-2.5" />
                            Figma
                          </span>
                        )}
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
                      {/* Feedback status badge */}
                      {fb ? (
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold', fb.bg, fb.text, fb.border, 'border')}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', fb.dot)} />
                          {fb.label}
                        </span>
                      ) : decision === 'approved' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          Passed
                        </span>
                      ) : decision === 'rejected' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                          Failed
                        </span>
                      ) : (
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
                      {/* Convert Experiment ID — prominent */}
                      {exp.convertId ? (
                        <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 mb-1">Convert.com Experiment ID</p>
                          <p className="text-[15px] font-mono font-semibold text-sky-800">{exp.convertId}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="text-[13px] text-amber-700 font-medium">
                              No Convert Experiment ID has been submitted yet.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Detail fields */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailField label="Placement" value={exp.placement} />
                          <DetailField label="Placement URL" value={exp.placementUrl} isUrl />
                        </div>
                        {exp.figmaUrl && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Design Mockup</p>
                            <a
                              href={exp.figmaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-200 bg-white hover:bg-violet-50 transition-colors text-[13px] text-violet-700 font-medium group"
                            >
                              <Figma className="h-3.5 w-3.5 text-violet-500 group-hover:text-violet-600" />
                              Open in Figma
                              <ExternalLink className="h-3 w-3 text-violet-400 shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Walkthrough Video URL input */}
                      {!decision && (
                        <FormField
                          label="Walkthrough Video URL"
                          description="Optional — link to a Loom, screen recording, or walkthrough documenting your QA review."
                        >
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-neutral-400 shrink-0" />
                            <input
                              type="url"
                              value={preview ? 'https://www.loom.com/share/example' : getWalkthroughUrl(exp)}
                              onChange={e => setWalkthroughUrl(exp.id, e.target.value)}
                              placeholder="https://www.loom.com/share/..."
                              className={inputCls}
                            />
                          </div>
                        </FormField>
                      )}

                      {/* Existing walkthrough URL — read-only when decided */}
                      {decision && getWalkthroughUrl(exp) && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Walkthrough Video</p>
                          <a
                            href={getWalkthroughUrl(exp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-[13px] text-sky-600 font-medium"
                          >
                            <Video className="h-3.5 w-3.5" />
                            View Walkthrough
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {/* Existing QA feedback notes */}
                      {notes.length > 0 && (
                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                            Previous QA Feedback
                          </p>
                          {notes.map((n, i) => (
                            <div key={i} className="text-[13px] text-neutral-700 whitespace-pre-wrap bg-white rounded-lg border border-neutral-100 px-3 py-2">
                              {n.note}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-600">
                                  QA Feedback
                                </span>
                                {n.author && <span className="text-[10px] text-neutral-400">{n.author}</span>}
                                {n.createdTime && (
                                  <span className="text-[11px] text-neutral-400">{timeAgo(n.createdTime)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons — only when no decision */}
                      {!isRejecting && !decision && (
                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                          <button
                            type="button"
                            onClick={() => requestApproval(exp.id, exp.name)}
                            disabled={isProcessing}
                            className="h-9 px-4 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors disabled:opacity-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Pass QA
                          </button>

                          <button
                            type="button"
                            onClick={() => startRejection(exp.id)}
                            disabled={isProcessing}
                            className="h-9 px-4 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Fail QA
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
                            {decision === 'approved' ? 'Passed' : 'Failed'}
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

                      {/* Rejection feedback form */}
                      {isRejecting && !decision && (
                        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            <p className="text-[13px] font-medium text-red-800">
                              What issues were found during QA?
                            </p>
                          </div>
                          <FormField label="QA feedback" required>
                            <textarea
                              value={feedbackText}
                              onChange={e => setFeedbackText(e.target.value)}
                              placeholder="Describe what failed or needs to be fixed…"
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
                              Fail QA
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

        {/* Completion banner — all reviewed but some failed */}
        {allReviewed && !allApproved && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-amber-800">QA Review Complete — Issues Found</p>
                <p className="text-[13px] text-amber-600 mt-0.5">
                  {approvedCount} {approvedCount === 1 ? 'experiment' : 'experiments'} passed, {rejectedCount} failed QA.
                  The developer will be notified to fix the issues.
                </p>
              </div>
            </div>
          </div>
        )}
      </FormBody>
    </>
  )

  // ── Confirmation modal ────────────────────────────────────────────────────

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
                <h3 className="text-[15px] font-semibold text-neutral-800">Pass this experiment?</h3>
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
                Yes, Pass QA
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
                <h3 className="text-[15px] font-semibold text-neutral-800">Fail this experiment?</h3>
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
                Yes, Fail QA
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

  // ── Notes modal ───────────────────────────────────────────────────────────

  const notesModal = notesModalExp && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => setNotesModalExp(null)}>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-neutral-800">QA Notes</h3>
            <p className="text-[13px] text-neutral-500 mt-0.5 truncate">{notesModalExp.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotesModalExp(null)}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4 text-neutral-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <NotesPanel
            linkedField="Experiments"
            linkedRecordId={notesModalExp.id}
            authHeaders={authHeaders}
            experimentType="QA Feedback"
            filterByType="QA Feedback"
            noteIds={notesModalExp.noteIds}
            placeholder="Add QA feedback note…"
            mode="full"
            showVisibilityToggle
            onNoteCreated={(noteId) => handleNoteCreated(notesModalExp.id, noteId)}
          />
        </div>
      </div>
    </div>
  )

  if (preview) {
    return (
      <PreviewShell>
        {formContent}
        {confirmModal}
        {notesModal}
      </PreviewShell>
    )
  }

  return (
    <>
      {formContent}
      {confirmModal}
      {notesModal}
    </>
  )
}

// ─── Page Export ─────────────────────────────────────────────────────────────

export default function QAReportPage() {
  return (
    <FormPage>
      <QAReportInner />
    </FormPage>
  )
}
