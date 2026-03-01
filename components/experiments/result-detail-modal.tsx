"use client"

import { useEffect } from "react"
import { X, CheckCircle2, XCircle, HelpCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const RESULT_IMG = "https://i.imgur.com/u50b3Yy.png"

type Status = "Successful" | "Unsuccessful" | "Inconclusive"

interface Result {
  name: string
  client: string
  status: Status
  revenueAdded: number
  placement: string
  device: string
  geos: string
  launchDate: string
  endDate: string
  rationale: string
  goals: string[]
  deployed: boolean
  controlLabel: string
  variantLabel: string
}

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; bg: string; border: string; dot: string }> = {
  Successful: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  Unsuccessful: { icon: XCircle, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500" },
  Inconclusive: { icon: HelpCircle, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
}

const accentStrip: Record<Status, string> = {
  Successful: "bg-emerald-500",
  Unsuccessful: "bg-rose-400",
  Inconclusive: "bg-amber-400",
}

const goalColors: Record<string, string> = {
  CVR: "bg-sky-100 text-sky-700 border-sky-200",
  ATC: "bg-violet-100 text-violet-700 border-violet-200",
  RPV: "bg-teal-100 text-teal-700 border-teal-200",
  AOV: "bg-amber-100 text-amber-700 border-amber-200",
}

function formatRevenue(n: number) {
  if (n === 0) return "$0.0K"
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

export function ResultDetailModal({ result, onClose }: { result: Result; onClose: () => void }) {
  const cfg = statusConfig[result.status]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = "" }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto mx-4">
        {/* Top accent */}
        <div className={cn("h-1.5 rounded-t-2xl", accentStrip[result.status])} />

        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground leading-tight">{result.name}</h2>
              <p className="text-[13px] text-muted-foreground mt-1">{result.client}</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* Test Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Test Details</h3>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[12px] text-muted-foreground font-medium">Rationale</span>
                <p className="text-[13px] text-foreground mt-1 leading-relaxed">{result.rationale}</p>
              </div>
              <div>
                <span className="text-[12px] text-muted-foreground font-medium">Primary Goals</span>
                <div className="flex gap-1.5 mt-1.5">
                  {result.goals.map((g) => (
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
              <div className="grid grid-cols-3 gap-4 mt-1">
                <div>
                  <span className="text-[12px] text-muted-foreground font-medium">Placement</span>
                  <p className="text-[13px] text-foreground mt-0.5">{result.placement}</p>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-medium">Devices</span>
                  <p className="text-[13px] text-foreground mt-0.5">{result.device}</p>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-medium">GEOs</span>
                  <p className="text-[13px] text-foreground mt-0.5">{result.geos}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Test Preview */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Test Preview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[12px] font-medium text-muted-foreground">Control</span>
                <p className="text-[12px] text-muted-foreground/70 mb-2">{result.controlLabel}</p>
                <div className="h-44 rounded-lg border border-border overflow-hidden bg-accent/30">
                  <img src={RESULT_IMG} alt="Control" className="h-full w-full object-cover object-top" />
                </div>
              </div>
              <div>
                <span className="text-[12px] font-medium text-muted-foreground">Variant</span>
                <p className="text-[12px] text-muted-foreground/70 mb-2">{result.variantLabel}</p>
                <div className="h-44 rounded-lg border border-border overflow-hidden bg-accent/30">
                  <img src={RESULT_IMG} alt="Variant" className="h-full w-full object-cover object-top" />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Test Duration */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Test Duration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[12px] text-muted-foreground font-medium">Launch Date</span>
                <p className="text-[13px] text-foreground mt-0.5">{result.launchDate}</p>
              </div>
              <div>
                <span className="text-[12px] text-muted-foreground font-medium">End Date</span>
                <p className="text-[13px] text-foreground mt-0.5">{result.endDate}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Result */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Result</h3>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex items-center justify-center h-12 w-12 rounded-xl border shrink-0",
                  cfg.bg,
                  cfg.border
                )}
              >
                <cfg.icon className={cn("h-6 w-6", cfg.color)} />
              </div>
              <div className="flex-1">
                <span className={cn("text-[13px] font-semibold", cfg.color)}>{result.status}</span>
                {result.revenueAdded > 0 && (
                  <p className="text-[13px] text-foreground mt-1">
                    Revenue Added: <span className="font-semibold text-emerald-600">{formatRevenue(result.revenueAdded)}</span>
                  </p>
                )}
                {result.deployed && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 border border-emerald-200">
                      <Check className="h-3 w-3 text-emerald-700" />
                    </div>
                    <span className="text-[12px] text-emerald-700 font-medium">Deployed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
