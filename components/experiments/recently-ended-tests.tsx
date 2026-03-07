'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, HelpCircle, ExternalLink } from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = 'Successful' | 'Unsuccessful' | 'Inconclusive'

interface Result {
  id: string
  name: string
  client: string
  status: Status
  revenueAdded: number
  placement: string
  placementUrl?: string
  device: string
  geos: string
  launchDate: string
  endDate: string
  rationale: string
  goals: string[]
  deployed: boolean
  hypothesis?: string
  whatHappened?: string
  nextSteps?: string
  thumbnailUrl?: string
}

// ─── Config (mirrored from results-grid.tsx) ─────────────────────────────────

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  Successful:   { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  Unsuccessful: { icon: XCircle,      color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200'    },
  Inconclusive: { icon: HelpCircle,   color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200'   },
}

const goalColors: Record<string, string> = {
  CVR: 'bg-sky-100 text-sky-700 border-sky-200',
  ATC: 'bg-violet-100 text-violet-700 border-violet-200',
  RPV: 'bg-teal-100 text-teal-700 border-teal-200',
  AOV: 'bg-amber-100 text-amber-700 border-amber-200',
}

// ─── Helpers (mirrored from results-grid.tsx) ────────────────────────────────

function formatRevenue(n: number) {
  if (n === 0) return '$0.0K'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function getAttachmentUrl(field: unknown): string | undefined {
  if (!field || !Array.isArray(field) || field.length === 0) return undefined
  const att = field[0] as Record<string, unknown>
  const thumbs = att.thumbnails as Record<string, { url: string }> | undefined
  return (thumbs?.large?.url ?? att.url) as string | undefined
}

function formatDateSafe(raw: string): string {
  const ymd = raw.split('T')[0]
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return raw
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m[2]-1]} ${+m[3]}, ${m[1]}`
}

// Map Result → shape ExperimentDetailsModal expects
function toModalExperiment(r: Result) {
  return {
    id:           r.id,
    name:         r.name,
    description:  r.rationale,
    client:       r.client,
    status:       r.status,
    revenue:      formatRevenue(r.revenueAdded),
    placement:    r.placement,
    placementUrl: r.placementUrl,
    devices:      r.device,
    geos:         r.geos,
    variants:     '2',
    primaryGoals: r.goals,
    hypothesis:   r.hypothesis,
    rationale:    r.rationale,
    revenueAddedMrr: r.revenueAdded ? String(r.revenueAdded) : undefined,
    deployed:     r.deployed,
    launchDate:   r.launchDate,
    endDate:      r.endDate,
    whatHappened:  r.whatHappened,
    nextSteps:    r.nextSteps,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 2

interface Props {
  onExperimentClick?: (experiment: ReturnType<typeof toModalExperiment>) => void
  clientId?: string
}

export function RecentlyEndedTests({ onExperimentClick, clientId }: Props) {
  const [page, setPage] = useState(0)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const statusFilter = `OR({Test Status} = "Successful", {Test Status} = "Unsuccessful", {Test Status} = "Inconclusive")`
  const dateFilter   = `AND(NOT(IS_BEFORE({End Date}, "${thirtyDaysAgo}")), IS_BEFORE({End Date}, "${today}"))`
  const clientFilter = clientId ? `{Record ID (from Brand Name)} = "${clientId}"` : null
  const filterExtra  = clientFilter
    ? `AND(${statusFilter}, ${dateFilter}, ${clientFilter})`
    : `AND(${statusFilter}, ${dateFilter})`

  const { data: rawData, isLoading } = useAirtable('experiments', {
    maxRecords: 10,
    fields: [
      'Test Description',
      'Brand Name (from Brand Name)',
      'Test Status',
      'Launch Date',
      'End Date',
      'Revenue Added (MRR) (Regular Format)',
      'Placement',
      'Placement URL',
      'Devices',
      'GEOs',
      'Rationale',
      'Category Primary Goals',
      'Deployed',
      'Hypothesis',
      'Describe what happened & what we learned',
      'Next Steps (Action)',
      'Control Image',
      'PTA Result Image',
    ],
    sort: [{ field: 'End Date', direction: 'desc' }],
    filterExtra,
  })

  const results = useMemo((): Result[] => {
    if (!rawData) return []
    return rawData
      .map(record => {
        const f = record.fields
        const rawStatus = f['Test Status'] as string
        if (!['Successful', 'Unsuccessful', 'Inconclusive'].includes(rawStatus)) return null

        const rev = f['Revenue Added (MRR) (Regular Format)']
        const revenueAdded = typeof rev === 'number'
          ? rev
          : parseFloat(String(rev ?? '0').replace(/[$,]/g, '')) || 0

        const brandArr = f['Brand Name (from Brand Name)']
        const client = Array.isArray(brandArr) ? String(brandArr[0] ?? '') : String(brandArr ?? '')

        const fmtDate = (v: unknown) => v ? formatDateSafe(String(v)) : ''

        return {
          id:           record.id,
          name:         (f['Test Description'] as string) || 'Unnamed',
          client,
          status:       rawStatus as Status,
          revenueAdded,
          placement:    (f['Placement'] as string) || '',
          placementUrl: (f['Placement URL'] as string) || undefined,
          device: Array.isArray(f['Devices'])
            ? (f['Devices'] as string[]).join(', ')
            : (f['Devices'] as string) || '',
          geos: Array.isArray(f['GEOs'])
            ? (f['GEOs'] as string[]).join(', ')
            : (f['GEOs'] as string) || '',
          launchDate:   fmtDate(f['Launch Date']),
          endDate:      fmtDate(f['End Date']),
          rationale:    (f['Rationale'] as string) || '',
          goals: Array.isArray(f['Category Primary Goals'])
            ? (f['Category Primary Goals'] as string[])
            : [],
          deployed:     Boolean(f['Deployed']),
          hypothesis:   (f['Hypothesis'] as string) || undefined,
          whatHappened:  (f['Describe what happened & what we learned'] as string) || undefined,
          nextSteps:    (f['Next Steps (Action)'] as string) || undefined,
          thumbnailUrl:
            getAttachmentUrl(f['PTA Result Image']) ??
            getAttachmentUrl(f['Control Image']),
        } as Result
      })
      .filter((r): r is Result => r !== null)
  }, [rawData])

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageResults = results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold">Recently Ended Tests</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Last 30 days</p>
        </div>
        {!isLoading && results.length > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 tabular-nums">
            {results.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <div className="h-32 bg-muted animate-pulse" />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">No tests ended in the last 30 days</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">Completed experiments will appear here</p>
          </div>
        ) : (
          <>
            {/* Card grid — 2 per page */}
            <div className="grid grid-cols-2 gap-3">
              {pageResults.map(r => {
                const cfg = statusConfig[r.status]
                return (
                  <button
                    key={r.id}
                    onClick={() => onExperimentClick?.(toModalExperiment(r))}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-all group text-left"
                  >
                    {/* Thumbnail */}
                    <div className="h-32 bg-accent/20 overflow-hidden">
                      {r.thumbnailUrl ? (
                        <img
                          src={r.thumbnailUrl}
                          alt={r.name}
                          className="h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-3.5 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md border', cfg.bg, cfg.color, cfg.border)}>
                          {r.status}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{r.name}</h3>
                        {r.client && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{r.client}</p>
                        )}
                      </div>
                      {r.goals.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {r.goals.map(g => (
                            <span
                              key={g}
                              className={cn('text-[10px] font-semibold px-1.5 py-px rounded border', goalColors[g] || 'bg-accent text-foreground border-border')}
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Revenue</span>
                          <span className={cn('text-[13px] font-semibold tabular-nums', r.revenueAdded > 0 ? 'text-emerald-600' : 'text-muted-foreground')}>
                            {formatRevenue(r.revenueAdded)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground">Placement</span>
                          <span className="text-[11px] font-medium text-foreground truncate max-w-[100px]">{r.placement}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
