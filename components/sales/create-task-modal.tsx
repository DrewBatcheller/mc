"use client"

import { useState, useMemo } from "react"
import {
  X, Star, Loader2, Check, AlignLeft, Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"
import { SelectField } from "@/components/shared/select-field"
import {
  TeamMemberPicker, LinkedRecordPicker,
  type TeamMember, type LinkedRecord,
} from "./task-form-fields"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  call:     { label: "Call",      bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500"     },
  followup: { label: "Follow Up", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
  meeting:  { label: "Meeting",   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
}

const TYPE_AIRTABLE_VALUES: Record<string, string> = {
  call:     "Call",
  followup: "Follow Up",
  meeting:  "Meeting",
}

const TYPE_CYCLE: Array<"call" | "followup" | "meeting"> = ["call", "followup", "meeting"]

const STATUS_OPTIONS = ["Not Started", "In Progress", "Complete", "Cancelled"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Subtracts N business days from an ISO date string (YYYY-MM-DD).
 * Parses the date manually to avoid UTC timezone shifting.
 * Returns an ISO datetime string at 9:00 AM local time.
 */
function subtractBusinessDays(isoDate: string, days: number): string {
  const parts = isoDate.split("-")
  const date = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10),
    9, 0, 0
  )
  let remaining = days
  while (remaining > 0) {
    date.setDate(date.getDate() - 1)
    // Skip Saturday (6) and Sunday (0)
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining--
  }
  return date.toISOString()
}

function EditableStarRating({
  value,
  onChange,
  max = 3,
}: {
  value: number
  onChange: (v: number) => void
  max?: number
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
          className="h-4 w-4 flex items-center justify-center"
        >
          <Star
            className={cn(
              "h-3.5 w-3.5 transition-colors",
              i < value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/25 hover:text-amber-300"
            )}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
}: CreateTaskModalProps) {
  const { user } = useUser()

  const authHeaders: HeadersInit = useMemo(() => user ? {
    "x-user-role": user.role,
    "x-user-id":   user.id,
    "x-user-name": user.name,
    ...(user.clientId ? { "x-client-id": user.clientId } : {}),
  } : {}, [user])

  // ── Form state ────────────────────────────────────────────────────────────
  const [title,               setTitle]               = useState("")
  const [subtitle,            setSubtitle]            = useState("")
  const [type,                setType]                = useState<"call" | "followup" | "meeting">("followup")
  const [startDate,           setStartDate]           = useState("")
  const [dueDate,             setDueDate]             = useState("")
  const [status,              setStatus]              = useState("Not Started")
  const [assignedMembers,     setAssignedMembers]     = useState<TeamMember[]>([])
  const [linkType,            setLinkType]            = useState<"none" | "lead" | "client">("none")
  const [linkedRecord,        setLinkedRecord]        = useState<LinkedRecord | null>(null)
  const [createNotifications, setCreateNotifications] = useState(false)
  const [notifyBusinessDays,  setNotifyBusinessDays]  = useState(1)
  const [priority,            setPriority]            = useState(0)
  const [description,         setDescription]         = useState("")
  const [saving,              setSaving]              = useState(false)
  const [error,               setError]               = useState<string | null>(null)

  // ── Data fetching — always at top level, gated by `enabled` ──────────────
  const { data: teamData }    = useAirtable<{ "Full Name"?: string }>("team",    { fields: ["Full Name"],    enabled: isOpen })
  const { data: leadsData }   = useAirtable<{ "Full Name"?: string }>("leads",   { fields: ["Full Name"],    enabled: isOpen })
  const { data: clientsData } = useAirtable<{ "Brand Name"?: string }>("clients", { fields: ["Brand Name"], enabled: isOpen })

  const teamOptions: TeamMember[] = useMemo(() =>
    (teamData ?? [])
      .map(r => ({ id: r.id, name: String(r.fields["Full Name"] ?? "").trim() }))
      .filter(m => m.name),
    [teamData]
  )

  const leadsOptions: LinkedRecord[] = useMemo(() =>
    (leadsData ?? [])
      .map(r => ({ id: r.id, name: String(r.fields["Full Name"] ?? "").trim() }))
      .filter(r => r.name),
    [leadsData]
  )

  const clientsOptions: LinkedRecord[] = useMemo(() =>
    (clientsData ?? [])
      .map(r => ({ id: r.id, name: String(r.fields["Brand Name"] ?? "").trim() }))
      .filter(r => r.name),
    [clientsData]
  )

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle("")
    setSubtitle("")
    setType("followup")
    setStartDate("")
    setDueDate("")
    setStatus("Not Started")
    setAssignedMembers([])
    setLinkType("none")
    setLinkedRecord(null)
    setCreateNotifications(false)
    setNotifyBusinessDays(1)
    setPriority(0)
    setDescription("")
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Task name is required")
      return
    }
    setSaving(true)
    setError(null)

    try {
      const fields: Record<string, unknown> = {
        "Team Facing Name": title.trim(),
        "Type":             TYPE_AIRTABLE_VALUES[type] ?? type,
        "Department":       "Sales",
        "Status":           status,
        "Priority":         priority,
      }

      if (subtitle.trim())            fields["Client Facing Name"] = subtitle.trim()
      if (startDate)                  fields["Start Date"]         = startDate
      if (dueDate)                    fields["Due Date"]           = dueDate
      if (assignedMembers.length > 0) fields["Assigned to"]        = assignedMembers.map(m => m.name).join(", ")
      if (description.trim())         fields["Description"]        = description.trim()

      // Lead / Client — mutually exclusive linked fields
      if (linkType === "lead"   && linkedRecord) fields["Lead"]   = [linkedRecord.id]
      if (linkType === "client" && linkedRecord) fields["Client"] = [linkedRecord.id]

      const res = await fetch("/api/airtable/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body:    JSON.stringify({ fields }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Failed to create task")
      }

      // ── Create notifications for assigned team members ─────────────────────
      if (createNotifications && assignedMembers.length > 0 && startDate) {
        const displayTime = subtractBusinessDays(startDate, notifyBusinessDays)
        await Promise.allSettled(
          assignedMembers
            .filter(m => m.id)   // skip members with no resolved Airtable ID
            .map(m =>
              fetch("/api/airtable/notifications", {
                method:  "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body:    JSON.stringify({
                  fields: {
                    "Notification Title": `Upcoming: ${title.trim()}`,
                    "Team Member":        [m.id],
                    "Display Time":       displayTime,
                  },
                }),
              })
            )
        )
      }

      onTaskCreated()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const config = typeConfig[type] ?? typeConfig.followup

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-label="New Sales Task"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className={cn(
          "rounded-t-xl px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0 transition-colors",
          config.bg
        )}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0 transition-colors", config.dot)} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground leading-tight">New Sales Task</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Create a task for the sales calendar</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4 text-foreground/60" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Task name */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">
              Task Name <span className="text-red-400">*</span>
            </p>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate() }}
              placeholder="e.g. Follow up with Acme Corp"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Client Facing Name */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Client Facing Name</p>
            <input
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="External label (leave blank if internal)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Type + Priority + Status row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type — cycle through options on click */}
            <button
              type="button"
              onClick={() => {
                const idx = TYPE_CYCLE.indexOf(type)
                setType(TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length])
              }}
              title="Click to change type"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all",
                config.bg, config.text, config.border
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
              {config.label}
              <span className="text-[10px] opacity-40 ml-0.5">▾</span>
            </button>

            {/* Priority */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border bg-amber-50 border-amber-200 text-amber-700">
              <EditableStarRating value={priority} onChange={setPriority} />
            </span>

            {/* Status */}
            <SelectField
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
              className="rounded-full px-2.5 py-1 text-[12px] bg-accent border-border text-muted-foreground"
            />
          </div>

          {/* Date fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Start Date</p>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Due Date</p>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Assigned To — multi-select team member picker */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Assigned To</p>
            <TeamMemberPicker
              options={teamOptions}
              selected={assignedMembers}
              onChange={setAssignedMembers}
            />
          </div>

          {/* Lead / Client linking — mutually exclusive */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1.5">Link to Lead or Client</p>

            {/* Three-way toggle */}
            <div className="flex items-center gap-1.5 mb-2">
              {(["none", "lead", "client"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setLinkType(t); setLinkedRecord(null) }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all",
                    linkType === t
                      ? "bg-foreground text-background border-foreground"
                      : "bg-accent text-muted-foreground border-border hover:border-foreground/30"
                  )}
                >
                  {t === "none" ? "None" : t === "lead" ? "Lead" : "Client"}
                </button>
              ))}
            </div>

            {/* Record picker (shown only when lead or client selected) */}
            {linkType !== "none" && (
              <LinkedRecordPicker
                type={linkType}
                options={linkType === "lead" ? leadsOptions : clientsOptions}
                value={linkedRecord}
                onChange={setLinkedRecord}
              />
            )}
          </div>

          {/* Description */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                Description
              </p>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a description…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Notifications */}
          <div className="border-t border-border pt-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createNotifications}
                onChange={e => setCreateNotifications(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-foreground cursor-pointer"
              />
              <Bell className={cn(
                "h-3.5 w-3.5 transition-colors",
                createNotifications ? "text-foreground" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[13px] transition-colors",
                createNotifications ? "text-foreground" : "text-muted-foreground"
              )}>
                Create notifications for assigned team members
              </span>
            </label>

            {createNotifications && (
              <div className="mt-2.5 ml-6 flex items-center gap-2 flex-wrap">
                <span className="text-[12px] text-muted-foreground">Notify</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={notifyBusinessDays}
                  onChange={e => setNotifyBusinessDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 rounded border border-border bg-background px-2 py-0.5 text-[13px] text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-[12px] text-muted-foreground">business day(s) before start date</span>
                {!startDate && (
                  <span className="text-[11px] text-amber-600 italic">Set a start date above to enable notifications</span>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-600">
              {error}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-2 justify-end shrink-0">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Check className="h-3.5 w-3.5" />
            }
            Create Task
          </button>
        </div>

      </div>
    </div>
  )
}
