"use client"

import { useState, useMemo } from "react"
import {
  X, ExternalLink, CheckCircle2, XCircle, Loader2,
  Calendar, User, Monitor, Link2, Layers, Zap,
  AlertTriangle, Eye, StopCircle, Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"
import type { ScheduleTask } from "@/components/team-member/upcoming-tasks-table"

// ─── Department config ────────────────────────────────────────────────────────

const DEPT_CFG: Record<string, {
  strip: string
  badge: string
  accentBorder: string
  btn: string
  btnHover: string
}> = {
  Design: {
    strip: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 border border-sky-500/20",
    accentBorder: "border-l-sky-400",
    btn: "bg-sky-600",
    btnHover: "hover:bg-sky-700",
  },
  Development: {
    strip: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-700 border border-violet-500/20",
    accentBorder: "border-l-violet-400",
    btn: "bg-violet-600",
    btnHover: "hover:bg-violet-700",
  },
  QA: {
    strip: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
    accentBorder: "border-l-amber-400",
    btn: "bg-amber-600",
    btnHover: "hover:bg-amber-700",
  },
  Strategy: {
    strip: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
    accentBorder: "border-l-emerald-400",
    btn: "bg-emerald-600",
    btnHover: "hover:bg-emerald-700",
  },
  Management: {
    strip: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-700 border border-rose-500/20",
    accentBorder: "border-l-rose-400",
    btn: "bg-rose-600",
    btnHover: "hover:bg-rose-700",
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AirtableExp {
  id: string
  testDescription: string
  placement: string
  placementUrl: string
  devices: string
  mediaLinks: string
  designBrief: string
  devBrief: string
  figmaUrl: string
  walkthroughUrl: string
  feedbackStatus: string | null
  convertId: string
}

interface AirtableVariant {
  id: string
  variantName: string
  experimentName: string
  previewUrl: string
  traffic: string
}

interface DesignExpState {
  figmaUrl: string
  saving: boolean
  saved: boolean
}

interface QAExpState {
  result: "pass" | "fail" | null
  reportUrl: string
  reportText: string
  saving: boolean
  saved: boolean
}

interface DevConvertState {
  convertId: string
  saving: boolean
  saved: boolean
}

interface TaskModalProps {
  task: ScheduleTask
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ds?: string) {
  if (!ds) return "—"
  if (/^\d{4}-\d{2}-\d{2}/.test(ds)) {
    const [y, m, d] = ds.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    })
  }
  return ds
}

function InfoChip({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-[12px] text-foreground">{value || "—"}</p>
      </div>
    </div>
  )
}

function BriefBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null
  const isUrl = /^https?:\/\//.test(value.trim())
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-sky-600 hover:text-sky-700 font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Video Brief
        </a>
      ) : (
        <p className="text-[13px] text-foreground/80 leading-relaxed bg-muted/40 rounded-lg p-3 border border-border">
          {value}
        </p>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function TaskModal({ task, onClose }: TaskModalProps) {
  const { user } = useUser()
  const dept = task.department || "Development"
  const cfg = DEPT_CFG[dept] ?? DEPT_CFG.Development

  // A task is overdue when its derived status is "Overdue"
  const isOverdue = task.status === 'Overdue'

  // "Tests Running" = task with title matching or department "Test Running"
  const isTestsRunning = (task.teamFacingName || task.title) === "Tests Running"
    || task.department === "Test Running"

  // Fetch experiments linked to this batch
  const filterExtra = task.batchRecordId
    ? `FIND("${task.batchRecordId}", CONCATENATE({Batch Record ID})) > 0`
    : undefined

  const { data: rawExps, isLoading: expsLoading } = useAirtable<Record<string, unknown>>(
    "experiments",
    {
      fields: [
        "Test Description", "Placement", "Placement URL", "Devices", "Media/Links",
        "Design Brief", "Development Brief", "FIGMA Url", "Walkthrough Video URL",
        "Feedback Status", "Convert Experiment ID", "Batch Record ID",
      ],
      filterExtra,
      enabled: !!task.batchRecordId,
    }
  )

  // Fetch variants for QA
  const variantFilter = task.batchRecordId
    ? `FIND("${task.batchRecordId}", CONCATENATE({Batch Record ID (from Experiments)})) > 0`
    : undefined

  const { data: rawVariants, isLoading: variantsLoading } = useAirtable<Record<string, unknown>>(
    "variants",
    {
      fields: ["Variant Name", "Test Description (from Experiments)", "Preview URL", "Traffic %"],
      filterExtra: variantFilter,
      enabled: !!task.batchRecordId && dept === "QA",
    }
  )

  const experiments = useMemo<AirtableExp[]>(() => {
    return (rawExps ?? []).map(r => {
      const f = r.fields as Record<string, unknown>
      const devicesRaw = f["Devices"]
      const devices = Array.isArray(devicesRaw)
        ? (devicesRaw as string[]).join(", ")
        : (devicesRaw as string) ?? ""
      return {
        id: r.id,
        testDescription: (f["Test Description"] as string) ?? "",
        placement: (f["Placement"] as string) ?? "",
        placementUrl: (f["Placement URL"] as string) ?? "",
        devices,
        mediaLinks: (f["Media/Links"] as string) ?? "",
        designBrief: (f["Design Brief"] as string) ?? "",
        devBrief: (f["Development Brief"] as string) ?? "",
        figmaUrl: (f["FIGMA Url"] as string) ?? "",
        walkthroughUrl: (f["Walkthrough Video URL"] as string) ?? "",
        feedbackStatus:
          typeof f["Feedback Status"] === "string" ? (f["Feedback Status"] as string) : null,
        convertId: (f["Convert Experiment ID"] as string) ?? "",
      }
    })
  }, [rawExps])

  // Group variants by experiment name
  const variantsByExp = useMemo<Record<string, AirtableVariant[]>>(() => {
    const map: Record<string, AirtableVariant[]> = {}
    for (const r of rawVariants ?? []) {
      const f = r.fields as Record<string, unknown>
      const expNameRaw = f["Test Description (from Experiments)"]
      const expName = Array.isArray(expNameRaw)
        ? (expNameRaw[0] as string) ?? ""
        : (expNameRaw as string) ?? ""
      const v: AirtableVariant = {
        id: r.id,
        variantName: (f["Variant Name"] as string) ?? "Untitled Variant",
        experimentName: expName,
        previewUrl: (f["Preview URL"] as string) ?? "",
        traffic: (f["Traffic %"] as string) ?? "",
      }
      if (!map[expName]) map[expName] = []
      map[expName].push(v)
    }
    return map
  }, [rawVariants])

  // Auth headers for PATCH
  const authHeaders: Record<string, string> = user
    ? {
        "Content-Type": "application/json",
        "x-user-role": user.role,
        "x-user-id": user.id,
        "x-user-name": user.name,
        ...(user.clientId ? { "x-client-id": user.clientId } : {}),
      }
    : { "Content-Type": "application/json" }

  // ── Design state ──────────────────────────────────────────────────────────
  const [designState, setDesignState] = useState<Record<string, DesignExpState>>({})

  function getDesignState(id: string, exp: AirtableExp): DesignExpState {
    return designState[id] ?? { figmaUrl: exp.figmaUrl ?? "", saving: false, saved: false }
  }

  async function handleDesignSubmit(exp: AirtableExp) {
    const state = getDesignState(exp.id, exp)
    setDesignState(prev => ({ ...prev, [exp.id]: { ...state, saving: true } }))
    try {
      await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields: { "FIGMA Url": state.figmaUrl } }),
      })
      setDesignState(prev => ({ ...prev, [exp.id]: { ...state, saving: false, saved: true } }))
    } catch {
      setDesignState(prev => ({ ...prev, [exp.id]: { ...state, saving: false } }))
    }
  }

  // ── Dev Convert ID state ──────────────────────────────────────────────────
  const [devConvertState, setDevConvertState] = useState<Record<string, DevConvertState>>({})

  function getDevConvertState(id: string, exp: AirtableExp): DevConvertState {
    return devConvertState[id] ?? { convertId: exp.convertId ?? "", saving: false, saved: false }
  }

  async function handleDevConvertSubmit(exp: AirtableExp) {
    const state = getDevConvertState(exp.id, exp)
    setDevConvertState(prev => ({ ...prev, [exp.id]: { ...state, saving: true } }))
    try {
      await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields: { "Convert Experiment ID": state.convertId } }),
      })
      setDevConvertState(prev => ({ ...prev, [exp.id]: { ...state, saving: false, saved: true } }))
    } catch {
      setDevConvertState(prev => ({ ...prev, [exp.id]: { ...state, saving: false } }))
    }
  }

  // ── Notify Strategy state (Design dept) ───────────────────────────────────
  const [notifyStrategyLoading, setNotifyStrategyLoading] = useState(false)
  const [notifyStrategyDone, setNotifyStrategyDone] = useState(false)

  const allDesignReady = dept === "Design" && experiments.length > 0 && experiments.every(exp => {
    const state = designState[exp.id]
    return state?.saved || (!state && !!exp.figmaUrl)
  })

  async function handleNotifyStrategy() {
    setNotifyStrategyLoading(true)
    try {
      // TODO: wire up actual notify webhook to ping strategy team
      console.log("[TaskModal] Notify strategy — design complete for batch:", task.batchRecordId)
      setNotifyStrategyDone(true)
    } catch {
      // silent
    } finally {
      setNotifyStrategyLoading(false)
    }
  }

  // ── Dev state ─────────────────────────────────────────────────────────────
  const [devSaving, setDevSaving] = useState(false)
  const [devSaved, setDevSaved] = useState(false)

  async function handleDevComplete() {
    setDevSaving(true)
    try {
      await fetch(`/api/airtable/tasks/${task.taskId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields: { Status: "Complete" } }),
      })
      setDevSaved(true)
    } catch {
      // silent
    } finally {
      setDevSaving(false)
    }
  }

  // ── QA state ──────────────────────────────────────────────────────────────
  const [qaState, setQAState] = useState<Record<string, QAExpState>>({})

  function getQAState(id: string): QAExpState {
    return qaState[id] ?? { result: null, reportUrl: "", reportText: "", saving: false, saved: false }
  }

  async function handleQASubmit(exp: AirtableExp) {
    const state = getQAState(exp.id)
    if (!state.result) return
    setQAState(prev => ({ ...prev, [exp.id]: { ...state, saving: true } }))
    try {
      const fields: Record<string, unknown> = {
        "Feedback Status": state.result === "pass" ? "QA Approved" : "QA Rejected",
      }
      if (state.result === "fail" && state.reportUrl) {
        fields["Walkthrough Video URL"] = state.reportUrl
      }
      await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      setQAState(prev => ({ ...prev, [exp.id]: { ...state, saving: false, saved: true } }))
    } catch {
      setQAState(prev => ({ ...prev, [exp.id]: { ...state, saving: false } }))
    }
  }

  // ── Launch Tests state ────────────────────────────────────────────────────
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)

  // ── End Tests Early state ─────────────────────────────────────────────────
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)
  const [ended, setEnded] = useState(false)

  async function handleLaunchTests() {
    setLaunching(true)
    try {
      // TODO: wire up actual launch webhook
      console.log("[TaskModal] Launch tests for batch:", task.batchRecordId)
      setLaunched(true)
      setShowLaunchConfirm(false)
    } catch {
      // silent
    } finally {
      setLaunching(false)
    }
  }

  async function handleEndTests() {
    setEnding(true)
    try {
      // TODO: wire up actual stop webhook
      console.log("[TaskModal] End tests early for batch:", task.batchRecordId)
      setEnded(true)
      setShowEndConfirm(false)
    } catch {
      // silent
    } finally {
      setEnding(false)
    }
  }

  // ── Tests Running — dedicated modal ──────────────────────────────────────
  if (isTestsRunning) {
    // Launch confirmation dialog
    if (showLaunchConfirm) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">Confirm Launch</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    This will fire all {experiments.length} experiment{experiments.length !== 1 ? "s" : ""} live in Convert.
                    Make sure QA has been completed before proceeding.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setShowLaunchConfirm(false)}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchTests}
                disabled={launching}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {launching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {launching ? "Launching…" : "Confirm Launch"}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // End tests confirmation dialog
    if (showEndConfirm) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <StopCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">End Tests Early?</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    This will stop all {experiments.length} running experiment{experiments.length !== 1 ? "s" : ""} in Convert immediately.
                    Results may not be statistically significant. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndTests}
                disabled={ending}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {ending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {ending ? "Ending…" : "End Tests Early"}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg overflow-hidden">
          <div className="h-1.5 bg-emerald-500" />
          <div className="px-6 py-5 flex items-start justify-between border-b border-border">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold mb-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                Development
              </span>
              <h2 className="text-[15px] font-semibold text-foreground">Tests Running</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">{task.client}</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="px-6 py-3 border-b border-border bg-muted/20 flex flex-wrap gap-5">
            <InfoChip icon={Calendar} label="End Date" value={formatDate(task.dueDate)} />
            {task.assigned && <InfoChip icon={User} label="Assigned To" value={task.assigned} />}
          </div>

          <div className="px-6 py-5 space-y-4">
            {ended ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold">
                <StopCircle className="h-4 w-4" />
                Tests ended early. Data collection stopped.
              </div>
            ) : launched ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Tests launched successfully! Collecting data in Convert.
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-[13px] font-semibold">
                <div className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                Tests are live and collecting data.
              </div>
            )}

            {expsLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading experiments…
              </div>
            ) : (
              <div className="space-y-2">
                {experiments.map(exp => (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-accent/20"
                  >
                    <div className={cn("h-2 w-2 rounded-full shrink-0", ended ? "bg-rose-400" : "bg-teal-500 animate-pulse")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {exp.testDescription || "Untitled Experiment"}
                      </p>
                      {exp.placement && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{exp.placement}</p>
                      )}
                    </div>
                    {exp.convertId && (
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {exp.convertId}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!ended && !launched && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowLaunchConfirm(true)}
                  disabled={expsLoading}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Zap className="h-4 w-4" />
                  Launch Tests
                </button>
                <button
                  onClick={() => setShowEndConfirm(true)}
                  disabled={expsLoading}
                  className="h-11 px-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 hover:bg-rose-100 disabled:opacity-60"
                >
                  <StopCircle className="h-4 w-4" />
                  End Early
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Standard task modal ───────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">

        {/* Colored accent strip — red when overdue */}
        <div className={cn("h-1.5 shrink-0", isOverdue ? "bg-rose-500" : cfg.strip)} />

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={cn("inline-block px-2 py-0.5 rounded text-[11px] font-semibold", cfg.badge)}>
                {dept}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-300">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </span>
              )}
            </div>
            <h2 className="text-[15px] font-semibold text-foreground leading-tight">
              {task.teamFacingName || task.title}
            </h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{task.client}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Overdue alert banner */}
        {isOverdue && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
            <p className="text-[12px] font-medium text-rose-700">
              This task is past its due date. Once it's been completed, mark it as Done using the button below.
            </p>
          </div>
        )}

        {/* Info bar */}
        <div className={cn("px-6 py-3 border-b border-border flex flex-wrap gap-5 shrink-0", isOverdue ? "bg-rose-50/50" : "bg-muted/20")}>
          <div className="flex items-start gap-2">
            <Calendar className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", isOverdue ? "text-rose-500" : "text-muted-foreground")} />
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Due Date</p>
              <p className={cn("text-[12px] font-medium", isOverdue ? "text-rose-600" : "text-foreground")}>
                {formatDate(task.dueDate)}
              </p>
            </div>
          </div>
          {task.startDate && <InfoChip icon={Calendar} label="Start Date" value={formatDate(task.startDate)} />}
          {task.assigned && <InfoChip icon={User} label="Assigned To" value={task.assigned} />}
          {task.openUrl && (
            <div className="flex items-start gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Airtable Record</p>
                <a
                  href={task.openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-sky-600 hover:text-sky-700"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Experiment list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {expsLoading ? (
            <div className="flex items-center justify-center py-16 text-[13px] text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading experiments…
            </div>
          ) : experiments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-medium text-foreground">No experiments linked</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                This task has no batch or the batch has no experiments attached yet.
              </p>
            </div>
          ) : (
            experiments.map(exp => (
              <ExperimentCard
                key={exp.id}
                exp={exp}
                dept={dept}
                cfg={cfg}
                variants={variantsByExp[exp.testDescription] ?? []}
                variantsLoading={variantsLoading}
                designState={getDesignState(exp.id, exp)}
                onDesignChange={updates =>
                  setDesignState(prev => ({
                    ...prev,
                    [exp.id]: { ...getDesignState(exp.id, exp), ...updates },
                  }))
                }
                onDesignSubmit={() => handleDesignSubmit(exp)}
                devConvertState={getDevConvertState(exp.id, exp)}
                onDevConvertChange={updates =>
                  setDevConvertState(prev => ({
                    ...prev,
                    [exp.id]: { ...getDevConvertState(exp.id, exp), ...updates },
                  }))
                }
                onDevConvertSubmit={() => handleDevConvertSubmit(exp)}
                qaState={getQAState(exp.id)}
                onQAChange={updates =>
                  setQAState(prev => ({
                    ...prev,
                    [exp.id]: { ...getQAState(exp.id), ...updates },
                  }))
                }
                onQASubmit={() => handleQASubmit(exp)}
              />
            ))
          )}

          {/* Dev — mark complete sits below experiment cards */}
          {dept === "Development" && !expsLoading && experiments.length > 0 && (() => {
            const allIdsSaved = experiments.every(exp => getDevConvertState(exp.id, exp).saved)
            return (
              <div className="pt-1 space-y-2">
                {!allIdsSaved && (
                  <p className="text-[12px] text-amber-600 font-medium flex items-center gap-1.5 px-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Save all Convert Experiment IDs before marking complete.
                  </p>
                )}
                {devSaved ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-[13px] font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Task marked as complete!
                  </div>
                ) : (
                  <button
                    onClick={handleDevComplete}
                    disabled={devSaving || !allIdsSaved}
                    className={cn(
                      "w-full h-10 rounded-xl text-white font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed",
                      cfg.btn, cfg.btnHover
                    )}
                  >
                    {devSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {devSaving ? "Saving…" : "Mark Task Complete"}
                  </button>
                )}
              </div>
            )
          })()}

          {/* Design — Notify Strategy button sits below experiment cards */}
          {dept === "Design" && !expsLoading && experiments.length > 0 && (
            <div className="pt-1">
              {notifyStrategyDone ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-[13px] font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Strategy team notified!
                </div>
              ) : (
                <button
                  onClick={handleNotifyStrategy}
                  disabled={!allDesignReady || notifyStrategyLoading}
                  title={!allDesignReady ? "Submit all Figma URLs first to unlock this button" : undefined}
                  className={cn(
                    "w-full h-10 rounded-xl font-semibold text-[13px] transition-colors flex items-center justify-center gap-2",
                    allDesignReady
                      ? "bg-sky-600 hover:bg-sky-700 text-white"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  )}
                >
                  {notifyStrategyLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                  {notifyStrategyLoading ? "Notifying…" : "Notify Strategy"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <p className="text-[12px] text-muted-foreground">
            {experiments.length} experiment{experiments.length !== 1 ? "s" : ""} in this batch
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Experiment Card ──────────────────────────────────────────────────────────

interface ExpCardProps {
  exp: AirtableExp
  dept: string
  cfg: (typeof DEPT_CFG)[string]
  variants: AirtableVariant[]
  variantsLoading: boolean
  designState: DesignExpState
  onDesignChange: (u: Partial<DesignExpState>) => void
  onDesignSubmit: () => void
  devConvertState: DevConvertState
  onDevConvertChange: (u: Partial<DevConvertState>) => void
  onDevConvertSubmit: () => void
  qaState: QAExpState
  onQAChange: (u: Partial<QAExpState>) => void
  onQASubmit: () => void
}

function ExperimentCard({
  exp, dept, cfg,
  variants, variantsLoading,
  designState, onDesignChange, onDesignSubmit,
  devConvertState, onDevConvertChange, onDevConvertSubmit,
  qaState, onQAChange, onQASubmit,
}: ExpCardProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Card header */}
      <div
        className={cn(
          "px-4 py-3 border-b border-border bg-muted/10 flex items-center justify-between border-l-4",
          cfg.accentBorder
        )}
      >
        <h3 className="text-[13px] font-semibold text-foreground">
          {exp.testDescription || "Untitled Experiment"}
        </h3>
        {exp.convertId && (
          <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
            {exp.convertId}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-4">

        {/* Common metadata grid */}
        <div className="grid grid-cols-2 gap-3">
          {exp.placement && (
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Placement</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-foreground">{exp.placement}</span>
                {exp.placementUrl && (
                  <a
                    href={exp.placementUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-500 hover:text-sky-600 shrink-0"
                    title="Open placement URL"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
          {exp.devices && (
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Devices</p>
              <div className="flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[13px] text-foreground">{exp.devices}</span>
              </div>
            </div>
          )}
        </div>

        {exp.mediaLinks && (
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Media / Links</p>
            <a
              href={exp.mediaLinks}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] text-sky-600 hover:text-sky-700 font-medium"
            >
              <Link2 className="h-3.5 w-3.5" />
              Open Media
            </a>
          </div>
        )}

        {/* ── DESIGN ─────────────────────────────────────────────────────────── */}
        {dept === "Design" && (
          <>
            <BriefBlock label="Design Brief" value={exp.designBrief} />

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                Submit Figma URL
              </label>
              {designState.saved ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Figma URL saved successfully
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={designState.figmaUrl}
                    onChange={e => onDesignChange({ figmaUrl: e.target.value, saved: false })}
                    placeholder="https://figma.com/file/..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                  <button
                    onClick={onDesignSubmit}
                    disabled={!designState.figmaUrl || designState.saving}
                    className={cn(
                      "px-4 rounded-lg text-white text-[13px] font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50",
                      cfg.btn, cfg.btnHover
                    )}
                  >
                    {designState.saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {designState.saving ? "Saving…" : "Submit"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── DEVELOPMENT ────────────────────────────────────────────────────── */}
        {dept === "Development" && (
          <>
            {exp.figmaUrl && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Figma Mockup</p>
                <a
                  href={exp.figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-violet-600 hover:text-violet-700 font-semibold"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Open Figma Design
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <BriefBlock label="Development Brief" value={exp.devBrief} />
            {exp.walkthroughUrl && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Walkthrough Video</p>
                <a
                  href={exp.walkthroughUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-sky-600 hover:text-sky-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Watch Walkthrough
                </a>
              </div>
            )}

            {/* Convert Experiment ID */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                Convert Experiment ID
              </label>
              {devConvertState.saved ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-[12px] font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved: {devConvertState.convertId}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={devConvertState.convertId}
                    onChange={e => onDevConvertChange({ convertId: e.target.value, saved: false })}
                    placeholder="e.g. 1002386"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono"
                  />
                  <button
                    onClick={onDevConvertSubmit}
                    disabled={!devConvertState.convertId || devConvertState.saving}
                    className={cn(
                      "px-4 rounded-lg text-white text-[13px] font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50",
                      cfg.btn, cfg.btnHover
                    )}
                  >
                    {devConvertState.saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {devConvertState.saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── QA ─────────────────────────────────────────────────────────────── */}
        {dept === "QA" && (
          <>
            {exp.figmaUrl && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Figma Mockup</p>
                <a
                  href={exp.figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-sky-600 hover:text-sky-700 font-semibold"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Open Figma Design
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <BriefBlock label="Design Brief" value={exp.designBrief} />
            <BriefBlock label="Development Brief" value={exp.devBrief} />

            {/* Variants section */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Variants to Review
              </p>
              {variantsLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading variants…
                </div>
              ) : variants.length === 0 ? (
                <p className="text-[12px] text-muted-foreground italic">No variants found for this experiment.</p>
              ) : (
                <div className="space-y-2">
                  {variants.map(v => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/10"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-[13px] font-medium text-foreground truncate">{v.variantName}</span>
                        {v.traffic && (
                          <span className="text-[11px] text-muted-foreground shrink-0">{v.traffic}% traffic</span>
                        )}
                      </div>
                      {v.previewUrl ? (
                        <a
                          href={v.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 ml-3 inline-flex items-center gap-1 text-[12px] text-amber-600 hover:text-amber-700 font-medium"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-3">No preview</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pass / Fail */}
            {qaState.saved ? (
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg text-[13px] font-semibold border",
                  qaState.result === "pass"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                )}
              >
                {qaState.result === "pass" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {qaState.result === "pass"
                  ? "Approved for launch"
                  : "Marked as failing — report submitted"}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">QA Result</p>
                <div className="flex gap-2">
                  {/* Pass — always green */}
                  <button
                    onClick={() => onQAChange({ result: "pass", reportUrl: "", reportText: "" })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-[13px] font-semibold transition-colors",
                      qaState.result === "pass"
                        ? "bg-emerald-100 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200"
                        : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Pass
                  </button>
                  {/* Fail — always red */}
                  <button
                    onClick={() => onQAChange({ result: "fail" })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-[13px] font-semibold transition-colors",
                      qaState.result === "fail"
                        ? "bg-rose-100 border-rose-500 text-rose-700 ring-2 ring-rose-200"
                        : "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
                    )}
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Fail
                  </button>
                </div>

                {qaState.result === "fail" && (
                  <div className="space-y-3 p-4 rounded-lg border border-rose-200 bg-rose-50/40">
                    <p className="text-[12px] text-rose-600 font-semibold">
                      Provide a failure report — video URL or written description:
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground block">
                        Report Video URL (Loom, etc.)
                      </label>
                      <input
                        type="url"
                        value={qaState.reportUrl}
                        onChange={e => onQAChange({ reportUrl: e.target.value })}
                        placeholder="https://loom.com/share/..."
                        className="w-full px-3 py-2 rounded-lg border border-rose-200 bg-white text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground block">
                        Written Report
                      </label>
                      <textarea
                        value={qaState.reportText}
                        onChange={e => onQAChange({ reportText: e.target.value })}
                        placeholder="Describe the issues found, steps to reproduce, and expected vs. actual behavior…"
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-rose-200 bg-white text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-400/30 resize-none"
                      />
                    </div>
                  </div>
                )}

                {qaState.result && (
                  <button
                    onClick={onQASubmit}
                    disabled={
                      qaState.saving ||
                      (qaState.result === "fail" && !qaState.reportUrl && !qaState.reportText)
                    }
                    className={cn(
                      "w-full h-9 rounded-lg text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
                      cfg.btn, cfg.btnHover
                    )}
                  >
                    {qaState.saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {qaState.saving ? "Submitting…" : "Submit QA Result"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
