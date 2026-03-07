"use client"

import { useState, useMemo, useCallback } from "react"
import { Search, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "./experiment-details-modal"
import { useAirtable } from "@/hooks/use-airtable"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BatchExp {
  id: string
  name: string
  status: string
  placement: string
  device: string
  geos: string
  goals: string[]
  launchDate: string
  endDate: string
  rationale: string
  hypothesis?: string
  whatHappened?: string
  nextSteps?: string
  revenueAdded: number
  deployed: boolean
  controlImage?: string
  variantImage?: string
  resultImage?: string
  resultVideo?: string
}

interface Batch {
  id: string
  batchKey: string
  client: string          // parsed from batchKey: "ClientName | Date"
  launchDate: string
  designStartDate: string
  allTestsStatus: string[]
  revenue: number
  experimentIds: string[]
  experiments: BatchExp[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function parseIsoDate(s: string | undefined | null): Date | null {
  if (!s) return null
  const str = String(s).split('T')[0]
  const parts = str.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function formatDate(s: string | undefined | null): string {
  const d = parseIsoDate(s as string)
  if (!d) return '—'
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatWindowLabel(start: Date, end: Date): string {
  const s = `${MONTHS[start.getMonth()]} ${start.getDate()}`
  const e = `${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  if (start.getFullYear() !== end.getFullYear()) {
    return `${s}, ${start.getFullYear()} – ${e}`
  }
  return `${s} – ${e}`
}

function parseRevenue(v: unknown): number {
  if (typeof v === 'number') return v
  return parseFloat(String(v ?? '0').replace(/[$,]/g, '')) || 0
}

function formatRevenue(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function getAttachmentUrl(field: unknown): string | undefined {
  if (!field || !Array.isArray(field) || !field.length) return undefined
  const att = field[0] as Record<string, unknown>
  const thumbs = att.thumbnails as Record<string, { url: string }> | undefined
  return (thumbs?.large?.url ?? att.url) as string | undefined
}

function parseArray(field: unknown): string[] {
  if (Array.isArray(field)) return field.map(String).filter(Boolean)
  if (typeof field === 'string' && field) return field.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

/**
 * The Client linked-record field returns Airtable record IDs, not display names.
 * Batch Key always follows the format "ClientName | YYYY MonthName DD",
 * so we extract the portion before " | " as the client name.
 */
function clientFromBatchKey(key: string): string {
  return key.split(' | ')[0]?.trim() || key
}

function dominantStatus(statuses: string[]): string {
  if (!statuses.length) return 'Unknown'
  if (statuses.some(s => s.toLowerCase().includes('live'))) return 'Live'
  const counts: Record<string, number> = {}
  for (const s of statuses) counts[s] = (counts[s] ?? 0) + 1
  if (counts['Successful']   === statuses.length) return 'Successful'
  if (counts['Unsuccessful'] === statuses.length) return 'Unsuccessful'
  if (counts['Inconclusive'] === statuses.length) return 'Inconclusive'
  return 'Mixed'
}

const STATUS_STYLES: Record<string, { bar: string; badge: string }> = {
  Successful:   { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Unsuccessful: { bar: 'bg-rose-400',    badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  Inconclusive: { bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  Live:         { bar: 'bg-sky-500',     badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  Mixed:        { bar: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  Unknown:      { bar: 'bg-gray-300',    badge: 'bg-gray-50 text-gray-600 border-gray-200' },
}

const DAY_MS = 86_400_000

/** Add (or subtract) n business days from a date, skipping weekends. */
function addBusinessDays(date: Date, n: number): Date {
  const result = new Date(date)
  const dir = n >= 0 ? 1 : -1
  let remaining = Math.abs(n)
  while (remaining > 0) {
    result.setDate(result.getDate() + dir)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) remaining--
  }
  return result
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ExperimentsTimeline() {
  const [clientFilter, setClientFilter]   = useState('All Clients')
  const [search, setSearch]               = useState('')
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [selectedExp, setSelectedExp]     = useState<BatchExp | null>(null)
  const [tooltipBatch, setTooltipBatch]   = useState<Batch | null>(null)
  const [tooltipPos, setTooltipPos]       = useState({ x: 0, y: 0 })

  // ── Sliding window state ──────────────────────────────────────────────────
  // Default: window starts 14 days before today so current activity is visible
  const [windowStartMs, setWindowStartMs] = useState<number>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  })
  const [windowDays, setWindowDays] = useState(60)

  const windowStart = useMemo(() => new Date(windowStartMs), [windowStartMs])
  const windowEnd   = useMemo(() => {
    const end = new Date(windowStartMs)
    end.setDate(end.getDate() + windowDays)
    return end
  }, [windowStartMs, windowDays])

  const totalMs = windowEnd.getTime() - windowStart.getTime()

  // Shift by half the window width on each nav click
  const shiftMs = Math.floor(windowDays / 2) * DAY_MS

  const goBack    = () => setWindowStartMs(ms => ms - shiftMs)
  const goForward = () => setWindowStartMs(ms => ms + shiftMs)
  const goToday   = () => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    setWindowStartMs(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime())
  }

  // Month tick marks — start from first of the month that contains windowStart
  const monthTicks = useMemo(() => {
    const ticks: { label: string; pct: number }[] = []
    const cur = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1)
    while (cur <= windowEnd) {
      const rawPct = (cur.getTime() - windowStart.getTime()) / totalMs * 100
      if (rawPct <= 100) {
        ticks.push({
          label: `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`,
          pct:   Math.max(0, rawPct),
        })
      }
      cur.setMonth(cur.getMonth() + 1)
    }
    return ticks
  }, [windowStartMs, windowDays]) // eslint-disable-line react-hooks/exhaustive-deps

  const todayPct = useMemo(() => {
    const now = new Date()
    return Math.max(0, Math.min(100, (now.getTime() - windowStart.getTime()) / totalMs * 100))
  }, [windowStartMs, totalMs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetches ──────────────────────────────────────────────────────────
  const { data: rawBatches, isLoading: batchesLoading } = useAirtable('batches', {
    fields: [
      'Batch Key',
      // Note: Client is a linked-record field — returns record IDs, not names.
      // We derive the client name from Batch Key instead ("ClientName | Date").
      'Launch Date',
      'Design Start Date',
      'All Tests Status',
      'Revenue Added (MRR)',
      'Experiments Record ID',
    ],
    sort: [{ field: 'Launch Date', direction: 'asc' }],
  })

  const { data: rawExperiments, isLoading: expsLoading } = useAirtable('experiments', {
    fields: [
      'Test Description',
      'Test Status',
      'Placement',
      'Devices',
      'GEOs',
      'Category Primary Goals',
      'Launch Date',
      'End Date',
      'Rationale',
      'Hypothesis',
      'Describe what happened & what we learned',
      'Next Steps (Action)',
      'Revenue Added (MRR) (Regular Format)',
      'Deployed',
      'Control Image',
      'Variant Image',
      'PTA Result Image',
      'Post-Test Analysis (Loom)',
    ],
  })

  // ── Experiment lookup map ─────────────────────────────────────────────────
  const expById = useMemo(() => {
    const map = new Map<string, BatchExp>()
    for (const r of rawExperiments ?? []) {
      const f = r.fields
      map.set(r.id, {
        id:           r.id,
        name:         String(f['Test Description'] ?? 'Unnamed'),
        status:       String(f['Test Status'] ?? ''),
        placement:    String(f['Placement'] ?? ''),
        device:       parseArray(f['Devices']).join(', '),
        geos:         parseArray(f['GEOs']).join(', '),
        goals:        parseArray(f['Category Primary Goals']),
        launchDate:   String(f['Launch Date'] ?? ''),
        endDate:      String(f['End Date'] ?? ''),
        rationale:    String(f['Rationale'] ?? ''),
        hypothesis:   String(f['Hypothesis'] ?? '') || undefined,
        whatHappened: String(f['Describe what happened & what we learned'] ?? '') || undefined,
        nextSteps:    String(f['Next Steps (Action)'] ?? '') || undefined,
        revenueAdded: parseRevenue(f['Revenue Added (MRR) (Regular Format)']),
        deployed:     Boolean(f['Deployed']),
        controlImage: getAttachmentUrl(f['Control Image']),
        variantImage: getAttachmentUrl(f['Variant Image']),
        resultImage:  getAttachmentUrl(f['PTA Result Image']),
        resultVideo:  String(f['Post-Test Analysis (Loom)'] ?? '') || undefined,
      })
    }
    return map
  }, [rawExperiments])

  // ── Build Batch objects ───────────────────────────────────────────────────
  const batches = useMemo((): Batch[] => {
    return (rawBatches ?? []).map(r => {
      const f          = r.fields
      const batchKey   = String(f['Batch Key'] ?? '')
      const client     = clientFromBatchKey(batchKey)
      const expIds     = parseArray(f['Experiments Record ID'])
      const statuses   = parseArray(f['All Tests Status'])
      const experiments = expIds.map(id => expById.get(id)).filter((e): e is BatchExp => !!e)

      return {
        id:              r.id,
        batchKey,
        client,
        launchDate:      String(f['Launch Date'] ?? ''),
        designStartDate: String(f['Design Start Date'] ?? ''),
        allTestsStatus:  statuses,
        revenue:         parseRevenue(f['Revenue Added (MRR)']),
        experimentIds:   expIds,
        experiments,
      }
    })
  }, [rawBatches, expById])

  // ── Client list (derived from batch keys) ─────────────────────────────────
  const clients = useMemo(
    () => ['All Clients', ...Array.from(new Set(batches.map(b => b.client).filter(Boolean))).sort()],
    [batches]
  )

  // ── Filter (client + search) ──────────────────────────────────────────────
  const filtered = useMemo(() => batches.filter(b => {
    if (clientFilter !== 'All Clients' && b.client !== clientFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !b.batchKey.toLowerCase().includes(q) &&
        !b.client.toLowerCase().includes(q) &&
        !b.experiments.some(e => e.name.toLowerCase().includes(q))
      ) return false
    }
    return true
  }), [batches, clientFilter, search])

  // ── Gantt: only batches whose full lifecycle overlaps the current window ────
  // Full lifecycle: Strategy Ideas (launch − 12 biz days) → PTA end (launch + 14d + 2 biz days)
  const ganttBatches = useMemo(() => filtered.filter(b => {
    const launchD = parseIsoDate(b.launchDate)
    if (!launchD) return false
    const strategyStart = addBusinessDays(launchD, -12)
    const dataEnd       = new Date(launchD.getTime() + 14 * DAY_MS)
    const ptaEnd        = addBusinessDays(dataEnd, 2)
    // Overlaps window if: start <= windowEnd && end >= windowStart
    return strategyStart.getTime() <= windowEnd.getTime() && ptaEnd.getTime() >= windowStart.getTime()
  }), [filtered, windowStartMs, windowDays]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upcoming / past split for the batch card list ─────────────────────────
  const today    = new Date()
  const upcoming = filtered.filter(b => { const d = parseIsoDate(b.launchDate); return !d || d >= today })
  const past     = filtered.filter(b => { const d = parseIsoDate(b.launchDate); return !!d && d < today })

  const isLoading  = batchesLoading || expsLoading
  const handleClose = useCallback(() => setSelectedExp(null), [])
  const toggleBatch = (id: string) => setExpandedBatch(prev => prev === id ? null : id)

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <SelectField value={clientFilter} onChange={setClientFilter} options={clients} />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search batches or experiments..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-64 bg-muted animate-pulse rounded-xl" />
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* ── Gantt Chart ─────────────────────────────────────────────── */}
            <div className="bg-card rounded-xl border border-border">

              {/* Gantt header: legend + window controls */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                {/* Legend — phases + status colors */}
                <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
                  {/* Phase segments legend */}
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-4 rounded-sm inline-block bg-sky-500/50" />
                    <span className="h-2 w-4 rounded-sm inline-block bg-sky-500" />
                    <span className="h-2 w-4 rounded-sm inline-block bg-sky-500/35" />
                    <span className="ml-1">Strategy · Live · PTA</span>
                  </div>
                  <span className="text-border">|</span>
                  {/* Status colors */}
                  {[
                    ['bg-emerald-500', 'Successful'],
                    ['bg-rose-400',   'Unsuccessful'],
                    ['bg-amber-400',  'Inconclusive'],
                    ['bg-sky-500',    'Live'],
                    ['bg-violet-500', 'Mixed'],
                  ].map(([color, label]) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-4 rounded-sm inline-block", color)} />
                      {label}
                    </span>
                  ))}
                </div>

                {/* Window controls */}
                <div className="flex items-center gap-2">
                  {/* Window size */}
                  <div className="flex items-center rounded-lg border border-border overflow-hidden text-[11px] font-medium">
                    {[30, 60, 90].map(d => (
                      <button
                        key={d}
                        onClick={() => setWindowDays(d)}
                        className={cn(
                          "h-7 px-2.5 transition-colors border-r border-border last:border-0",
                          windowDays === d
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>

                  {/* Prev / Today / Next */}
                  <button
                    onClick={goBack}
                    className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={goToday}
                    className="h-7 px-2.5 rounded-lg border border-border text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={goForward}
                    className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Window date range label + hint */}
              <div className="px-5 py-2 border-b border-border flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">
                  {formatWindowLabel(windowStart, windowEnd)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {ganttBatches.length === 0
                    ? 'No batches in this period'
                    : `${ganttBatches.length} batch${ganttBatches.length !== 1 ? 'es' : ''} · hover for details · click to expand`}
                </span>
              </div>

              {/* Scrollable chart body */}
              <div className="overflow-x-auto">
                <div style={{ minWidth: '560px' }}>

                  {/* Month label row */}
                  <div className="flex border-b border-border">
                    <div className="w-[180px] shrink-0 bg-accent/10" />
                    <div className="flex-1 relative h-8 bg-accent/10">
                      {monthTicks.map((tick, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-full flex items-center"
                          style={{ left: `${tick.pct}%` }}
                        >
                          <div className="w-px h-full bg-border" />
                          <span className="ml-1.5 text-[10px] font-medium text-muted-foreground whitespace-nowrap select-none">
                            {tick.label}
                          </span>
                        </div>
                      ))}
                      {/* Today marker */}
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div
                          className="absolute top-0 h-full z-10"
                          style={{ left: `${todayPct}%` }}
                        >
                          <div className="w-0.5 h-full bg-sky-500/80" />
                          <span className="absolute top-0.5 left-1 text-[9px] font-semibold text-sky-500 whitespace-nowrap select-none">
                            Today
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch rows — only batches visible in the current window */}
                  {ganttBatches.length === 0 ? (
                    <div className="flex">
                      <div className="w-[180px] shrink-0" />
                      <div className="flex-1 flex items-center justify-center py-10 text-[12px] text-muted-foreground">
                        No batches in this date range — use the arrows to navigate.
                      </div>
                    </div>
                  ) : (
                    ganttBatches.map(batch => {
                      const launchD = parseIsoDate(batch.launchDate)
                      if (!launchD) return null

                      // Full lifecycle dates
                      const strategyStart = addBusinessDays(launchD, -12)
                      const dataEnd       = new Date(launchD.getTime() + 14 * DAY_MS)
                      const ptaEnd        = addBusinessDays(dataEnd, 2)

                      // Overall bar position (clamped to window)
                      const leftPct  = Math.max(0, (strategyStart.getTime() - windowStart.getTime()) / totalMs * 100)
                      const rightPct = Math.min(100, (ptaEnd.getTime() - windowStart.getTime()) / totalMs * 100)
                      const widthPct = Math.max(1, rightPct - leftPct)

                      // Phase proportions within the bar
                      const totalBarMs = ptaEnd.getTime() - strategyStart.getTime()
                      const preLaunchFrac  = totalBarMs > 0 ? (launchD.getTime() - strategyStart.getTime()) / totalBarMs : 0
                      const dataCollFrac   = totalBarMs > 0 ? (dataEnd.getTime() - launchD.getTime()) / totalBarMs : 0
                      // ptaFrac = remainder

                      const status    = dominantStatus(batch.allTestsStatus)
                      const style     = STATUS_STYLES[status] ?? STATUS_STYLES.Unknown
                      const isExpanded = expandedBatch === batch.id

                      return (
                        <div
                          key={batch.id}
                          className={cn(
                            "flex border-b border-border last:border-0 h-11 cursor-pointer group select-none",
                            isExpanded && "bg-accent/20"
                          )}
                          onClick={() => toggleBatch(batch.id)}
                          onMouseEnter={e => {
                            setTooltipBatch(batch)
                            setTooltipPos({ x: e.clientX, y: e.clientY })
                          }}
                          onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltipBatch(null)}
                        >
                          {/* Row label: client name + test count */}
                          <div className="w-[180px] shrink-0 px-4 flex flex-col justify-center border-r border-border">
                            <span className="text-[11px] font-semibold text-foreground truncate">{batch.client}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {batch.experimentIds.length} test{batch.experimentIds.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Bar area */}
                          <div className="flex-1 relative flex items-center">
                            {/* Subtle month grid lines */}
                            {monthTicks.map((tick, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 w-px bg-border/30"
                                style={{ left: `${tick.pct}%` }}
                              />
                            ))}
                            {/* Today line */}
                            {todayPct >= 0 && todayPct <= 100 && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-sky-500/20 z-10 pointer-events-none"
                                style={{ left: `${todayPct}%` }}
                              />
                            )}
                            {/* Phased lifecycle bar */}
                            <div
                              className="absolute z-20 h-6 rounded-md overflow-hidden flex group-hover:h-7 group-hover:shadow-md transition-all duration-150"
                              style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '8px' }}
                            >
                              {/* Pre-launch: Strategy Ideas → Launch (lighter) */}
                              <div
                                className={cn("h-full opacity-50", style.bar)}
                                style={{ width: `${preLaunchFrac * 100}%` }}
                              />
                              {/* Data Collection: Launch → Launch + 2 weeks (full color) */}
                              <div
                                className={cn("h-full", style.bar)}
                                style={{ width: `${dataCollFrac * 100}%` }}
                              />
                              {/* PTA Post-Analysis: remaining (muted) */}
                              <div
                                className={cn("h-full opacity-35", style.bar)}
                                style={{ flex: 1 }}
                              />
                              {/* Batch key label overlaid */}
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white truncate px-2 pointer-events-none">
                                {batch.batchKey}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── Batch Card List ──────────────────────────────────────────── */}
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-[13px] text-muted-foreground">
                No batches match your filters.
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                      Upcoming ({upcoming.length})
                    </p>
                    {upcoming.map(batch => (
                      <BatchCard
                        key={batch.id}
                        batch={batch}
                        expanded={expandedBatch === batch.id}
                        onToggle={() => toggleBatch(batch.id)}
                        onSelectExp={setSelectedExp}
                      />
                    ))}
                  </div>
                )}

                {past.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                      Past ({past.length})
                    </p>
                    {[...past].reverse().map(batch => (
                      <BatchCard
                        key={batch.id}
                        batch={batch}
                        expanded={expandedBatch === batch.id}
                        onToggle={() => toggleBatch(batch.id)}
                        onSelectExp={setSelectedExp}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Hover tooltip (fixed-position, never clipped) ─────────────────── */}
      {tooltipBatch && (
        <TooltipCard batch={tooltipBatch} x={tooltipPos.x} y={tooltipPos.y} />
      )}

      {/* ── Experiment details modal ─────────────────────────────────────── */}
      {selectedExp && (
        <ExperimentDetailsModal
          isOpen
          experiment={{
            name:            selectedExp.name,
            description:     selectedExp.rationale,
            status:          selectedExp.status,
            placement:       selectedExp.placement,
            devices:         selectedExp.device,
            geos:            selectedExp.geos,
            variants:        '2',
            revenue:         formatRevenue(selectedExp.revenueAdded),
            primaryGoals:    selectedExp.goals,
            hypothesis:      selectedExp.hypothesis,
            rationale:       selectedExp.rationale,
            revenueAddedMrr: selectedExp.revenueAdded ? String(selectedExp.revenueAdded) : undefined,
            deployed:        selectedExp.deployed,
            launchDate:      selectedExp.launchDate,
            endDate:         selectedExp.endDate,
            whatHappened:    selectedExp.whatHappened,
            nextSteps:       selectedExp.nextSteps,
            controlImage:    selectedExp.controlImage,
            variantImage:    selectedExp.variantImage,
            resultImage:     selectedExp.resultImage,
            resultVideo:     selectedExp.resultVideo,
          }}
          onClose={handleClose}
        />
      )}
    </>
  )
}

// ─── Floating Tooltip ──────────────────────────────────────────────────────────

function TooltipCard({ batch, x, y }: { batch: Batch; x: number; y: number }) {
  const status = dominantStatus(batch.allTestsStatus)
  const style  = STATUS_STYLES[status] ?? STATUS_STYLES.Unknown
  const left   = Math.min(x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 296)
  const top    = Math.max(8, y - 140)

  // Compute lifecycle dates for tooltip
  const launchD = parseIsoDate(batch.launchDate)
  const strategyStart = launchD ? addBusinessDays(launchD, -12) : null
  const dataEnd       = launchD ? new Date(launchD.getTime() + 14 * DAY_MS) : null
  const ptaEnd        = dataEnd ? addBusinessDays(dataEnd, 2) : null

  const fmtD = (d: Date | null) => d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '—'

  return (
    <div
      className="fixed z-50 pointer-events-none bg-popover border border-border rounded-xl shadow-xl p-3.5 w-72"
      style={{ left, top }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2">
          {batch.batchKey}
        </span>
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 mt-0.5", style.badge)}>
          {status}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        <span>Strategy Start: <span className="text-foreground">{fmtD(strategyStart)}</span></span>
        <span>Launch: <span className="text-foreground">{formatDate(batch.launchDate)}</span></span>
        <span>Data Collection Ends: <span className="text-foreground">{fmtD(dataEnd)}</span></span>
        <span>PTA Complete: <span className="text-foreground">{fmtD(ptaEnd)}</span></span>
        {batch.revenue > 0 && (
          <span className="text-emerald-600 font-medium">MRR Added: {formatRevenue(batch.revenue)}</span>
        )}
        <span>{batch.experimentIds.length} experiment{batch.experimentIds.length !== 1 ? 's' : ''}</span>
        {batch.allTestsStatus.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {batch.allTestsStatus.slice(0, 6).map((s, i) => {
              const ss = STATUS_STYLES[s] ?? STATUS_STYLES.Unknown
              return (
                <span key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", ss.badge)}>
                  {s}
                </span>
              )
            })}
            {batch.allTestsStatus.length > 6 && (
              <span className="text-[10px] text-muted-foreground">+{batch.allTestsStatus.length - 6} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Batch Card ────────────────────────────────────────────────────────────────

function BatchCard({
  batch,
  expanded,
  onToggle,
  onSelectExp,
}: {
  batch: Batch
  expanded: boolean
  onToggle: () => void
  onSelectExp: (exp: BatchExp) => void
}) {
  const status = dominantStatus(batch.allTestsStatus)
  const style  = STATUS_STYLES[status] ?? STATUS_STYLES.Unknown

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150",
            expanded && "rotate-90"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground truncate">{batch.batchKey}</span>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0", style.badge)}>
              {status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-muted-foreground">
            <span>{batch.client}</span>
            {batch.launchDate && <span>• Launch: {formatDate(batch.launchDate)}</span>}
            <span>• {batch.experimentIds.length} test{batch.experimentIds.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {batch.revenue > 0 && (
          <div className="flex items-center gap-1.5 text-emerald-600 shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[13px] font-semibold tabular-nums">{formatRevenue(batch.revenue)}</span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {batch.experiments.length === 0 ? (
            <div className="px-5 py-4 text-[12px] text-muted-foreground">
              {batch.experimentIds.length > 0
                ? `${batch.experimentIds.length} experiment(s) linked — details still loading.`
                : 'No experiments linked to this batch.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-accent/20">
                    <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">Experiment</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Placement</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.experiments.map(exp => {
                    const s = STATUS_STYLES[exp.status] ?? STATUS_STYLES.Unknown
                    return (
                      <tr
                        key={exp.id}
                        className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => onSelectExp(exp)}
                      >
                        <td className="px-5 py-3 font-medium text-foreground">{exp.name}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", s.badge)}>
                            {exp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{exp.placement || '—'}</td>
                        <td className={cn(
                          "px-4 py-3 text-right font-medium tabular-nums",
                          exp.revenueAdded > 0 ? "text-emerald-600" : "text-muted-foreground"
                        )}>
                          {formatRevenue(exp.revenueAdded)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
