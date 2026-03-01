"use client"

import { useState, useEffect } from "react"
import { X, ExternalLink, Check, Play } from "lucide-react"
import { cn } from "@/lib/utils"

const RESULT_IMG = "https://i.imgur.com/u50b3Yy.png"

const goalColors: Record<string, string> = {
  CVR: "bg-sky-100 text-sky-700 border-sky-200",
  ATC: "bg-violet-100 text-violet-700 border-violet-200",
  RPV: "bg-teal-100 text-teal-700 border-teal-200",
  AOV: "bg-amber-100 text-amber-700 border-amber-200",
  "Bounce Rate": "bg-rose-100 text-rose-700 border-rose-200",
  "Session Depth": "bg-indigo-100 text-indigo-700 border-indigo-200",
}

const statusConfig: Record<string, { bg: string; color: string; border: string }> = {
  Successful: { bg: "bg-emerald-50", color: "text-emerald-700", border: "border-emerald-200" },
  Unsuccessful: { bg: "bg-rose-50", color: "text-rose-700", border: "border-rose-200" },
  Inconclusive: { bg: "bg-amber-50", color: "text-amber-700", border: "border-amber-200" },
  Live: { bg: "bg-sky-50", color: "text-sky-700", border: "border-sky-200" },
  Pending: { bg: "bg-gray-50", color: "text-gray-700", border: "border-gray-200" },
  "In Progress": { bg: "bg-sky-50", color: "text-sky-700", border: "border-sky-200" },
  Blocked: { bg: "bg-red-50", color: "text-red-700", border: "border-red-200" },
}

const accentStrip: Record<string, string> = {
  Successful: "bg-emerald-500",
  Unsuccessful: "bg-rose-400",
  Inconclusive: "bg-amber-400",
  Live: "bg-sky-500",
  Pending: "bg-gray-300",
  "In Progress": "bg-sky-400",
  Blocked: "bg-red-400",
}

function formatRevenue(v: string | undefined) {
  if (!v || v === "$0" || v === "-") return "$0.0K"
  const num = parseFloat(v.replace(/[$,]/g, ""))
  if (isNaN(num)) return v
  if (num >= 1000) return "$" + (num / 1000).toFixed(1) + "K"
  return "$" + num.toLocaleString()
}

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

export function ExperimentDetailsModal({
  isOpen,
  experiment,
  batchKey,
  onClose,
}: {
  isOpen: boolean
  experiment: Experiment | null
  batchKey?: string
  onClose: () => void
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

  const cfg = statusConfig[experiment.status] || statusConfig.Pending
  const strip = accentStrip[experiment.status] || "bg-gray-300"
  const goals = experiment.primaryGoals || []
  const deviceList = experiment.devices ? experiment.devices.split(",").map((d) => d.trim()) : []
  const geosList = experiment.geos ? experiment.geos.split(",").map((g) => g.trim()) : []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto mx-4">
        <div className={cn("h-1.5 rounded-t-2xl", strip)} />

        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground leading-tight">{experiment.name}</h2>
              {batchKey && <p className="text-[13px] text-muted-foreground mt-1">{batchKey}</p>}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-6">
            {/* Test Details */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Test Details</h3>
              <div className="flex flex-col gap-3">
                {experiment.rationale && (
                  <div>
                    <span className="text-[12px] text-muted-foreground font-medium">Rationale</span>
                    <p className="text-[13px] text-foreground mt-1 leading-relaxed">{experiment.rationale}</p>
                  </div>
                )}
                {experiment.hypothesis && (
                  <div>
                    <span className="text-[12px] text-muted-foreground font-medium">Hypothesis</span>
                    <p className="text-[13px] text-foreground mt-1 leading-relaxed">{experiment.hypothesis}</p>
                  </div>
                )}
                {goals.length > 0 && (
                  <div>
                    <span className="text-[12px] text-muted-foreground font-medium">Primary Goals</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {goals.map((g) => (
                        <span
                          key={g}
                          className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                            goalColors[g] || "bg-accent text-foreground border-border"
                          )}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 mt-1">
                  <div>
                    <span className="text-[12px] text-muted-foreground font-medium">Placement</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[13px] text-foreground">{experiment.placement}</p>
                      {experiment.placementUrl && (
                        <a
                          href={experiment.placementUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sky-600 hover:text-sky-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground font-medium">Devices</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {deviceList.length > 0 ? (
                        deviceList.map((d) => (
                          <span key={d} className="text-[11px] font-medium px-2 py-0.5 rounded-md border bg-accent/50 text-foreground border-border">
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="text-[13px] text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground font-medium">GEOs</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {geosList.length > 0 ? (
                        geosList.map((g) => (
                          <span key={g} className="text-[11px] font-medium px-2 py-0.5 rounded-md border bg-accent/50 text-foreground border-border">
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="text-[13px] text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Preview - Only show if experiment has deployed status or has results */}
            {(experiment.deployed !== undefined || experiment.revenueAddedMrr) && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Test Preview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[12px] font-medium text-muted-foreground">Control</span>
                      <p className="text-[12px] text-muted-foreground/70 mb-2">Original Page</p>
                      <div className="h-44 rounded-lg border border-border overflow-hidden bg-accent/30">
                        <img src={RESULT_IMG} alt="Control" className="h-full w-full object-cover object-top" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[12px] font-medium text-muted-foreground">Variant</span>
                      <p className="text-[12px] text-muted-foreground/70 mb-2">Variant Page</p>
                      <div className="h-44 rounded-lg border border-border overflow-hidden bg-accent/30">
                        <img src={RESULT_IMG} alt="Variant" className="h-full w-full object-cover object-top" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Test Duration - Only show if dates exist */}
            {(experiment.launchDate || experiment.endDate) && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Test Duration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {experiment.launchDate && (
                      <div>
                        <span className="text-[12px] text-muted-foreground font-medium">Launch Date</span>
                        <p className="text-[13px] text-foreground mt-0.5 tabular-nums">{experiment.launchDate}</p>
                      </div>
                    )}
                    {experiment.endDate && (
                      <div>
                        <span className="text-[12px] text-muted-foreground font-medium">End Date</span>
                        <p className="text-[13px] text-foreground mt-0.5 tabular-nums">{experiment.endDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Test Results - Only show if results data exists */}
            {(experiment.revenueAddedMrr || experiment.deployed !== undefined) && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Test Results</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-[12px] text-muted-foreground font-medium">Test Status</span>
                      <div className="mt-1.5">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", cfg.bg, cfg.color, cfg.border)}>
                          {experiment.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground font-medium">MRR Added</span>
                      <p className={cn(
                        "text-[15px] font-semibold mt-0.5 tabular-nums",
                        experiment.revenueAddedMrr && experiment.revenueAddedMrr !== "$0" ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        {formatRevenue(experiment.revenueAddedMrr)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[12px] text-muted-foreground font-medium">Deployed</span>
                      <div className="mt-1.5">
                        {experiment.deployed ? (
                          <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">--</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {experiment.whatHappened && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <span className="text-[12px] text-muted-foreground font-medium">What Happened</span>
                  <p className="text-[13px] text-foreground mt-1 leading-relaxed">{experiment.whatHappened}</p>
                </div>
              </>
            )}

            {experiment.nextSteps && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <span className="text-[12px] text-muted-foreground font-medium">Next Steps</span>
                  <p className="text-[13px] text-foreground mt-1 leading-relaxed">{experiment.nextSteps}</p>
                </div>
              </>
            )}

            {/* Results Breakdown - Only show if there are actual result data */}
            {(experiment.revenueAddedMrr || experiment.deployed !== undefined) && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <span className="text-[12px] text-muted-foreground font-medium">Results Breakdown (Image)</span>
                  <div className="mt-2 h-52 rounded-lg border border-border overflow-hidden bg-accent/30">
                    <img src={RESULT_IMG} alt="Results breakdown" className="h-full w-full object-contain" />
                  </div>
                </div>

                {/* Results Video */}
                <div>
                  <span className="text-[12px] text-muted-foreground font-medium">Results (Video)</span>
                  <div className="mt-2">
                    <button className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 text-[12px] font-medium transition-colors">
                      <Play className="h-3 w-3" />
                      Watch Video
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Variants Breakdown - Only show if variant data exists */}
            {experiment.variantData && experiment.variantData.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Variants Breakdown</h3>
                  <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2.5 text-left font-semibold text-foreground">Variant</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-foreground">Traffic</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-foreground">Visitors</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-foreground">Conv.</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-foreground">{"CR %"}</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-foreground">RPV</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-foreground">Revenue</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-foreground">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experiment.variantData.map((v, i) => {
                        const cr = v.crPercent ?? v.cr ?? 0
                        return (
                          <tr key={i} className="border-b last:border-0 border-border">
                            <td className="px-3 py-2.5 font-medium text-foreground">{v.name}</td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">{v.trafficPercent ?? 50}%</td>
                            <td className="px-3 py-2.5 text-center text-foreground tabular-nums">{v.visitors.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-center text-foreground tabular-nums">{v.conversions.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              <span className="text-foreground">{cr.toFixed(2)}%</span>
                              {v.crImprovement !== 0 && (
                                <span className={cn("ml-1 text-[10px]", v.crImprovement > 0 ? "text-emerald-600" : "text-rose-600")}>
                                  {v.crImprovement > 0 ? "+" : ""}{v.crImprovement.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              <span className="text-foreground">${v.rpv.toFixed(2)}</span>
                              {v.rpvImprovement !== 0 && (
                                <span className={cn("ml-1 text-[10px]", v.rpvImprovement > 0 ? "text-emerald-600" : "text-rose-600")}>
                                  {v.rpvImprovement > 0 ? "+" : ""}{v.rpvImprovement.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-foreground tabular-nums">${v.revenue.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Preview URL functionality will be added later
                                }}
                                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors ml-auto"
                                title="Preview Variant URL"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
