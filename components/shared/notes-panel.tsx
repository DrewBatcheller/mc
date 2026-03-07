"use client"

import { useState, useMemo } from "react"
import { Plus, Pencil, Trash2, Eye, Users, User } from "lucide-react"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"

/* ── Types ── */
interface Note {
  id: string
  note: string
  createdTime: string
  experimentType?: string
  createdByTeam?: string
  createdByClient?: string
  visibility?: string // "Team" | "All"
}

interface NotesPanelProps {
  linkedField: string         // 'Client' | 'Experiments' | 'Batches'
  linkedRecordId: string      // Airtable record ID to link notes to
  authHeaders: HeadersInit
  experimentType?: string     // Auto-set by caller context (e.g. 'QA Feedback')
  placeholder?: string        // e.g. "Write a note about this experiment…"
  filterByType?: string       // If set, only show notes with this Experiment Type
  /** Pre-known note record IDs from parent — enables reliable RECORD_ID() filter */
  noteIds?: string[]
  /** 'full' = CRUD (default), 'add-only' = add but no edit/delete, 'read-only' = no mutations */
  mode?: 'full' | 'add-only' | 'read-only'
  /** Show client-visibility toggle when creating notes (team members only) */
  showVisibilityToggle?: boolean
  /** Called after a note is created — receives the new record ID so the parent can track it */
  onNoteCreated?: (noteId?: string) => void
}

/* ── Component ── */
export function NotesPanel({
  linkedField,
  linkedRecordId,
  authHeaders,
  experimentType,
  placeholder = "Write a note…",
  filterByType,
  noteIds,
  mode = 'full',
  showVisibilityToggle = false,
  onNoteCreated,
}: NotesPanelProps) {
  const { user } = useUser()
  const isClient = user?.role === 'client'

  // Track note IDs created in this session so they appear in the RECORD_ID() filter
  const [sessionNoteIds, setSessionNoteIds] = useState<string[]>([])

  // ── Filter construction ─────────────────────────────────────────────────
  // Prefer RECORD_ID() pattern when noteIds provided (reliable).
  // Falls back to CONCATENATE (broken for linked records) when noteIds not provided.
  const allNoteIds = useMemo(
    () => [...(noteIds ?? []), ...sessionNoteIds],
    [noteIds, sessionNoteIds],
  )
  const hasNoteIdsProp = noteIds !== undefined

  const filterFormula = useMemo(() => {
    if (hasNoteIdsProp && allNoteIds.length === 0) return undefined // nothing to fetch yet

    if (allNoteIds.length > 0) {
      const idFilter =
        allNoteIds.length === 1
          ? `RECORD_ID() = "${allNoteIds[0]}"`
          : `OR(${allNoteIds.map((id) => `RECORD_ID() = "${id}"`).join(", ")})`
      return filterByType
        ? `AND(${idFilter}, {Experiment Type} = "${filterByType}")`
        : idFilter
    }

    // Legacy fallback — callers without noteIds (CONCATENATE is unreliable with linked records)
    const baseFilter = `FIND("${linkedRecordId}", CONCATENATE({${linkedField}})) > 0`
    return filterByType
      ? `AND(${baseFilter}, {Experiment Type} = "${filterByType}")`
      : baseFilter
  }, [allNoteIds, hasNoteIdsProp, linkedRecordId, linkedField, filterByType])

  const shouldFetch = filterFormula !== undefined

  const { data: rawNotes, mutate } = useAirtable<Record<string, unknown>>("notes", {
    fields: [
      "Note", "Created Time", "Experiment Type",
      "Created By (Team)", "Created By (Client)", "Visibility",
    ],
    filterExtra: filterFormula ?? "",
    sort: [{ field: "Created Time", direction: "desc" }],
    enabled: shouldFetch,
  })

  // ── Local state ─────────────────────────────────────────────────────────

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [optimisticNotes, setOptimisticNotes] = useState<Note[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [newNote, setNewNote] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [clientVisible, setClientVisible] = useState(false) // visibility toggle for team

  // ── Derived notes ───────────────────────────────────────────────────────

  const notes = useMemo<Note[]>(() => {
    const fetched = (rawNotes ?? [])
      .filter((r) => !deletedIds.has(r.id))
      .map((r) => {
        const f = r.fields as Record<string, unknown>
        const teamArr = f["Created By (Team)"]
        const clientArr = f["Created By (Client)"]
        return {
          id: r.id,
          note: (f["Note"] as string) ?? "",
          createdTime: r.createdTime ?? (f["Created Time"] as string) ?? "",
          experimentType: (f["Experiment Type"] as string) ?? undefined,
          createdByTeam: Array.isArray(teamArr) ? String(teamArr[0] ?? "") : typeof teamArr === "string" ? teamArr : undefined,
          createdByClient: Array.isArray(clientArr) ? String(clientArr[0] ?? "") : typeof clientArr === "string" ? clientArr : undefined,
          visibility: (f["Visibility"] as string) ?? undefined,
        }
      })
    return [
      ...optimisticNotes,
      ...fetched.filter((n) => !optimisticNotes.find((o) => o.id === n.id)),
    ]
  }, [rawNotes, deletedIds, optimisticNotes])

  // Apply visibility filtering for clients
  const visibleNotes = useMemo(() => {
    if (!isClient) return notes // Team sees everything
    return notes.filter((n) => {
      // Optimistic notes are always visible (just created by this user)
      if (n.id.startsWith("temp_")) return true
      // Client sees: notes they created (via client ID or user ID) + notes with "All" visibility
      if (n.createdByClient) {
        if (n.createdByClient === user?.id) return true
        if (user?.clientId && n.createdByClient === user.clientId) return true
      }
      if (n.visibility === "All") return true
      return false
    })
  }, [notes, isClient, user])

  // ── Helpers ─────────────────────────────────────────────────────────────

  const formatDate = (ts: string) => {
    if (!ts) return ""
    try {
      return new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return ts
    }
  }

  const getAuthorLabel = (n: Note): { label: string; isTeam: boolean } => {
    if (n.id.startsWith("temp_")) return { label: "You", isTeam: !isClient }
    if (n.createdByTeam) return { label: "Strategy Team", isTeam: true }
    if (n.createdByClient) {
      const isMe = n.createdByClient === user?.id || n.createdByClient === user?.clientId
      return { label: isMe ? "You" : "Client", isTeam: false }
    }
    return { label: "", isTeam: false }
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const text = newNote.trim()
    if (!text) return
    const tempId = `temp_${Date.now()}`
    const vis = isClient ? "All" : clientVisible ? "All" : "Team"
    const optimistic: Note = {
      id: tempId,
      note: text,
      createdTime: new Date().toISOString(),
      createdByTeam: !isClient ? user?.id : undefined,
      createdByClient: isClient ? user?.id : undefined,
      visibility: vis,
    }
    setOptimisticNotes((prev) => [optimistic, ...prev])
    setNewNote("")
    setIsAdding(false)
    setClientVisible(false)
    try {
      const fields: Record<string, unknown> = {
        Note: text,
        [linkedField]: [linkedRecordId],
        Visibility: vis,
      }
      if (user) {
        if (user.role === "client") {
          fields["Created By (Client)"] = [user.id]
        } else {
          fields["Created By (Team)"] = [user.id]
        }
      }
      if (experimentType) {
        fields["Experiment Type"] = experimentType
      }
      const res = await fetch("/api/airtable/notes", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      let createdId: string | undefined
      if (res.ok) {
        const { record } = await res.json()
        if (record?.id) {
          createdId = record.id
          setSessionNoteIds((prev) => [...prev, record.id])
        }
      }
      setOptimisticNotes((prev) => prev.filter((n) => n.id !== tempId))
      mutate()
      onNoteCreated?.(createdId)
    } catch {
      setOptimisticNotes((prev) => prev.filter((n) => n.id !== tempId))
    }
  }

  const handleEdit = async (note: Note) => {
    const text = editText.trim()
    if (!text || text === note.note) {
      setEditingId(null)
      return
    }
    setEditingId(null)
    try {
      await fetch(`/api/airtable/notes/${note.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields: { Note: text } }),
      })
      mutate()
    } catch {
      mutate()
    }
  }

  const handleDelete = async (noteId: string) => {
    setDeletedIds((prev) => new Set([...prev, noteId]))
    try {
      await fetch(`/api/airtable/notes/${noteId}`, { method: "DELETE", headers: authHeaders })
      mutate()
      setDeletedIds((prev) => {
        const s = new Set(prev)
        s.delete(noteId)
        return s
      })
    } catch {
      setDeletedIds((prev) => {
        const s = new Set(prev)
        s.delete(noteId)
        return s
      })
    }
  }

  // ── Permission checks ─────────────────────────────────────────────────

  const canAdd = mode !== "read-only"
  const canEdit = mode === "full"
  const canDelete = mode === "full"

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Add note toggle */}
      {canAdd && (
        <>
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-sky-600 hover:text-sky-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Note
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={placeholder}
                className="w-full min-h-[80px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              {/* Client Visibility toggle — team members only */}
              {showVisibilityToggle && !isClient && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientVisible}
                    onChange={(e) => setClientVisible(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border cursor-pointer"
                  />
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Visible to client
                  </span>
                </label>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newNote.trim()}
                  className="h-7 px-3 rounded-lg bg-foreground text-background text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setNewNote("")
                    setClientVisible(false)
                  }}
                  className="h-7 px-3 rounded-lg border border-border text-[12px] font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Notes list */}
      {visibleNotes.length === 0 && !isAdding && (
        <p className="text-[13px] text-muted-foreground/60">No notes yet</p>
      )}
      {visibleNotes.map((note) => {
        const author = getAuthorLabel(note)
        return (
          <div
            key={note.id}
            className="group flex flex-col gap-1 p-3 rounded-lg bg-background border border-border"
          >
            {editingId === note.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-h-[60px] px-2 py-1 rounded-md border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="h-6 px-2.5 rounded-md bg-foreground text-background text-[11px] font-medium hover:opacity-90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="h-6 px-2.5 rounded-md border border-border text-[11px] font-medium hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] text-foreground whitespace-pre-wrap flex-1">
                    {note.note}
                  </p>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingId(note.id)
                            setEditText(note.note)
                          }}
                          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                          title="Edit note"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Author + date row */}
                <div className="flex items-center gap-2">
                  {author.label && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      {author.isTeam
                        ? <Users className="h-2.5 w-2.5" />
                        : <User className="h-2.5 w-2.5" />}
                      {author.label}
                    </span>
                  )}
                  {note.experimentType && (
                    <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                      {note.experimentType}
                    </span>
                  )}
                  {note.visibility === "All" && !isClient && (
                    <span className="text-[10px] text-sky-600/70 bg-sky-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5" />
                      Client visible
                    </span>
                  )}
                  {note.createdTime && (
                    <span className="text-[11px] text-muted-foreground">{formatDate(note.createdTime)}</span>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
