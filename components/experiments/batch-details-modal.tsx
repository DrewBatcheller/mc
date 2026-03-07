"use client"

import { useEffect } from "react"
import { X, Calendar, FlaskConical, TrendingUp, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import type { AirtableRecord } from "@/lib/types"

// Safe formatter: strips ISO time to avoid UTC→local day shift on midnight-UTC Airtable dates
function formatDateSafe(raw: string): string {
  const ymd = raw.split('T')[0]
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return raw
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${months[+m[2]-1]} ${+m[3]}, ${m[1]}`
}

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  Successful:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Unsuccessful:  { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200"    },
  Inconclusive:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  Live:          { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200"     },
  "In Progress": { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200"     },
  Pending:       { bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200"    },
  Design:        { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200"     },
  QA:            { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  Launch:        { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
}

const accentStrip: Record<string, string> = {
  Successful:    "bg-emerald-500",
  Unsuccessful:  "bg-rose-400",
  Inconclusive:  "bg-amber-400",
  Live:          "bg-sky-500",
  "In Progress": "bg-sky-400",
  Pending:       "bg-gray-300",
  Design:        "bg-sky-500",
  QA:            "bg-amber-400",
  Launch:        "bg-emerald-500",
}

interface Props {
  isOpen: boolean
  batch: AirtableRecord | null
  onClose: () => void
}

export function BatchDetailsModal({ isOpen, batch, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  // Try linked record IDs first; fall back to filtering experiments by their Batch field
  const rawExpIds = batch?.fields['Experiments Attached']
  const experimentIds: string[] = Array.isArray(rawExpIds) ? (rawExpIds as string[]) : []
  const batchId = batch?.id ?? ''

  // Primary: filter by record IDs from linked field
  const idFilter = experimentIds.length === 1
    ? `RECORD_ID() = "${experimentIds[0]}"`
    : experimentIds.length > 1
      ? `OR(${experimentIds.map(id => `RECORD_ID() = "${id}"`).join(', ')})`
      : undefined

  // Fallback: find experiments whose Batch linked field contains this batch record ID
  const batchRefFilter = !idFilter && batchId
    ? `FIND("${batchId}", ARRAYJOIN({Batch})) > 0`
    : undefined

  const expFilter = idFilter ?? batchRefFilter

  const { data: experiments, isLoading: expsLoading } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Revenue Added (MRR)'],
    filterExtra: expFilter,
    enabled: !!expFilter && isOpen,
  })

  if (!isOpen || !batch) return null

  const f = batch.fields
  const batchKey   = String(f['Batch Key']   ?? 'Batch')
  const clientArr  = f['Brand Name']
  const client     = Array.isArray(clientArr) ? String(clientArr[0] ?? '') : String(clientArr ?? '')
  const allStatus  = f['All Tests Status'] ? String(f['All Tests Status']) : null
  const launchDate = f['Launch Date']
    ? formatDateSafe(String(f['Launch Date']))
    : null
  const revenue    = f['Revenue Added (MRR)'] ? String(f['Revenue Added (MRR)']) : null

  const cfg   = allStatus ? (statusConfig[allStatus] ?? statusConfig.Pending) : statusConfig.Pending
  const strip = allStatus ? (accentStrip[allStatus] ?? "bg-gray-300") : "bg-sky-500"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[calc(100vh-4rem)] overflow-y-auto mx-4">
        {/* Accent strip */}
        <div className={cn("h-1.5 rounded-t-2xl", strip)} />

        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 mt-0.5">
                <FlaskConical className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground leading-tight">{batchKey}</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">{client}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {allStatus && (
              <span className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                cfg.bg, cfg.text, cfg.border
              )}>
                {allStatus}
              </span>
            )}
            {launchDate && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-muted/50 text-muted-foreground border-border">
                <Calendar className="h-3 w-3" />
                {launchDate}
              </span>
            )}
            {revenue && revenue !== "$0" && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                <TrendingUp className="h-3 w-3" />
                {revenue}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Experiments list */}
          <div>
            <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Tests in this batch
            </h3>

            {expsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (experiments ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-4">
                No experiments linked to this batch yet
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
                {(experiments ?? []).map(exp => {
                  const name      = String(exp.fields['Test Description'] ?? 'Untitled')
                  const expStatus = exp.fields['Test Status'] ? String(exp.fields['Test Status']) : null
                  const placement = exp.fields['Placement'] ? String(exp.fields['Placement']) : null
                  const expRev    = exp.fields['Revenue Added (MRR)'] ? String(exp.fields['Revenue Added (MRR)']) : null
                  const expCfg    = expStatus ? (statusConfig[expStatus] ?? statusConfig.Pending) : null

                  return (
                    <div key={exp.id} className="px-3.5 py-2.5 flex items-center gap-2.5 bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
                        {placement && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{placement}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {expRev && expRev !== "$0" && (
                          <span className="text-[12px] font-medium text-emerald-600 tabular-nums">{expRev}</span>
                        )}
                        {expCfg && expStatus && (
                          <span className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                            expCfg.bg, expCfg.text, expCfg.border
                          )}>
                            {expStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
