'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAirtable } from "@/hooks/use-airtable"
import { cn } from "@/lib/utils"
import { ExperimentDetailsModal } from '@/components/experiments/experiment-details-modal'

const PAGE_SIZE = 2

// ── Status styling ─────────────────────────────────────────────────────────────
// Safe formatter: strips ISO time to avoid UTC→local day shift on midnight-UTC Airtable dates
function formatDateSafe(raw: string): string {
  const ymd = raw.split('T')[0]
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return raw
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m[2]-1]} ${+m[3]}, ${m[1]}`
}

const statusBadge: Record<string, string> = {
  "Successful":             "bg-emerald-50 border-emerald-200 text-emerald-700",
  "Unsuccessful":           "bg-rose-50 border-rose-200 text-rose-700",
  "Inconclusive":           "bg-amber-50 border-amber-200 text-amber-700",
  "Live - Collecting Data": "bg-sky-50 border-sky-200 text-sky-700",
  "Pending":                "bg-gray-50 border-gray-200 text-gray-500",
}

const cardBorder: Record<string, string> = {
  "Successful":             "border-l-emerald-400",
  "Unsuccessful":           "border-l-rose-400",
  "Inconclusive":           "border-l-amber-400",
  "Live - Collecting Data": "border-l-sky-400",
  "Pending":                "border-l-gray-300",
}

const statusLabels: Record<string, string> = {
  "Live - Collecting Data": "Live",
}

// ── Client filter ──────────────────────────────────────────────────────────────
function buildClientFilter(clientIds: string[]): string | undefined {
  if (!clientIds.length) return undefined
  if (clientIds.length === 1) return `{Record ID (from Brand Name)} = "${clientIds[0]}"`
  const parts = clientIds.map(id => `{Record ID (from Brand Name)} = "${id}"`)
  return `OR(${parts.join(', ')})`
}

// ── Revenue formatter ──────────────────────────────────────────────────────────
function formatMrr(value: number): string {
  if (!value || value === 0) return "$0"
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

// ── Helper: extract URL from Airtable attachment field ────────────────────────
function getAttachmentUrl(field: unknown): string | undefined {
  if (Array.isArray(field) && field.length > 0) return (field[0] as { url?: string }).url ?? String(field[0])
  if (typeof field === 'string') return field
  return undefined
}

// ── Map raw Airtable record → ExperimentDetailsModal shape ───────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toModalExperiment(r: { id: string; fields: Record<string, unknown> }): any {
  const goals = r.fields['Category Primary Goals']
    ? String(r.fields['Category Primary Goals']).split(',').map((g: string) => g.trim())
    : []

  const revenue = typeof r.fields['Revenue Added (MRR) (Regular Format)'] === 'number'
    ? r.fields['Revenue Added (MRR) (Regular Format)'] as number
    : 0

  return {
    name:           String(r.fields['Test Description'] ?? ''),
    description:    String(r.fields['Rationale'] ?? ''),
    status:         String(r.fields['Test Status'] ?? 'Pending'),
    placement:      String(r.fields['Placement'] ?? ''),
    placementUrl:   String(r.fields['Placement URL'] ?? ''),
    devices:        String(r.fields['Devices'] ?? 'All Devices'),
    geos:           String(r.fields['GEOs'] ?? 'US'),
    variants:       '',
    revenue:        '',
    primaryGoals:   goals,
    hypothesis:     String(r.fields['Hypothesis'] ?? ''),
    rationale:      String(r.fields['Rationale'] ?? ''),
    revenueAddedMrr: formatMrr(revenue),
    deployed:       Boolean(r.fields['Deployed']),
    launchDate:     String(r.fields['Launch Date'] ?? ''),
    endDate:        String(r.fields['End Date'] ?? ''),
    whatHappened:   String(r.fields['Describe what happened & what we learned'] ?? ''),
    nextSteps:      String(r.fields['Next Steps (Action)'] ?? ''),
    controlImage:   getAttachmentUrl(r.fields['Control Image']),
    variantImage:   getAttachmentUrl(r.fields['Variant Image']),
    resultImage:    getAttachmentUrl(r.fields['PTA Result Image']),
    resultVideo:    getAttachmentUrl(r.fields['Post-Test Analysis (Loom)']),
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export function RecentExperiments({ clientIds = [] }: { clientIds?: string[] }) {
  const router = useRouter()

  // No fields[] restriction — avoids 422 from lookup/formula fields,
  // and gives us all data needed for the details modal.
  const { data, isLoading } = useAirtable('experiments', {
    sort: [{ field: 'Last Modified', direction: 'desc' }],
    filterExtra: buildClientFilter(clientIds),
  })

  const [page, setPage] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedExperiment, setSelectedExperiment] = useState<any | null>(null)

  // Reset page when filter changes
  useMemo(() => { setPage(0) }, [clientIds])

  const experiments = useMemo(() => data ?? [], [data])
  const totalPages = Math.max(1, Math.ceil(experiments.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => experiments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [experiments, page]
  )

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">Recent Experiments</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Latest test activity — click to view details</p>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 border-l-[3px] border-l-muted flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="h-3.5 w-48 bg-muted rounded animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              <div className="flex gap-3">
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : experiments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No experiments yet</p>
        ) : (
          pageItems.map((r) => {
            const name      = String(r.fields['Test Description'] ?? '')
            const clientArr = r.fields['Brand Name (from Brand Name)']
            const client    = Array.isArray(clientArr) ? String(clientArr[0] ?? '') : String(clientArr ?? '')
            const status    = String(r.fields['Test Status'] ?? 'Pending')
            const revenue   = typeof r.fields['Revenue Added (MRR) (Regular Format)'] === 'number'
              ? r.fields['Revenue Added (MRR) (Regular Format)'] as number
              : 0
            const launchDate = r.fields['Launch Date']
              ? formatDateSafe(String(r.fields['Launch Date']))
              : null
            const endDate = r.fields['End Date']
              ? formatDateSafe(String(r.fields['End Date']))
              : null

            return (
              <div
                key={r.id}
                onClick={() => setSelectedExperiment(toModalExperiment(r))}
                className={cn(
                  'rounded-lg border border-border p-4 border-l-[3px] flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all',
                  cardBorder[status] ?? 'border-l-gray-300'
                )}
              >
                {/* Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{name}</span>
                  <span className={cn(
                    'inline-flex shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border',
                    statusBadge[status] ?? 'bg-gray-50 border-gray-200 text-gray-500'
                  )}>
                    {statusLabels[status] ?? status}
                  </span>
                </div>

                {/* Client */}
                {client && (
                  <p className="text-[12px] text-muted-foreground">{client}</p>
                )}

                {/* Date + Revenue row */}
                <div className="flex items-center gap-3 text-[12px]">
                  {launchDate && (
                    <span className="text-muted-foreground">
                      <span className="text-muted-foreground/60 mr-1">Launched</span>{launchDate}
                    </span>
                  )}
                  {endDate && (
                    <span className="text-muted-foreground">
                      <span className="text-muted-foreground/60 mr-1">Ended</span>{endDate}
                    </span>
                  )}
                  {revenue > 0 && (
                    <span className="ml-auto font-semibold text-emerald-600 whitespace-nowrap">
                      {formatMrr(revenue)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">
          {experiments.length > 0 ? page + 1 : 0} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Experiment details modal */}
      {selectedExperiment && (
        <ExperimentDetailsModal
          isOpen={!!selectedExperiment}
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
        />
      )}
    </div>
  )
}
