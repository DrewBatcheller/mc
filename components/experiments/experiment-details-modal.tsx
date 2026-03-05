"use client"

import { useEffect } from "react"
import { X, ExternalLink, Check, Play, MapPin, Monitor, Globe, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Safe date formatter ───────────────────────────────────────────────────────
// Airtable stores date-only fields as midnight UTC ("2025-03-15T00:00:00.000Z").
// Never use new Date() — it shifts UTC midnight into the previous day for UTC- zones.
// We parse YYYY-MM-DD directly and format without any timezone conversion.
function formatDateSafe(raw: string | number | undefined): string {
  if (!raw) return '—'
  // Airtable can return dates as ISO strings OR epoch timestamps (ms) for formula fields.
  // Convert to string first so .split() is always safe.
  const str = typeof raw === 'number' ? new Date(raw).toISOString() : String(raw)
  const ymd = str.split('T')[0]
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return str
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m[2]-1]} ${+m[3]}, ${m[1]}`
}

// ─── Lookup tables ─────────────────────────────────────────────────────────────

const goalColors: Record<string, string> = {
  CVR:             "bg-sky-100 text-sky-700 border-sky-200",
  ATC:             "bg-violet-100 text-violet-700 border-violet-200",
  RPV:             "bg-teal-100 text-teal-700 border-teal-200",
  AOV:             "bg-amber-100 text-amber-700 border-amber-200",
  "Bounce Rate":   "bg-rose-100 text-rose-700 border-rose-200",
  "Session Depth": "bg-indigo-100 text-indigo-700 border-indigo-200",
}

const statusConfig: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  Successful:    { bg: "bg-emerald-50", color: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  Unsuccessful:  { bg: "bg-rose-50",    color: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500"    },
  Inconclusive:  { bg: "bg-amber-50",   color: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400"   },
  Live:          { bg: "bg-sky-50",     color: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500"     },
  Pending:       { bg: "bg-gray-50",    color: "text-gray-600",    border: "border-gray-200",    dot: "bg-gray-400"    },
  "In Progress": { bg: "bg-sky-50",     color: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-400"     },
  Blocked:       { bg: "bg-red-50",     color: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"     },
}

const accentStrip: Record<string, string> = {
  Successful:    "bg-emerald-500",
  Unsuccessful:  "bg-rose-400",
  Inconclusive:  "bg-amber-400",
  Live:          "bg-sky-500",
  Pending:       "bg-gray-300",
  "In Progress": "bg-sky-400",
  Blocked:       "bg-red-400",
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatMrr(v: string | undefined): string | null {
  if (!v) return null
  const num = parseFloat(v.replace(/[$,]/g, ""))
  if (isNaN(num) || num === 0) return null
  if (Math.abs(num) >= 1000) return "$" + (num / 1000).toFixed(1) + "K"
  return "$" + num.toLocaleString()
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
      {children}
    </p>
  )
}

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("rounded animate-pulse bg-muted/60", className)} />
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Experiment {
  name: string
  description: string
  status: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: string
  revenue: string
  primaryGoals?: string[]
  hypothesis?: string
  rationale?: string
  weighting?: string
  revenueAddedMrr?: string
  deployed?: boolean
  whatHappened?: string
  nextSteps?: string
  launchDate?: string
  endDate?: string
  controlImage?: string
  variantImage?: string
  resultImage?: string
  resultVideo?: string
  variantData?: {
    name: string
    visitors: number
    conversions: number
    cr?: number
    crPercent?: number
    crImprovement: number
    crConfidence?: number
    rpv: number
    rpvImprovement: number
    rpvConfidence?: number
    revenue: number
    revenueImprovement: number
    appv?: number
    appvImprovement?: number
    trafficPercent?: number
    status?: string
  }[]
  [key: string]: unknown
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExperimentDetailsModal({
  isOpen,
  experiment,
  batchKey,
  onClose,
  isLoadingDetails = false,
}: {
  isOpen: boolean
  experiment: Experiment | null
  batchKey?: string
  onClose: () => void
  isLoadingDetails?: boolean
}) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen || !experiment) return null

  const cfg   = statusConfig[experiment.status]  ?? statusConfig.Pending
  const strip = accentStrip[experiment.status]   ?? "bg-gray-300"
  const goals = experiment.primaryGoals ?? []
  const deviceList = experiment.devices
    ? experiment.devices.split(",").map(d => d.trim()).filter(Boolean)
    : []
  const geosList = experiment.geos
    ? experiment.geos.split(",").map(g => g.trim()).filter(Boolean)
    : []
  const mrr = formatMrr(experiment.revenueAddedMrr)
  const hasResultData = !!experiment.revenueAddedMrr || experiment.deployed !== undefined

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">

        {/* Status color strip */}
        <div className={cn("h-1 rounded-t-2xl shrink-0", strip)} />

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Status badge + loading indicator */}
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0",
                  cfg.bg, cfg.color, cfg.border
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                  {experiment.status}
                </span>
                {isLoadingDetails && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading details…
                  </span>
                )}
              </div>
              {/* Title */}
              <h2 className="text-[15px] font-semibold text-foreground leading-snug">{experiment.name}</h2>
              {batchKey && (
                <p className="text-[12px] text-muted-foreground mt-0.5">{batchKey}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0 mt-0.5"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 flex flex-col gap-6">

          {/* ① Dates — very top, before everything else */}
          {(experiment.launchDate || experiment.endDate) && (
            <div className="grid grid-cols-2 gap-3">
              {experiment.launchDate && (
                <div className="bg-accent/40 rounded-xl border border-border px-4 py-3">
                  <SectionLabel>Launch Date</SectionLabel>
                  <p className="text-[15px] font-semibold text-foreground tabular-nums">
                    {formatDateSafe(experiment.launchDate)}
                  </p>
                </div>
              )}
              {experiment.endDate && (
                <div className="bg-accent/40 rounded-xl border border-border px-4 py-3">
                  <SectionLabel>End Date</SectionLabel>
                  <p className="text-[15px] font-semibold text-foreground tabular-nums">
                    {formatDateSafe(experiment.endDate)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ② Meta pills — placement / devices / geos */}
          {(experiment.placement || deviceList.length > 0 || geosList.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {experiment.placement && (
                <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground bg-accent/60 border border-border rounded-lg px-3 py-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{experiment.placement}</span>
                  {experiment.placementUrl && (
                    <a
                      href={experiment.placementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
              {deviceList.length > 0 && (
                <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground bg-accent/60 border border-border rounded-lg px-3 py-1.5">
                  <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{deviceList.join(", ")}</span>
                </div>
              )}
              {geosList.length > 0 && (
                <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground bg-accent/60 border border-border rounded-lg px-3 py-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{geosList.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {/* ③ Goals */}
          {goals.length > 0 && (
            <div>
              <SectionLabel>Primary Goals</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {goals.map(g => (
                  <span
                    key={g}
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-lg border",
                      goalColors[g] ?? "bg-accent text-foreground border-border"
                    )}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ④ Hypothesis */}
          {experiment.hypothesis && (
            <div className="bg-accent/40 rounded-xl border border-border px-4 py-3.5">
              <SectionLabel>Hypothesis</SectionLabel>
              <p className="text-[13px] text-foreground leading-relaxed">{experiment.hypothesis}</p>
            </div>
          )}

          {/* ⑤ Rationale — detail fetch, shimmer while loading */}
          {isLoadingDetails ? (
            <div className="bg-accent/40 rounded-xl border border-border px-4 py-3.5">
              <Shimmer className="h-2.5 w-16 mb-3" />
              <Shimmer className="h-3 w-full mb-2" />
              <Shimmer className="h-3 w-4/5" />
            </div>
          ) : experiment.rationale ? (
            <div className="bg-accent/40 rounded-xl border border-border px-4 py-3.5">
              <SectionLabel>Rationale</SectionLabel>
              <p className="text-[13px] text-foreground leading-relaxed">{experiment.rationale}</p>
            </div>
          ) : null}

          {/* ─── Results group ─────────────────────────────────────────────── */}

          {/* ⑥ Test Preview — always shown (shimmer while loading) */}
          <div>
            <SectionLabel>Test Preview</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] font-semibold text-foreground mb-0.5">Control</p>
                <p className="text-[11px] text-muted-foreground mb-2">Original</p>
                <div className="h-44 rounded-xl border border-border overflow-hidden bg-accent/30">
                  {isLoadingDetails ? (
                    <div className="h-full w-full bg-muted/60 animate-pulse" />
                  ) : experiment.controlImage ? (
                    <img
                      src={experiment.controlImage}
                      alt="Control"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground mb-0.5">Variant</p>
                <p className="text-[11px] text-muted-foreground mb-2">Variation</p>
                <div className="h-44 rounded-xl border border-border overflow-hidden bg-accent/30">
                  {isLoadingDetails ? (
                    <div className="h-full w-full bg-muted/60 animate-pulse" />
                  ) : experiment.variantImage ? (
                    <img
                      src={experiment.variantImage}
                      alt="Variant"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ⑦ Results panel — MRR / Outcome / Deployed */}
          {isLoadingDetails ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 pt-3.5 pb-2.5 border-b border-border bg-muted/20">
                <Shimmer className="h-2.5 w-20" />
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-4 py-4"><Shimmer className="h-2 w-14 mb-2.5" /><Shimmer className="h-7 w-16" /></div>
                <div className="px-4 py-4"><Shimmer className="h-2 w-12 mb-2.5" /><Shimmer className="h-5 w-20" /></div>
                <div className="px-4 py-4"><Shimmer className="h-2 w-16 mb-2.5" /><Shimmer className="h-6 w-6 rounded-full" /></div>
              </div>
            </div>
          ) : hasResultData ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 pt-3 pb-2.5 border-b border-border bg-muted/20">
                <SectionLabel>Test Results</SectionLabel>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">MRR Added</p>
                  {mrr ? (
                    <p className="text-[24px] font-bold text-emerald-600 leading-none tabular-nums">{mrr}</p>
                  ) : (
                    <p className="text-[20px] font-bold text-muted-foreground leading-none">—</p>
                  )}
                </div>
                <div className="px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Outcome</p>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
                    cfg.bg, cfg.color, cfg.border
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                    {experiment.status}
                  </span>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Deployed</p>
                  {experiment.deployed ? (
                    <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <span className="text-[14px] font-medium text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ⑧ What Happened */}
          {!isLoadingDetails && experiment.whatHappened && (
            <div>
              <SectionLabel>What Happened &amp; What We Learned</SectionLabel>
              <p className="text-[13px] text-foreground leading-relaxed">{experiment.whatHappened}</p>
            </div>
          )}

          {/* ⑨ Next Steps */}
          {!isLoadingDetails && experiment.nextSteps && (
            <div>
              <SectionLabel>Next Steps</SectionLabel>
              <p className="text-[13px] text-foreground leading-relaxed">{experiment.nextSteps}</p>
            </div>
          )}

          {/* ⑩ Results Breakdown image + video */}
          {isLoadingDetails ? (
            <div>
              <Shimmer className="h-2.5 w-28 mb-2.5" />
              <Shimmer className="h-52 w-full rounded-xl" />
            </div>
          ) : hasResultData ? (
            <div>
              <SectionLabel>Results Breakdown</SectionLabel>
              <div className="rounded-xl border border-border overflow-hidden bg-accent/30">
                {experiment.resultImage ? (
                  <img
                    src={experiment.resultImage}
                    alt="Results breakdown"
                    className="w-full max-h-64 object-contain"
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center">
                    <span className="text-[11px] text-muted-foreground">No image</span>
                  </div>
                )}
              </div>
              {experiment.resultVideo && (
                <div className="mt-3">
                  <a
                    href={experiment.resultVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-[12px] font-semibold transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Watch Results Video
                  </a>
                </div>
              )}
            </div>
          ) : null}

          {/* ─── Variants Breakdown ────────────────────────────────────────── */}
          {experiment.variantData && experiment.variantData.length > 0 && (
            <div>
              <SectionLabel>Variants Breakdown</SectionLabel>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">Variant</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">Traffic</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">Visitors</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">Conv.</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">CR %</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">RPV</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {experiment.variantData.map((v, i) => {
                      const cr = v.crPercent ?? v.cr ?? 0
                      return (
                        <tr key={i} className="border-b last:border-0 border-border hover:bg-accent/30 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-foreground">{v.name}</td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{v.trafficPercent ?? 50}%</td>
                          <td className="px-3 py-2.5 text-center text-foreground tabular-nums">{v.visitors.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-center text-foreground tabular-nums">{v.conversions.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums">
                            <span className="text-foreground">{cr.toFixed(2)}%</span>
                            {v.crImprovement !== 0 && (
                              <span className={cn("ml-1 text-[10px]", v.crImprovement > 0 ? "text-emerald-600" : "text-rose-500")}>
                                {v.crImprovement > 0 ? "+" : ""}{v.crImprovement.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums">
                            <span className="text-foreground">${v.rpv.toFixed(2)}</span>
                            {v.rpvImprovement !== 0 && (
                              <span className={cn("ml-1 text-[10px]", v.rpvImprovement > 0 ? "text-emerald-600" : "text-rose-500")}>
                                {v.rpvImprovement > 0 ? "+" : ""}{v.rpvImprovement.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-foreground tabular-nums">
                            ${v.revenue.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
