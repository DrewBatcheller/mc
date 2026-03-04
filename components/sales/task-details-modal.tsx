"use client"

import { useState, useEffect, useMemo } from "react"
import {
  X, Clock, User, Tag, Calendar, Star,
  Pencil, Trash2, Loader2, AlignLeft, StickyNote, Plus, Check, Link2, Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"
import { SelectField } from "@/components/shared/select-field"
import type { CalendarTask } from "./sales-calendar"
import {
  TeamMemberPicker, LinkedRecordPicker,
  type TeamMember, type LinkedRecord,
} from "./task-form-fields"

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskDetailsModalProps {
  isOpen: boolean
  task: CalendarTask | null
  onClose: () => void
  onTaskMutate: () => void
  onTaskUpdate?: (updates: Partial<CalendarTask>) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const typeConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  call:     { label: "Call",      bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500"     },
  followup: { label: "Follow Up", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500"   },
  meeting:  { label: "Meeting",   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
}

const TYPE_AIRTABLE_VALUES: Record<string, string> = {
  call: "Call", followup: "Follow Up", meeting: "Meeting",
}

const STATUS_OPTIONS  = ["Not Started", "In Progress", "Complete", "Cancelled"]
const TYPE_CYCLE: Array<"call" | "followup" | "meeting"> = ["call", "followup", "meeting"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ value, max = 3 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25")} />
      ))}
    </div>
  )
}

function EditableStarRating({ value, onChange, max = 3 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button" onClick={() => onChange(i + 1 === value ? 0 : i + 1)} className="h-4 w-4 flex items-center justify-center">
          <Star className={cn("h-3.5 w-3.5 transition-colors", i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25 hover:text-amber-300")} />
        </button>
      ))}
    </div>
  )
}

function formatNoteDate(iso: string | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/**
 * Subtract N business days from a YYYY-MM-DD string.
 * Returns an ISO datetime string (noon local time on result day).
 */
function subtractBusinessDays(isoDate: string, days: number): string {
  const parts = isoDate.split("-")
  const date  = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 9, 0, 0)
  let remaining = days
  while (remaining > 0) {
    date.setDate(date.getDate() - 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining--
  }
  return date.toISOString()
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingNote {
  id: string
  content: string
  isPending: boolean
  created?: string
}

interface EditableTaskFields {
  title:             string
  clientFacingName:  string
  type:              "call" | "followup" | "meeting"
  startDate:         string
  dueDate:           string
  status:            string
  assignedMembers:   TeamMember[]
  priority:          number
  description:       string
  linkType:          "none" | "lead" | "client"
  linkedRecord:      LinkedRecord | null
  createNotifications: boolean
  notifyBusinessDays:  number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskDetailsModal({
  isOpen, task, onClose, onTaskMutate, onTaskUpdate,
}: TaskDetailsModalProps) {

  // ── All hooks — must be unconditional ─────────────────────────────────────

  const { user } = useUser()

  const authHeaders: HeadersInit = useMemo(() => user ? {
    "x-user-role": user.role,
    "x-user-id":   user.id,
    "x-user-name": user.name,
    ...(user.clientId ? { "x-client-id": user.clientId } : {}),
  } : {}, [user])

  // Description inline edit
  const [editingDesc,      setEditingDesc]      = useState(false)
  const [descValue,        setDescValue]        = useState("")
  const [localDescription, setLocalDescription] = useState<string | null>(null)
  const [savingDesc,       setSavingDesc]       = useState(false)

  // Notes
  const [showAddNote,   setShowAddNote]   = useState(false)
  const [newNote,       setNewNote]       = useState("")
  const [linkToLead,    setLinkToLead]    = useState(false)
  const [linkToClient,  setLinkToClient]  = useState(false)
  const [savingNote,    setSavingNote]    = useState(false)
  const [pendingCreates, setPendingCreates] = useState<PendingNote[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())

  // Full edit mode
  const [editMode,   setEditMode]   = useState(false)
  const [editFields, setEditFields] = useState<EditableTaskFields | null>(null)
  const [savingTask, setSavingTask] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // Notes fetch — scoped to this task's note IDs
  const noteIds    = task?.noteIds ?? []
  const noteFilter = noteIds.length > 0
    ? `OR(${noteIds.map(id => `RECORD_ID()="${id}"`).join(",")})`
    : undefined

  const { data: fetchedNoteRecs, mutate: mutateNotes } = useAirtable<{
    "Note"?: string
    "Created Time"?: string
  }>(
    "notes",
    {
      fields:      ["Note", "Created Time"],
      filterExtra: noteFilter,
      enabled:     isOpen && !!task && noteIds.length > 0,
      noCache:     true,
    }
  )

  // Team, leads, clients — fetched when modal is open (for edit form pickers)
  const { data: teamData } = useAirtable<{ "Full Name"?: string }>(
    "team",
    { fields: ["Full Name"], enabled: isOpen }
  )

  const { data: leadsData } = useAirtable<{ "Full Name"?: string }>(
    "leads",
    { fields: ["Full Name"], enabled: isOpen }
  )

  const { data: clientsData } = useAirtable<{ "Brand Name"?: string }>(
    "clients",
    { fields: ["Brand Name"], enabled: isOpen }
  )

  // ── Derived picker options ─────────────────────────────────────────────────
  const teamOptions: TeamMember[] = useMemo(() =>
    (teamData ?? []).map(r => ({
      id:   r.id,
      name: String(r.fields["Full Name"] ?? "").trim(),
    })).filter(m => m.name),
  [teamData])

  const leadsOptions: LinkedRecord[] = useMemo(() =>
    (leadsData ?? []).map(r => ({
      id:   r.id,
      name: String(r.fields["Full Name"] ?? "").trim(),
    })).filter(r => r.name),
  [leadsData])

  const clientsOptions: LinkedRecord[] = useMemo(() =>
    (clientsData ?? []).map(r => ({
      id:   r.id,
      name: String(r.fields["Brand Name"] ?? "").trim(),
    })).filter(r => r.name),
  [clientsData])

  // ── Reset on close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setEditingDesc(false)
      setShowAddNote(false)
      setNewNote("")
      setLinkToLead(false)
      setLinkToClient(false)
      setPendingCreates([])
      setPendingDeletes(new Set())
      setEditMode(false)
      setEditFields(null)
      setError(null)
    }
  }, [isOpen])

  // ── Reset on task change ───────────────────────────────────────────────────
  useEffect(() => {
    if (task) {
      setDescValue(task.description)
      setLocalDescription(null)
      setEditingDesc(false)
      setShowAddNote(false)
      setPendingCreates([])
      setPendingDeletes(new Set())
      setEditMode(false)
      setEditFields(null)
      setError(null)
    }
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early return (after all hooks) ────────────────────────────────────────
  if (!isOpen || !task) return null

  // ── Derived display values ─────────────────────────────────────────────────
  const displayDescription = localDescription ?? task.description
  const displayType        = editMode ? editFields!.type : task.type
  const config             = typeConfig[displayType] ?? typeConfig.meeting
  const dateStr            = `${MONTHS[task.month]} ${task.day}, ${task.year}`
  const isInternal         = task.subtitle === "Internal"

  // Notes — server truth + optimistic overrides
  const serverNotes = (fetchedNoteRecs ?? [])
    .filter(r => !pendingDeletes.has(r.id))
    .map(r => ({
      id:        r.id,
      content:   String(r.fields["Note"] ?? ""),
      // Use "Created Time" custom field; fall back to Airtable's built-in createdTime
      created:   String(r.fields["Created Time"] ?? r.createdTime ?? ""),
      isPending: false,
    }))

  const localNotes = pendingCreates.filter(
    p => !pendingDeletes.has(p.id) && !serverNotes.some(s => s.id === p.id)
  )

  const allNotes = [...serverNotes, ...localNotes]

  // ── Helpers ────────────────────────────────────────────────────────────────

  const createTaskNotifications = async (
    title:              string,
    startDate:          string,
    businessDaysBefore: number,
    memberIds:          string[]
  ) => {
    if (!memberIds.length || !startDate) return
    const displayTime = subtractBusinessDays(startDate, businessDaysBefore)
    await Promise.allSettled(
      memberIds.map(memberId =>
        fetch("/api/airtable/notifications", {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body:    JSON.stringify({
            fields: {
              "Notification Title": `Upcoming: ${title}`,
              "Team Member":        [memberId],
              "Display Time":       displayTime,
            },
          }),
        })
      )
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  const enterEditMode = () => {
    // Resolve current assigned members by matching names in teamOptions
    const assignedNames = task.assignedTo
      ? task.assignedTo.split(",").map(s => s.trim()).filter(Boolean)
      : []
    const assignedMembers: TeamMember[] = assignedNames.map(name => {
      const match = teamOptions.find(m => m.name === name)
      return match ?? { id: "", name }
    })

    // Resolve current lead/client link type
    const linkType: "none" | "lead" | "client" =
      task.leadId   ? "lead"   :
      task.clientId ? "client" : "none"

    const linkedRecord: LinkedRecord | null =
      linkType === "lead"   ? { id: task.leadId,   name: task.leadName   } :
      linkType === "client" ? { id: task.clientId, name: task.clientName } :
      null

    setEditFields({
      title:              task.title,
      clientFacingName:   task.clientFacingName,
      type:               task.type,
      startDate:          task.startDate ?? "",
      dueDate:            task.dueDate   ?? "",
      status:             task.status,
      assignedMembers,
      priority:           task.priority,
      description:        displayDescription,
      linkType,
      linkedRecord,
      createNotifications: false,
      notifyBusinessDays:  1,
    })
    setEditMode(true)
    setEditingDesc(false)
    setError(null)
  }

  const cancelEditMode = () => {
    setEditMode(false)
    setEditFields(null)
    setError(null)
  }

  const saveTaskEdits = async () => {
    if (!editFields) return
    setSavingTask(true)
    setError(null)
    try {
      const fields: Record<string, unknown> = {
        "Team Facing Name":  editFields.title,
        "Client Facing Name": editFields.clientFacingName || null,
        "Type":              TYPE_AIRTABLE_VALUES[editFields.type] ?? editFields.type,
        "Status":            editFields.status,
        "Assigned to":       editFields.assignedMembers.map(m => m.name).join(", "),
        "Priority":          editFields.priority,
        "Description":       editFields.description,
        // Mutually exclusive lead / client links
        "Lead":   editFields.linkType === "lead"   && editFields.linkedRecord
                    ? [editFields.linkedRecord.id] : [],
        "Client": editFields.linkType === "client" && editFields.linkedRecord
                    ? [editFields.linkedRecord.id] : [],
      }
      if (editFields.startDate) fields["Start Date"] = editFields.startDate
      if (editFields.dueDate)   fields["Due Date"]   = editFields.dueDate

      const res = await fetch(`/api/airtable/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body:    JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Save failed")
      }

      // Create notifications if requested
      if (editFields.createNotifications && editFields.startDate) {
        const memberIds = editFields.assignedMembers.filter(m => m.id).map(m => m.id)
        await createTaskNotifications(editFields.title, editFields.startDate, editFields.notifyBusinessDays, memberIds)
      }

      // Track description change locally
      setLocalDescription(editFields.description)

      // Update parent's selectedTask in-place
      const newSubtitle =
        editFields.clientFacingName && editFields.clientFacingName !== editFields.title
          ? editFields.clientFacingName : "Internal"

      onTaskUpdate?.({
        title:            editFields.title,
        clientFacingName: editFields.clientFacingName,
        subtitle:         newSubtitle,
        type:             editFields.type,
        status:           editFields.status,
        assignedTo:       editFields.assignedMembers.map(m => m.name).join(", "),
        priority:         editFields.priority,
        description:      editFields.description,
        startDate:        editFields.startDate || null,
        dueDate:          editFields.dueDate   || null,
        leadId:           editFields.linkType === "lead"   && editFields.linkedRecord ? editFields.linkedRecord.id   : "",
        leadName:         editFields.linkType === "lead"   && editFields.linkedRecord ? editFields.linkedRecord.name : "",
        clientId:         editFields.linkType === "client" && editFields.linkedRecord ? editFields.linkedRecord.id   : "",
        clientName:       editFields.linkType === "client" && editFields.linkedRecord ? editFields.linkedRecord.name : "",
      })

      setEditMode(false)
      setEditFields(null)
      onTaskMutate()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save task")
    } finally {
      setSavingTask(false)
    }
  }

  // ── Description ────────────────────────────────────────────────────────────

  const saveDescription = async () => {
    setSavingDesc(true)
    setError(null)
    try {
      const res = await fetch(`/api/airtable/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body:    JSON.stringify({ fields: { Description: descValue } }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Save failed")
      }
      setLocalDescription(descValue)
      setEditingDesc(false)
      onTaskUpdate?.({ description: descValue })
      onTaskMutate()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save description")
    } finally {
      setSavingDesc(false)
    }
  }

  // ── Notes ──────────────────────────────────────────────────────────────────

  const createNote = async () => {
    if (!newNote.trim()) return
    const content = newNote.trim()
    const tempId  = `temp-${Date.now()}`
    const capturedLinkToLead   = linkToLead
    const capturedLinkToClient = linkToClient

    setPendingCreates(prev => [...prev, { id: tempId, content, isPending: true }])
    setNewNote("")
    setShowAddNote(false)
    setLinkToLead(false)
    setLinkToClient(false)
    setSavingNote(true)
    setError(null)

    const noteFields: Record<string, unknown> = { "Note": content }
    if (capturedLinkToLead   && task.leadId)   noteFields["Lead"]   = [task.leadId]
    if (capturedLinkToClient && task.clientId) noteFields["Client"] = [task.clientId]

    let noteCreated = false
    try {
      const res = await fetch("/api/airtable/notes", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body:    JSON.stringify({ fields: noteFields }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Failed to save note")
      }
      const { record } = await res.json()
      noteCreated = true

      setPendingCreates(prev =>
        prev.map(p => p.id === tempId ? { ...p, id: record.id, isPending: false } : p)
      )

      // Link note back to task
      const updatedNoteIds = [...task.noteIds, record.id]
      const patchRes = await fetch(`/api/airtable/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body:    JSON.stringify({ fields: { "Notes": updatedNoteIds } }),
      })
      if (!patchRes.ok) {
        setError("Note saved, but couldn't link it to this task. Refresh to see it.")
      } else {
        onTaskUpdate?.({ noteIds: updatedNoteIds })
      }

      onTaskMutate()
      mutateNotes()
    } catch (e) {
      if (!noteCreated) setPendingCreates(prev => prev.filter(p => p.id !== tempId))
      setError(e instanceof Error ? e.message : "Failed to save note")
    } finally {
      setSavingNote(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    setPendingDeletes(prev => new Set([...prev, noteId]))
    setError(null)
    try {
      const res = await fetch(`/api/airtable/notes/${noteId}`, {
        method: "DELETE", headers: authHeaders,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Failed to delete note")
      }
      onTaskMutate()
      mutateNotes()
    } catch (e) {
      setPendingDeletes(prev => { const s = new Set(prev); s.delete(noteId); return s })
      setError(e instanceof Error ? e.message : "Failed to delete note")
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" aria-label={task.title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={editMode ? undefined : onClose} />

      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={cn("rounded-t-xl px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0 transition-colors", config.bg)}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0 transition-colors", config.dot)} />
            <div className="min-w-0 flex-1">
              {editMode ? (
                <input
                  value={editFields!.title}
                  onChange={e => setEditFields(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="Task name…"
                  className="w-full bg-transparent text-[15px] font-semibold text-foreground leading-tight border-0 border-b border-foreground/20 focus:outline-none focus:border-foreground/50 pb-0.5"
                />
              ) : (
                <h2 className="text-[15px] font-semibold text-foreground leading-tight">{task.title}</h2>
              )}
              {!editMode && (
                <p className="text-[13px] text-muted-foreground mt-0.5">{task.subtitle}</p>
              )}
              {editMode && (
                <input
                  value={editFields!.clientFacingName}
                  onChange={e => setEditFields(prev => prev ? { ...prev, clientFacingName: e.target.value } : prev)}
                  placeholder="Client facing name (optional)…"
                  className="mt-0.5 w-full bg-transparent text-[13px] text-muted-foreground border-0 border-b border-foreground/10 focus:outline-none focus:border-foreground/30 pb-0.5"
                />
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors">
            <X className="h-4 w-4 text-foreground/60" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Badge row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type */}
            {editMode ? (
              <button
                type="button"
                onClick={() => {
                  const idx = TYPE_CYCLE.indexOf(editFields!.type)
                  setEditFields(prev => prev ? { ...prev, type: TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length] } : prev)
                }}
                className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all",
                  typeConfig[editFields!.type].bg, typeConfig[editFields!.type].text, typeConfig[editFields!.type].border)}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", typeConfig[editFields!.type].dot)} />
                {typeConfig[editFields!.type].label}
                <span className="text-[10px] opacity-40 ml-0.5">▾</span>
              </button>
            ) : (
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border", config.bg, config.text, config.border)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                {config.label}
              </span>
            )}

            {/* Priority */}
            {editMode ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border bg-amber-50 border-amber-200 text-amber-700">
                <EditableStarRating
                  value={editFields!.priority}
                  onChange={v => setEditFields(prev => prev ? { ...prev, priority: v } : prev)}
                />
              </span>
            ) : (
              task.priority > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border bg-amber-50 border-amber-200 text-amber-700">
                  <StarRating value={task.priority} />
                </span>
              )
            )}

            {/* Status */}
            {editMode ? (
              <SelectField
                value={editFields!.status}
                onChange={v => setEditFields(prev => prev ? { ...prev, status: v } : prev)}
                options={STATUS_OPTIONS}
                className="rounded-full px-2.5 py-1 text-[12px] bg-accent border-border text-muted-foreground"
              />
            ) : (
              task.status && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border bg-accent border-border text-muted-foreground">
                  {task.status}
                </span>
              )
            )}
          </div>

          {/* Info grid — dates & type (view) / date inputs (edit) */}
          {editMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Start Date</p>
                  <input type="date" value={editFields!.startDate}
                    onChange={e => setEditFields(prev => prev ? { ...prev, startDate: e.target.value } : prev)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Due Date</p>
                  <input type="date" value={editFields!.dueDate}
                    onChange={e => setEditFields(prev => prev ? { ...prev, dueDate: e.target.value } : prev)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Date</p>
                  <p className="text-[13px] text-foreground font-medium">{dateStr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Time</p>
                  <p className="text-[13px] text-foreground font-medium">{task.time || "All day"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Type</p>
                  <p className="text-[13px] text-foreground font-medium capitalize">{task.type}</p>
                </div>
              </div>
              {!isInternal && (
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {task.type === "call" ? "With" : "Client"}
                    </p>
                    <p className="text-[13px] text-foreground font-medium truncate">{task.subtitle}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assigned To */}
          {editMode ? (
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1.5">Assigned To</p>
              <TeamMemberPicker
                options={teamOptions}
                selected={editFields!.assignedMembers}
                onChange={members => setEditFields(prev => prev ? { ...prev, assignedMembers: members } : prev)}
              />
            </div>
          ) : (
            task.assignedTo && (
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Assigned To</p>
                  <p className="text-[13px] text-foreground font-medium">{task.assignedTo}</p>
                </div>
              </div>
            )
          )}

          {/* Lead / Client link (edit mode only) */}
          {editMode && (
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1.5">Link to Lead or Client</p>
              {/* Toggle: None / Lead / Client */}
              <div className="flex gap-1.5 mb-2">
                {(["none", "lead", "client"] as const).map(lt => (
                  <button
                    key={lt}
                    type="button"
                    onClick={() => setEditFields(prev => prev ? { ...prev, linkType: lt, linkedRecord: null } : prev)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[12px] font-medium border transition-all capitalize",
                      editFields!.linkType === lt
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                    )}
                  >
                    {lt === "none" ? "None" : lt === "lead" ? "Lead" : "Client"}
                  </button>
                ))}
              </div>
              {editFields!.linkType === "lead" && (
                <LinkedRecordPicker
                  type="lead"
                  options={leadsOptions}
                  value={editFields!.linkedRecord}
                  onChange={r => setEditFields(prev => prev ? { ...prev, linkedRecord: r } : prev)}
                />
              )}
              {editFields!.linkType === "client" && (
                <LinkedRecordPicker
                  type="client"
                  options={clientsOptions}
                  value={editFields!.linkedRecord}
                  onChange={r => setEditFields(prev => prev ? { ...prev, linkedRecord: r } : prev)}
                />
              )}
            </div>
          )}

          {/* Lead / Client display (view mode) */}
          {!editMode && (task.leadName || task.clientName) && (
            <div className="flex items-start gap-2.5">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {task.leadName ? "Lead" : "Client"}
                </p>
                <p className="text-[13px] text-foreground font-medium">
                  {task.leadName || task.clientName}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Description</p>
              </div>
              {!editMode && !editingDesc && (
                <button
                  onClick={() => { setDescValue(displayDescription); setEditingDesc(true) }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
            </div>

            {editMode ? (
              <textarea
                value={editFields!.description}
                onChange={e => setEditFields(prev => prev ? { ...prev, description: e.target.value } : prev)}
                rows={3}
                placeholder="Add a description…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            ) : editingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={descValue}
                  onChange={e => setDescValue(e.target.value)}
                  rows={4}
                  placeholder="Add a description…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setEditingDesc(false)} disabled={savingDesc}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground">
                    Cancel
                  </button>
                  <button onClick={saveDescription} disabled={savingDesc}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5">
                    {savingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                {displayDescription || <span className="text-muted-foreground italic">No description yet.</span>}
              </p>
            )}
          </div>

          {/* Notifications (edit mode only) */}
          {editMode && (
            <div className="border-t border-border pt-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFields!.createNotifications}
                  onChange={e => setEditFields(prev => prev ? { ...prev, createNotifications: e.target.checked } : prev)}
                  className="h-4 w-4 rounded border-border accent-foreground"
                />
                <div className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[13px] text-foreground font-medium">
                    Create Notifications for Assigned Team Members
                  </span>
                </div>
              </label>
              {editFields!.createNotifications && (
                <div className="mt-3 flex items-center gap-2 pl-6">
                  <span className="text-[12px] text-muted-foreground">Notify</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editFields!.notifyBusinessDays}
                    onChange={e => setEditFields(prev => prev
                      ? { ...prev, notifyBusinessDays: Math.max(0, parseInt(e.target.value, 10) || 0) }
                      : prev
                    )}
                    className="w-14 rounded-lg border border-border bg-background px-2.5 py-1 text-[13px] text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-[12px] text-muted-foreground">
                    business day{editFields!.notifyBusinessDays !== 1 ? "s" : ""} before start date
                    {editFields!.notifyBusinessDays === 0 && (
                      <span className="text-foreground"> (on start date)</span>
                    )}
                  </span>
                </div>
              )}
              {editFields!.createNotifications && !editFields!.startDate && (
                <p className="mt-1.5 pl-6 text-[11px] text-amber-600">Set a Start Date to enable notifications.</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
              {allNotes.length > 0 && (
                <span className="ml-auto text-[11px] text-muted-foreground">{allNotes.length}</span>
              )}
            </div>

            {allNotes.length === 0 && !showAddNote && (
              <p className="text-[13px] text-muted-foreground italic">No notes yet.</p>
            )}

            {allNotes.length > 0 && (
              <div className="space-y-2 mb-3">
                {allNotes.map(note => (
                  <div key={note.id} className={cn("group relative rounded-lg border border-border bg-accent/30 px-3 py-2.5", note.isPending && "opacity-60")}>
                    <p className="text-[13px] text-foreground leading-relaxed pr-6 whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] text-muted-foreground">{note.isPending ? "Saving…" : formatNoteDate(note.created)}</p>
                      {!note.isPending && (
                        <button onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all" aria-label="Delete note">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddNote ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {/* Cross-link checkboxes */}
                {(task.leadId || task.clientId) && (
                  <div className="space-y-1.5 px-1">
                    {task.leadId && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={linkToLead} onChange={e => setLinkToLead(e.target.checked)} className="h-3.5 w-3.5 rounded border-border accent-foreground" />
                        <span className="text-[12px] text-muted-foreground">
                          Also attach to Lead{task.leadName && <span className="text-foreground font-medium"> · {task.leadName}</span>}
                        </span>
                      </label>
                    )}
                    {task.clientId && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={linkToClient} onChange={e => setLinkToClient(e.target.checked)} className="h-3.5 w-3.5 rounded border-border accent-foreground" />
                        <span className="text-[12px] text-muted-foreground">
                          Also attach to Client{task.clientName && <span className="text-foreground font-medium"> · {task.clientName}</span>}
                        </span>
                      </label>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => { setShowAddNote(false); setNewNote(""); setLinkToLead(false); setLinkToClient(false) }}
                    disabled={savingNote}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground">
                    Cancel
                  </button>
                  <button onClick={createNote} disabled={savingNote || !newNote.trim()}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                    {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save note
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddNote(true)}
                className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-[12px] font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add Note
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-600">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center shrink-0">
          {editMode ? (
            <div className="flex items-center gap-2 w-full justify-end">
              <button onClick={cancelEditMode} disabled={savingTask}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground">
                Cancel
              </button>
              <button onClick={saveTaskEdits} disabled={savingTask}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5">
                {savingTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            </div>
          ) : task.hasCallRecord ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Link2 className="h-3 w-3" /> Managed via Calendly
              </div>
              <button onClick={onClose}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground">
                Close
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full justify-end">
              <button onClick={enterEditMode}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={onClose}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
