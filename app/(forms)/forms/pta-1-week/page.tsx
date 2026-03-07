'use client'

/**
 * PTA 1-Week Check-in — hosted form at /forms/pta-1-week?id=recBatchID
 *
 * Team member records a Loom walkthrough for the entire batch and sends a
 * Slack check-in message to the client's notification contacts. The form
 * pre-generates a default Slack message with @-mentions for all contacts
 * who have "Receive Notifications" enabled. The team member can edit the
 * message before submitting.
 *
 * On submit the Loom URL + message text are sent to an n8n webhook which
 * posts the Slack message to the client's channel.
 *
 * Supports ?id=preview for display-only mode with sample data.
 */

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2, Check, Video, Send, Users, ExternalLink, Pencil, Bell,
} from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { useUser } from '@/contexts/UserContext'
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
  experimentCount: number
  notificationTracking: string
}

interface NotificationContact {
  id: string
  firstName: string
  lastName: string
  slackMemberId: string
}

// ─── Preview mock data ──────────────────────────────────────────────────────

const PREVIEW_BATCH: BatchInfo = {
  name: 'Acme Corp | 2026 April 15',
  clientName: 'Acme Corp',
  clientId: 'prev_client',
  launchDate: '2026-04-15',
  experimentCount: 4,
  notificationTracking: '',
}

const PREVIEW_CONTACTS: NotificationContact[] = [
  { id: 'prev_c1', firstName: 'Sarah', lastName: 'Chen', slackMemberId: 'U07EXAMPLE1' },
  { id: 'prev_c2', firstName: 'Mike', lastName: 'Johnson', slackMemberId: 'U07EXAMPLE2' },
]

function buildDefaultMessage(contacts: NotificationContact[]): string {
  const mentions = contacts
    .filter(c => c.slackMemberId)
    .map(c => `<@${c.slackMemberId}>`)
    .join(' ')

  const greeting = mentions ? `Hey ${mentions},` : 'Hey,'
  return `${greeting} Just checking in. Your tests have been running for 1 week, and I've put together a short video going over the progress.`
}

// ─── Inner Form ─────────────────────────────────────────────────────────────

function PTA1WeekInner() {
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
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'Record ID (from Client)', 'Experiments Attached', 'Notification Tracking'],
    filterExtra: `RECORD_ID() = "${batchId}"`,
    maxRecords: 1,
    enabled: !!batchId && !preview,
  })

  const batch = useMemo<BatchInfo | null>(() => {
    if (preview) return PREVIEW_BATCH
    if (!rawBatch || rawBatch.length === 0) return null
    const f = rawBatch[0].fields as Record<string, unknown>
    const brandArr = f['Brand Name']
    const clientIdArr = f['Record ID (from Client)']
    const expsArr = f['Experiments Attached']
    return {
      name: String(f['Batch Key'] ?? ''),
      clientName: Array.isArray(brandArr) ? String(brandArr[0] ?? '') : String(brandArr ?? ''),
      clientId: Array.isArray(clientIdArr) ? String(clientIdArr[0] ?? '') : String(clientIdArr ?? ''),
      launchDate: f['Launch Date'] ? String(f['Launch Date']).split('T')[0] : '',
      experimentCount: Array.isArray(expsArr) ? expsArr.length : 0,
      notificationTracking: String(f['Notification Tracking'] ?? ''),
    }
  }, [rawBatch, preview])

  // Fetch contacts who receive notifications for this client
  const { data: rawContacts, isLoading: contactsLoading } = useAirtable<Record<string, unknown>>('contacts', {
    fields: ['First Name', 'Last Name', 'User Slack Member ID', 'Receive Notifications'],
    filterExtra: batch?.clientName
      ? `AND({Brand Name} = "${batch.clientName}", {Receive Notifications} = TRUE())`
      : undefined,
    enabled: !!batch?.clientName && !preview,
  })

  const contacts = useMemo<NotificationContact[]>(() => {
    if (preview) return PREVIEW_CONTACTS
    if (!rawContacts) return []
    return rawContacts.map(r => {
      const f = r.fields as Record<string, unknown>
      return {
        id: r.id,
        firstName: String(f['First Name'] ?? ''),
        lastName: String(f['Last Name'] ?? ''),
        slackMemberId: String(f['User Slack Member ID'] ?? ''),
      }
    })
  }, [rawContacts, preview])

  // ── Form state ────────────────────────────────────────────────────────────

  const [loomUrl, setLoomUrl] = useState('')
  const [messageText, setMessageText] = useState('')
  const [messageInitialized, setMessageInitialized] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize default message once contacts are loaded
  useEffect(() => {
    if (!messageInitialized && contacts.length > 0) {
      setMessageText(buildDefaultMessage(contacts))
      setMessageInitialized(true)
    }
  }, [contacts, messageInitialized])

  // For preview or when no contacts, set a default message
  useEffect(() => {
    if (!messageInitialized && batch && !contactsLoading && contacts.length === 0) {
      setMessageText(buildDefaultMessage([]))
      setMessageInitialized(true)
    }
  }, [batch, contactsLoading, contacts.length, messageInitialized])

  // ── Notification tracking ────────────────────────────────────────────────

  const NOTIFY_LEVELS: Record<string, number> = {
    '': 0,
    'Client Notified (Ideas)': 1,
    'Client Notified (PTA)': 2,
    'Client Notified (PTA2WK)': 3,
  }
  const alreadyNotified = (NOTIFY_LEVELS[batch?.notificationTracking ?? ''] ?? 0) >= 2

  // ── Submit handler ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!loomUrl.trim() || submitting || alreadyNotified) return
    setSubmitting(true)
    setError(null)

    try {
      // 1. PATCH batch to set Notification Tracking
      const patchRes = await fetch(`/api/airtable/batches/${batchId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Notification Tracking': 'Client Notified (PTA)' } }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to update tracking (${patchRes.status})`)
      }

      // 2. Fire webhook with all data
      const clientId = batch?.clientId ?? ''
      const slackIds = contacts
        .filter(c => c.slackMemberId)
        .map(c => c.slackMemberId)
        .join(',')

      const params = new URLSearchParams({
        batchID: batchId,
        clientID: clientId,
        action: 'pta_1_week_checkin',
        loomUrl: loomUrl.trim(),
        messageText: messageText.trim(),
        slackMemberIds: slackIds,
      })

      try {
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?${params.toString()}`,
          { method: 'GET' },
        )
      } catch { /* webhook fire-and-forget */ }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit check-in')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!batchId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        No batch ID provided. Use ?id=recXXX in the URL.
      </div>
    )
  }

  if (!preview && batchLoading) {
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

  if (submitted) {
    return (
      <FormSuccess
        title="Check-in Submitted"
        description={
          <>
            Your 1-week check-in for{' '}
            <span className="font-semibold text-neutral-700">{batch.clientName}</span>{' '}
            has been sent. The client will receive your Slack message with the walkthrough video.
          </>
        }
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const formContent = (
    <>
      <FormHeader
        title="1-Week Check-in"
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
                <span className="text-[12px] font-bold text-neutral-500">{batch.experimentCount}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Experiments</p>
                <p className="text-[13px] text-neutral-800">{batch.experimentCount} running</p>
              </div>
            </div>
            {batch.launchDate && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-neutral-500">📅</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Launched</p>
                  <p className="text-[13px] text-neutral-800">{batch.launchDate}</p>
                </div>
              </div>
            )}
          </div>
        </StepCard>

        {/* Step 2 — Loom URL */}
        <StepCard num="02" title="Walkthrough Video">
          <FormField
            label="Loom URL"
            description="Record a short Loom walkthrough covering the batch's progress after 1 week of testing."
            required
          >
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-neutral-400 shrink-0" />
              <input
                type="url"
                value={preview ? 'https://www.loom.com/share/example-1-week-checkin' : loomUrl}
                onChange={e => setLoomUrl(e.target.value)}
                placeholder="https://www.loom.com/share/..."
                className={inputCls}
              />
            </div>
          </FormField>

          {loomUrl.trim() && (
            <div className="mt-3">
              <a
                href={loomUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-[13px] text-sky-600 font-medium"
              >
                <Video className="h-3.5 w-3.5" />
                Preview link
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
        </StepCard>

        {/* Step 3 — Slack message */}
        <StepCard num="03" title="Client Message">
          {/* Notification contacts */}
          {contacts.length > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-neutral-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Notification Contacts
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {contacts.map(c => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-white border border-neutral-200 text-neutral-700"
                  >
                    {c.firstName} {c.lastName}
                    {c.slackMemberId && (
                      <span className="text-[10px] text-neutral-400 font-mono">{c.slackMemberId}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contactsLoading && !preview && (
            <div className="flex items-center gap-2 text-[13px] text-neutral-400 mb-4">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading contacts…
            </div>
          )}

          <FormField
            label="Slack Message"
            description="This message will be sent to the client via Slack. You can edit it before submitting."
          >
            <div className="relative">
              <textarea
                value={preview ? buildDefaultMessage(PREVIEW_CONTACTS) : messageText}
                onChange={e => { setMessageText(e.target.value); setIsEditing(true) }}
                rows={4}
                className={inputCls + ' resize-none pr-10'}
              />
              {!isEditing && messageText && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-md flex items-center justify-center hover:bg-neutral-100 transition-colors"
                  title="Edit message"
                >
                  <Pencil className="h-3.5 w-3.5 text-neutral-400" />
                </button>
              )}
            </div>
          </FormField>

          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setMessageText(buildDefaultMessage(contacts))
                setIsEditing(false)
              }}
              className="mt-2 text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors"
            >
              Reset to default message
            </button>
          )}
        </StepCard>

        {/* Submit */}
        {alreadyNotified ? (
          <button
            type="button"
            disabled
            className="w-full h-10 rounded-xl bg-neutral-100 text-neutral-400 text-[13px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Bell className="h-4 w-4" />
            Check-in Already Sent
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!loomUrl.trim() || !messageText.trim() || submitting || preview}
            className="w-full h-10 rounded-xl bg-sky-500 text-white text-[13px] font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-sky-500/20"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Sending…' : 'Submit Check-in'}
          </button>
        )}
      </FormBody>
    </>
  )

  if (preview) {
    return (
      <PreviewShell>
        {formContent}
      </PreviewShell>
    )
  }

  return formContent
}

// ─── Page Export ─────────────────────────────────────────────────────────────

export default function PTA1WeekPage() {
  return (
    <FormPage>
      <PTA1WeekInner />
    </FormPage>
  )
}
