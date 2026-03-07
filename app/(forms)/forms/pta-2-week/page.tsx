'use client'

/**
 * PTA 2-Week Analysis — hosted form at /forms/pta-2-week?id=recBatchID
 *
 * Strategist completes post-test analysis for every experiment in a batch.
 * For each experiment the form shows:
 *   1. Convert.com experiment link (Experiment Preview URL)
 *   2. Variant comparison cards with performance metrics
 *   3. "Sync to Form" to prefill the PTA form from the winning variant
 *   4. Full PTA form (reused PTAFormContent component) for manual edits
 *
 * Each experiment saves independently via PATCH.
 * Supports ?id=preview for display-only mode with sample data.
 */

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Loader2, ChevronDown, ChevronUp, Check, ExternalLink,
  FlaskConical, Eye, Bell, Send,
} from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { useUser } from '@/contexts/UserContext'
import { PTAFormContent } from '@/components/team/specialized-task-modals'
import type { PTAExp, PTAFormState } from '@/components/team/specialized-task-modals'
import { cn } from '@/lib/utils'
import {
  FormPage, FormHeader, FormBody, FormError,
  StepCard,
  isPreviewMode, PreviewBanner, PreviewShell,
} from '@/components/forms'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BatchInfo {
  name: string
  clientName: string
  clientId: string
  launchDate: string
  notificationTracking: string
}

interface VariantDetail {
  id: string
  variantName: string
  variantId: string
  status: string
  previewUrl: string
  trafficPct: number
  visitors: number
  conversions: number
  revenue: number
  revenueImpPct: number
  crPct: number
  crImpPct: number
  crImpConfidence: number
  rpv: number
  rpvImpPct: number
  rpvImpConfidence: number
  aov: number
}

/** Experiment row extended with experiment preview URL */
interface PTAExpRow extends PTAExp {
  experimentPreviewUrl: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAttachmentUrl(field: unknown): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field) && field.length > 0) {
    const first = field[0] as Record<string, unknown>
    return (first.url as string) ?? ''
  }
  return ''
}

function initForm(exp: PTAExp): PTAFormState {
  return {
    imageType: exp.imageType,
    controlImageUrl: exp.controlImageUrl,
    variantImageUrl: exp.variantImageUrl,
    ptaResultImageUrl: exp.ptaResultImageUrl,
    figmaUrl: exp.figmaUrl,
    resultsVideoUrl: exp.ptaLoomUrl,
    goalMetric1: exp.goalMetric1,
    metric1Increase: exp.metric1Increase != null ? String(exp.metric1Increase) : '',
    goalMetric2: exp.goalMetric2,
    metric2Increase: exp.metric2Increase != null ? String(exp.metric2Increase) : '',
    revenueAdded: exp.revenueAdded != null ? String(exp.revenueAdded) : '',
    confidenceLevel: exp.confidenceLevel != null ? String(exp.confidenceLevel) : '',
    finalStatus: exp.testStatus,
    segmentDeploy: exp.segmentDeploy,
    description: exp.description,
    nextSteps: exp.nextSteps,
    deployed: exp.deployed,
    saving: false,
    saved: false,
  }
}

function fmt(n: number, decimals = 1): string {
  if (n === 0) return '0'
  return n % 1 === 0 ? String(n) : n.toFixed(decimals)
}

function fmtCurrency(n: number): string {
  if (n === 0) return '$0'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}

// ─── Preview mock data ──────────────────────────────────────────────────────

const PREVIEW_BATCH: BatchInfo = {
  name: 'Acme Corp | 2026 April 15',
  clientName: 'Acme Corp',
  clientId: 'prev_client',
  launchDate: '2026-04-15',
  notificationTracking: '',
}

const PREVIEW_EXPERIMENTS: PTAExpRow[] = [
  {
    id: 'prev_e1',
    testDescription: 'Sticky Add to Cart on Mobile PDP',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    convertId: '100456789',
    figmaUrl: 'https://figma.com/file/example',
    experimentPreviewUrl: 'https://store.acmecorp.com?convert_action=convert_vpreview&convert_e=100456789',
    imageType: '',
    controlImageUrl: '',
    variantImageUrl: '',
    ptaResultImageUrl: '',
    ptaLoomUrl: '',
    goalMetric1: '',
    metric1Increase: null,
    goalMetric2: '',
    metric2Increase: null,
    revenueAdded: null,
    confidenceLevel: null,
    testStatus: '',
    segmentDeploy: [],
    description: '',
    nextSteps: '',
    deployed: false,
  },
  {
    id: 'prev_e2',
    testDescription: 'Trust Badges Below Price',
    placement: 'Product Page',
    placementUrl: 'https://store.acmecorp.com/products/example',
    convertId: '100456790',
    figmaUrl: 'https://figma.com/file/example2',
    experimentPreviewUrl: '',
    imageType: 'Desktop',
    controlImageUrl: '',
    variantImageUrl: '',
    ptaResultImageUrl: '',
    ptaLoomUrl: '',
    goalMetric1: 'CVR',
    metric1Increase: 12.5,
    goalMetric2: 'RPV',
    metric2Increase: 8.3,
    revenueAdded: 4500,
    confidenceLevel: 97,
    testStatus: 'Successful',
    segmentDeploy: ['All Users'],
    description: 'The variant with trust badges significantly outperformed the control.',
    nextSteps: 'Deploy winning variant to 100% of traffic.',
    deployed: false,
  },
]

const PREVIEW_VARIANTS: Map<string, VariantDetail[]> = new Map([
  ['prev_e1', [
    {
      id: 'prev_v1', variantName: 'Control', variantId: '10001', status: 'Completed',
      previewUrl: 'https://store.acmecorp.com?variant=control', trafficPct: 50,
      visitors: 14523, conversions: 580, revenue: 28900, revenueImpPct: 0,
      crPct: 3.99, crImpPct: 0, crImpConfidence: 0, rpv: 1.99, rpvImpPct: 0, rpvImpConfidence: 0, aov: 49.83,
    },
    {
      id: 'prev_v2', variantName: 'Sticky ATC Bar', variantId: '10002', status: 'Completed',
      previewUrl: 'https://store.acmecorp.com?variant=sticky', trafficPct: 50,
      visitors: 14687, conversions: 720, revenue: 35640, revenueImpPct: 23.3,
      crPct: 4.90, crImpPct: 22.8, crImpConfidence: 98.2, rpv: 2.43, rpvImpPct: 22.1, rpvImpConfidence: 97.5, aov: 49.50,
    },
  ]],
  ['prev_e2', [
    {
      id: 'prev_v3', variantName: 'Control', variantId: '10003', status: 'Completed',
      previewUrl: '', trafficPct: 50,
      visitors: 8320, conversions: 332, revenue: 16600, revenueImpPct: 0,
      crPct: 3.99, crImpPct: 0, crImpConfidence: 0, rpv: 2.00, rpvImpPct: 0, rpvImpConfidence: 0, aov: 50.00,
    },
    {
      id: 'prev_v4', variantName: 'Trust Badges V1', variantId: '10004', status: 'Completed',
      previewUrl: '', trafficPct: 50,
      visitors: 8450, conversions: 379, revenue: 18950, revenueImpPct: 14.2,
      crPct: 4.49, crImpPct: 12.5, crImpConfidence: 97, rpv: 2.24, rpvImpPct: 12.0, rpvImpConfidence: 95, aov: 50.00,
    },
  ]],
])

// ─── Variant Card Component ─────────────────────────────────────────────────

function MetricRow({ label, value, colored }: { label: string; value: string; colored?: 'positive' | 'negative' | 'neutral' | false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={cn(
        'font-medium',
        colored === 'positive' ? 'text-emerald-600 font-semibold' :
        colored === 'negative' ? 'text-red-600 font-semibold' :
        'text-neutral-800',
      )}>
        {value}
      </span>
    </div>
  )
}

function liftColor(pct: number): 'positive' | 'negative' | 'neutral' {
  if (pct > 0) return 'positive'
  if (pct < 0) return 'negative'
  return 'neutral'
}

function VariantCard({
  variant,
  isSelected,
  onSelect,
  preview,
}: {
  variant: VariantDetail
  isSelected: boolean
  onSelect: () => void
  preview: boolean
}) {
  return (
    <button
      type="button"
      onClick={preview ? undefined : onSelect}
      className={cn(
        'rounded-xl border bg-white p-4 min-w-[200px] max-w-[280px] shrink-0 flex flex-col text-left transition-all',
        isSelected
          ? 'border-emerald-300 ring-2 ring-emerald-200 shadow-sm'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[13px] font-semibold text-neutral-800 truncate">{variant.variantName}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {isSelected && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              <Check className="h-2.5 w-2.5" />
              Synced
            </span>
          )}
          {variant.status && !isSelected && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
              {variant.status}
            </span>
          )}
        </div>
      </div>

      {/* Key comparison metrics — always visible */}
      <div className="space-y-1.5 text-[12px]">
        <MetricRow label="Traffic" value={`${fmt(variant.trafficPct, 0)}%`} />
        <MetricRow label="CR" value={`${fmt(variant.crPct)}%`} />
        <MetricRow label="CR Lift" value={`${variant.crImpPct > 0 ? '+' : ''}${fmt(variant.crImpPct)}%`} colored={liftColor(variant.crImpPct)} />
        <MetricRow label="RPV" value={`$${fmt(variant.rpv, 2)}`} />
        <MetricRow label="RPV Lift" value={`${variant.rpvImpPct > 0 ? '+' : ''}${fmt(variant.rpvImpPct)}%`} colored={liftColor(variant.rpvImpPct)} />
        <MetricRow label="Confidence" value={`${fmt(variant.crImpConfidence)}%`} />
      </div>

      {/* Expanded details — only when selected */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1.5 text-[12px]">
          <MetricRow label="Visitors" value={fmtInt(variant.visitors)} />
          <MetricRow label="Conversions" value={fmtInt(variant.conversions)} />
          <MetricRow label="Revenue" value={fmtCurrency(variant.revenue)} />
          <MetricRow label="Rev Lift" value={`${variant.revenueImpPct > 0 ? '+' : ''}${fmt(variant.revenueImpPct)}%`} colored={liftColor(variant.revenueImpPct)} />
          <MetricRow label="RPV Conf" value={`${fmt(variant.rpvImpConfidence)}%`} />
          <MetricRow label="AOV" value={`$${fmt(variant.aov, 2)}`} />

          {variant.previewUrl && (
            <a
              href={variant.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="mt-2 flex items-center gap-1.5 text-[12px] text-sky-600 hover:text-sky-700 font-medium transition-colors"
            >
              <Eye className="h-3 w-3" />
              Preview URL
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}

      {/* Click hint when not selected */}
      {!isSelected && (
        <p className="mt-3 pt-2 border-t border-neutral-100 text-[10px] text-neutral-400 text-center">
          Click to select &amp; sync
        </p>
      )}
    </button>
  )
}

// ─── Inner Form ─────────────────────────────────────────────────────────────

function PTA2WeekInner() {
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
      'Test Description', 'Placement', 'Placement URL', 'Convert Experiment ID',
      'FIGMA Url', 'Experiment Preview URL',
      'Image Type', 'Control Image', 'Variant Image', 'PTA Result Image',
      'Post-Test Analysis (Loom)', 'Goal Metric 1', 'Metric #1 Increase',
      'Goal Metric 2', 'Metric #2 Increase', 'Revenue Added (MRR) (Regular Format)',
      'Confidence Level', 'Test Status', 'Segment Deploy Applied to',
      'Describe what happened & what we learned', 'Next Steps (Action)', 'Deployed',
    ],
    filterExtra: expFilter,
    enabled: experimentIds.length > 0 && !preview,
  })

  // Fetch all variants scoped to these experiments — match by experiment name
  // (the proven pattern from live-tests.tsx; Airtable lookup fields in
  // filterByFormula resolve to actual values, so name-matching works reliably)
  const experimentNames = useMemo(
    () => (rawExperiments ?? []).map(r => String((r.fields as Record<string, unknown>)['Test Description'] ?? '')).filter(Boolean),
    [rawExperiments],
  )

  const variantFilter = useMemo(() => {
    if (preview || experimentNames.length === 0) return undefined
    const clauses = experimentNames.map(name => {
      const safe = name.replace(/'/g, "\\'")
      return `{Test Description (from Experiments)} = '${safe}'`
    })
    return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`
  }, [experimentNames, preview])

  const { data: rawVariants, isLoading: variantsLoading } = useAirtable<Record<string, unknown>>('variants', {
    fields: [
      'Variant Name', 'Variant ID', 'Status', 'Experiments',
      'Test Description (from Experiments)', 'Preview URL', 'Traffic %',
      'Visitors', 'Conversions', 'Revenue', 'Revenue Improvement %',
      'CR %', 'CR Improvement %', 'CR Improvement Confidence',
      'RPV', 'RPV Improvement %', 'RPV Improvement Confidence', 'AOV',
    ],
    filterExtra: variantFilter,
    enabled: !!variantFilter && !preview,
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
      notificationTracking: String(f['Notification Tracking'] ?? ''),
    }
  }, [rawBatch, preview])

  const experiments = useMemo<PTAExpRow[]>(() => {
    if (preview) return PREVIEW_EXPERIMENTS
    if (!rawExperiments) return []
    return rawExperiments.map(rec => {
      const f = rec.fields as Record<string, unknown>
      const segRaw = f['Segment Deploy Applied to']
      return {
        id: rec.id,
        testDescription: String(f['Test Description'] ?? ''),
        placement: String(f['Placement'] ?? ''),
        placementUrl: String(f['Placement URL'] ?? ''),
        convertId: String(f['Convert Experiment ID'] ?? ''),
        figmaUrl: String(f['FIGMA Url'] ?? ''),
        experimentPreviewUrl: String(f['Experiment Preview URL'] ?? ''),
        imageType: (String(f['Image Type'] ?? '') as 'Mobile' | 'Desktop' | ''),
        controlImageUrl: getAttachmentUrl(f['Control Image']),
        variantImageUrl: getAttachmentUrl(f['Variant Image']),
        ptaResultImageUrl: getAttachmentUrl(f['PTA Result Image']),
        ptaLoomUrl: String(f['Post-Test Analysis (Loom)'] ?? ''),
        goalMetric1: String(f['Goal Metric 1'] ?? ''),
        metric1Increase: typeof f['Metric #1 Increase'] === 'number' ? (f['Metric #1 Increase'] as number) : null,
        goalMetric2: String(f['Goal Metric 2'] ?? ''),
        metric2Increase: typeof f['Metric #2 Increase'] === 'number' ? (f['Metric #2 Increase'] as number) : null,
        revenueAdded: typeof f['Revenue Added (MRR) (Regular Format)'] === 'number' ? (f['Revenue Added (MRR) (Regular Format)'] as number) : null,
        confidenceLevel: typeof f['Confidence Level'] === 'number' ? (f['Confidence Level'] as number) : null,
        testStatus: String(f['Test Status'] ?? ''),
        segmentDeploy: Array.isArray(segRaw) ? (segRaw as string[]) : segRaw ? [segRaw as string] : [],
        description: String(f['Describe what happened & what we learned'] ?? ''),
        nextSteps: String(f['Next Steps (Action)'] ?? ''),
        deployed: !!f['Deployed'],
      }
    })
  }, [rawExperiments, preview])

  // Group variants by experiment record ID
  const variantsByExperiment = useMemo<Map<string, VariantDetail[]>>(() => {
    if (preview) return PREVIEW_VARIANTS
    const map = new Map<string, VariantDetail[]>()
    if (!rawVariants) return map
    for (const rec of rawVariants) {
      const f = rec.fields as Record<string, unknown>
      const expIds = (f['Experiments'] as string[]) ?? []
      const variant: VariantDetail = {
        id: rec.id,
        variantName: String(f['Variant Name'] ?? 'Untitled'),
        variantId: String(f['Variant ID'] ?? ''),
        status: String(f['Status'] ?? ''),
        previewUrl: String(f['Preview URL'] ?? ''),
        trafficPct: Number(f['Traffic %'] ?? 0),
        visitors: Number(f['Visitors'] ?? 0),
        conversions: Number(f['Conversions'] ?? 0),
        revenue: Number(f['Revenue'] ?? 0),
        revenueImpPct: Number(f['Revenue Improvement %'] ?? 0),
        crPct: Number(f['CR %'] ?? 0),
        crImpPct: Number(f['CR Improvement %'] ?? 0),
        crImpConfidence: Number(f['CR Improvement Confidence'] ?? 0),
        rpv: Number(f['RPV'] ?? 0),
        rpvImpPct: Number(f['RPV Improvement %'] ?? 0),
        rpvImpConfidence: Number(f['RPV Improvement Confidence'] ?? 0),
        aov: Number(f['AOV'] ?? 0),
      }
      for (const eid of expIds) {
        if (!map.has(eid)) map.set(eid, [])
        map.get(eid)!.push(variant)
      }
    }
    return map
  }, [rawVariants, preview])

  // ── State ─────────────────────────────────────────────────────────────────

  const [expandedExpId, setExpandedExpId] = useState<string | null>(null)
  const [ptaState, setPtaState] = useState<Record<string, PTAFormState>>({})
  const [syncedVariants, setSyncedVariants] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [notifyingClient, setNotifyingClient] = useState(false)
  const [clientNotifiedLocal, setClientNotifiedLocal] = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getPtaForm(exp: PTAExp): PTAFormState {
    return ptaState[exp.id] ?? initForm(exp)
  }

  function updatePtaForm(expId: string, updates: Partial<PTAFormState>) {
    setPtaState(prev => {
      const exp = experiments.find(e => e.id === expId)
      if (!exp) return prev
      const base = prev[expId] ?? initForm(exp)
      return { ...prev, [expId]: { ...base, ...updates } }
    })
  }

  function syncVariantToForm(expId: string, variant: VariantDetail) {
    updatePtaForm(expId, {
      goalMetric1: 'CVR',
      metric1Increase: String(variant.crImpPct),
      goalMetric2: 'RPV',
      metric2Increase: String(variant.rpvImpPct),
      revenueAdded: String(variant.revenue),
      confidenceLevel: String(variant.crImpConfidence),
      finalStatus: 'Successful',
      saved: false,
    })
    setSyncedVariants(prev => ({ ...prev, [expId]: variant.id }))
  }

  async function handleSave(exp: PTAExp) {
    if (preview) return
    const form = getPtaForm(exp)
    updatePtaForm(exp.id, { saving: true, saved: false })
    setError(null)

    try {
      const fields: Record<string, unknown> = {
        'Image Type': form.imageType || null,
        'FIGMA Url': form.figmaUrl || null,
        'Post-Test Analysis (Loom)': form.resultsVideoUrl || null,
        'Goal Metric 1': form.goalMetric1 || null,
        'Metric #1 Increase': form.metric1Increase ? parseFloat(form.metric1Increase) : null,
        'Goal Metric 2': form.goalMetric2 || null,
        'Metric #2 Increase': form.metric2Increase ? parseFloat(form.metric2Increase) : null,
        'Revenue Added (MRR) (Regular Format)': form.revenueAdded ? parseFloat(form.revenueAdded) : null,
        'Confidence Level': form.confidenceLevel ? parseFloat(form.confidenceLevel) : null,
        'Test Status': form.finalStatus || null,
        'Segment Deploy Applied to': form.segmentDeploy,
        'Describe what happened & what we learned': form.description || null,
        'Next Steps (Action)': form.nextSteps || null,
        'Deployed': form.deployed,
      }

      const res = await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to save (${res.status})`)
      }

      // Fire webhook (fire-and-forget)
      try {
        const clientId = batch?.clientId ?? ''
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?experimentID=${exp.id}&batchID=${batchId}&clientID=${clientId}&action=pta_2_week_submitted`,
          { method: 'GET' },
        )
      } catch { /* webhook fire-and-forget */ }

      updatePtaForm(exp.id, { saving: false, saved: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save analysis')
      updatePtaForm(exp.id, { saving: false })
    }
  }

  // ── Notify Client ────────────────────────────────────────────────────────

  const alreadyNotifiedPTA2WK = batch?.notificationTracking === 'Client Notified (PTA2WK)'
  const isClientNotified = alreadyNotifiedPTA2WK || clientNotifiedLocal

  async function handleNotifyClient() {
    if (preview || isClientNotified || notifyingClient) return
    setNotifyingClient(true)
    setError(null)

    try {
      // 1. PATCH the batch to set Notification Tracking
      const patchRes = await fetch(`/api/airtable/batches/${batchId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields: { 'Notification Tracking': 'Client Notified (PTA2WK)' } }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to update tracking (${patchRes.status})`)
      }

      // 2. Fire webhook (fire-and-forget)
      try {
        const clientId = batch?.clientId ?? ''
        await fetch(
          `https://more-conversions.app.n8n.cloud/webhook/585f1960-4886-4a68-b1d1-e6f1fa6fe0ec?batchID=${batchId}&clientID=${clientId}&action=pta_2_week_notify_client`,
          { method: 'GET' },
        )
      } catch { /* fire-and-forget */ }

      setClientNotifiedLocal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify client')
    } finally {
      setNotifyingClient(false)
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const totalCount = experiments.length
  const completedCount = experiments.filter(e =>
    !!e.testStatus || ptaState[e.id]?.saved
  ).length
  const allCompleted = totalCount > 0 && completedCount === totalCount

  function getStatusBadge(exp: PTAExpRow) {
    const form = ptaState[exp.id]
    if (form?.saved) return { label: 'Saved', bg: 'bg-emerald-100', text: 'text-emerald-700' }
    if (exp.testStatus) return { label: exp.testStatus, bg: 'bg-emerald-100', text: 'text-emerald-700' }
    return { label: 'Pending', bg: 'bg-neutral-100', text: 'text-neutral-500' }
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

  // ── Render ────────────────────────────────────────────────────────────────

  const formContent = (
    <>
      <FormHeader
        title="PTA 2-Week Analysis"
        entityName={batch.clientName}
        badge={batch.name || undefined}
        badgeColor="emerald"
      />

      {preview && <PreviewBanner />}

      <FormBody>
        <FormError message={error} />

        {/* Step 1 — Batch Info */}
        <StepCard num="01" title="Batch Overview">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
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
                <p className="text-[13px] text-neutral-800">{totalCount} to analyze</p>
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
              {completedCount} of {totalCount} analyzed
            </span>
            {allCompleted && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                All complete
              </span>
            )}
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                allCompleted ? 'bg-emerald-500' : 'bg-emerald-400'
              )}
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Step 2 — Experiment cards */}
        <StepCard num="02" title="Experiments">
          <div className="space-y-3">
            {experiments.map(exp => {
              const isExpanded = expandedExpId === exp.id
              const variants = variantsByExperiment.get(exp.id) ?? []
              const badge = getStatusBadge(exp)
              const form = getPtaForm(exp)

              return (
                <div key={exp.id} className="rounded-xl border border-neutral-200 bg-white transition-colors">
                  {/* Card header */}
                  <button
                    type="button"
                    onClick={() => setExpandedExpId(prev => prev === exp.id ? null : exp.id)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {(exp.testStatus || ptaState[exp.id]?.saved) && (
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        <p className="text-[13px] font-medium text-neutral-800 truncate">
                          {exp.testDescription}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {exp.placement && (
                          <span className="text-[11px] text-neutral-400">{exp.placement}</span>
                        )}
                        {exp.convertId && (
                          <span className="text-[11px] text-neutral-400">· ID: {exp.convertId}</span>
                        )}
                        {variants.length > 0 && (
                          <span className="text-[10px] font-medium text-violet-600">
                            {variants.length} variant{variants.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', badge.bg, badge.text)}>
                        {badge.label}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-neutral-400" />
                        : <ChevronDown className="h-4 w-4 text-neutral-400" />
                      }
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-5 border-t border-neutral-100 pt-4">

                      {/* 1. Convert.com experiment link */}
                      {exp.convertId && (
                        <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 mb-1">
                              Convert.com Experiment
                            </p>
                            <p className="text-[15px] font-mono font-semibold text-sky-800">{exp.convertId}</p>
                          </div>
                          {exp.experimentPreviewUrl && (
                            <a
                              href={exp.experimentPreviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 transition-colors text-[12px] text-sky-600 font-medium"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Experiment
                            </a>
                          )}
                        </div>
                      )}

                      {/* 2. Variant comparison */}
                      {variants.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <FlaskConical className="h-3.5 w-3.5 text-neutral-500" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                              Variants — select a winner to sync
                            </p>
                          </div>
                          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                            {variants.map(v => (
                              <VariantCard
                                key={v.id}
                                variant={v}
                                isSelected={syncedVariants[exp.id] === v.id}
                                onSelect={() => syncVariantToForm(exp.id, v)}
                                preview={preview}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {variantsLoading && !preview && (
                        <div className="flex items-center gap-2 text-[13px] text-neutral-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading variants…
                        </div>
                      )}

                      {/* 3. PTA Form */}
                      <div className="border-t border-neutral-200 pt-5">
                        <div className={preview ? 'pointer-events-none select-none' : ''}>
                          <PTAFormContent
                            exp={exp}
                            form={form}
                            onChange={updates => updatePtaForm(exp.id, updates)}
                            onSave={() => handleSave(exp)}
                            authHeaders={authHeaders}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </StepCard>

        {/* All completed banner + Notify Client */}
        {allCompleted && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-6 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-emerald-800">All Analyses Complete</p>
                <p className="text-[13px] text-emerald-600 mt-0.5">
                  All {totalCount} {totalCount === 1 ? 'experiment has' : 'experiments have'} been analyzed for{' '}
                  <span className="font-medium">{batch.clientName}</span>.
                </p>
              </div>
            </div>

            {/* Notify Client button */}
            {isClientNotified ? (
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-xl bg-neutral-100 text-neutral-400 text-[13px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Bell className="h-4 w-4" />
                Client Notified
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNotifyClient}
                disabled={notifyingClient || preview}
                className="w-full h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
              >
                {notifyingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {notifyingClient ? 'Notifying…' : 'Notify Client'}
              </button>
            )}
          </div>
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

export default function PTA2WeekFormPage() {
  return (
    <FormPage>
      <PTA2WeekInner />
    </FormPage>
  )
}
