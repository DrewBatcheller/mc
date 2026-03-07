'use client'

/**
 * Submit Convert.com Project ID — hosted form at /forms/submit-project-id?id=recXXX
 *
 * Developer submits the Convert.com Project ID (required) and optional Account ID
 * for a client during onboarding.
 * Uses ?id= search param with a Client record ID.
 * Supports ?id=preview for display-only mode with sample data.
 */

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Globe, User } from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { useUser } from '@/contexts/UserContext'
import {
  FormPage, FormHeader, FormBody, FormFooter, FormError,
  StepCard, FormField, inputCls,
  FormSuccess,
  isPreviewMode, PreviewBanner, PreviewShell,
} from '@/components/forms'

// ─── Preview mock data ────────────────────────────────────────────────────────

const PREVIEW_CLIENT = {
  name: 'Acme Corp',
  website: 'acmecorp.com',
  developer: 'John Developer',
  projectId: '100123456',
  accountId: '10099999',
}

// ─── Inner Form ───────────────────────────────────────────────────────────────

function SubmitProjectIdInner() {
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

  // ── Fetch client record (skip in preview) ──────────────────────────────────
  const { data: rawClient, isLoading } = useAirtable<Record<string, unknown>>('clients', {
    fields: ['Brand Name', 'Website', 'Full Name (from Developer)', 'Convert Project ID', 'Convert Account ID'],
    filterExtra: `RECORD_ID() = "${clientId}"`,
    maxRecords: 1,
    enabled: !!clientId && !preview,
  })

  const client = useMemo(() => {
    if (preview) return PREVIEW_CLIENT
    if (!rawClient || rawClient.length === 0) return null
    const f = rawClient[0].fields as Record<string, unknown>

    const devArr = f['Full Name (from Developer)']
    const developer = Array.isArray(devArr) ? String(devArr[0] ?? '') : String(devArr ?? '')

    return {
      name: String(f['Brand Name'] ?? ''),
      website: String(f['Website'] ?? ''),
      developer,
      projectId: String(f['Convert Project ID'] ?? ''),
      accountId: String(f['Convert Account ID'] ?? ''),
    }
  }, [rawClient, preview])

  // ── State ──────────────────────────────────────────────────────────────────
  const [projectId, setProjectId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [hasUniqueAccount, setHasUniqueAccount] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Pre-populate fields once client data loads (or in preview mode)
  useEffect(() => {
    if (client && !initialized) {
      setProjectId(client.projectId)
      setAccountId(client.accountId)
      if (client.accountId) setHasUniqueAccount(true)
      setInitialized(true)
    }
  }, [client, initialized])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const trimmedProject = projectId.trim()
    const trimmedAccount = accountId.trim()

    if (!trimmedProject) {
      setError('Convert.com Project ID is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/airtable/clients/${clientId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          fields: {
            'Convert Project ID': trimmedProject,
            'Convert Account ID': hasUniqueAccount && trimmedAccount ? trimmedAccount : '',
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to update (${res.status})`)
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        No client ID provided. Use ?id=recXXX in the URL.
      </div>
    )
  }

  if (!preview && isLoading) {
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

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <FormSuccess
        title="Project ID Submitted"
        description={
          <>
            Convert.com Project ID has been saved for{' '}
            <span className="font-semibold text-neutral-700">{client.name}</span>.
          </>
        }
      />
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const hasExisting = !!(client.projectId || client.accountId)

  const formContent = (
    <>
      <FormHeader
        title="Submit Convert.com Project ID"
        entityName={client.name}
        badge={hasExisting ? 'Updating' : 'New'}
        badgeColor={hasExisting ? 'amber' : 'sky'}
      />

      {preview && <PreviewBanner />}

      <FormBody>
        <FormError message={error} />

        {/* Step 1 — Client Info (read-only) */}
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
            {client.developer && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-neutral-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Developer</p>
                  <p className="text-[13px] text-neutral-800 truncate">{client.developer}</p>
                </div>
              </div>
            )}
          </div>
        </StepCard>

        {/* Step 2 — Convert.com Project ID (required) */}
        <StepCard num="02" title="Convert.com Project ID">
          <FormField
            label="Project ID"
            required
            description="The numeric Project ID from your Convert.com account. Found in Project Settings."
          >
            <input
              type="text"
              value={preview ? PREVIEW_CLIENT.projectId : projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="e.g. 100123456"
              className={inputCls}
            />
          </FormField>
        </StepCard>

        {/* Step 3 — Convert.com Account ID (conditional) */}
        <StepCard num="03" title="Convert.com Account ID">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-neutral-700">Does the client have a unique Convert.com Account ID?</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Only needed when the client has their own Convert.com account.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!preview) {
                    setHasUniqueAccount(prev => !prev)
                    if (hasUniqueAccount) setAccountId('')
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:ring-offset-2 ${
                  hasUniqueAccount ? 'bg-sky-500' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    hasUniqueAccount ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {hasUniqueAccount && (
              <FormField
                label="Account ID"
                description="The Account ID from Convert.com, found in Account Settings."
              >
                <input
                  type="text"
                  value={preview ? PREVIEW_CLIENT.accountId : accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="e.g. 10099999"
                  className={inputCls}
                />
              </FormField>
            )}
          </div>
        </StepCard>
      </FormBody>

      <FormFooter
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={hasExisting ? 'Update Project ID' : 'Submit Project ID'}
        submittingLabel="Saving..."
        disabled={!projectId.trim()}
        summary={hasExisting ? 'Updating existing Convert.com IDs' : undefined}
      />
    </>
  )

  if (preview) {
    return <PreviewShell>{formContent}</PreviewShell>
  }

  return formContent
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function SubmitProjectIdPage() {
  return (
    <FormPage>
      <SubmitProjectIdInner />
    </FormPage>
  )
}
