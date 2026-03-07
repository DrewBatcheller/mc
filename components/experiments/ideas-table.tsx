"use client"

import { useState, useMemo, Fragment } from "react"
import { Search, Plus, ArrowUpDown, ChevronDown, ExternalLink, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { NewIdeaModal } from "./new-idea-modal"
import { SyncIdeaModal } from "./sync-idea-modal"
import { NotesPanel } from "@/components/shared/notes-panel"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"

export interface Idea {
  id: string
  clientId: string
  client: string
  name: string
  hypothesis: string
  rationale: string
  placementLabel: string
  placementUrl: string
  goals: string[]
  devices: string
  geos: string
  priority: string
  weighting: string
  noteIds: string[]
  noteCount: number
}

const goalColors: Record<string, string> = {
  CVR:              "bg-sky-50 text-sky-700 border-sky-200",
  ATC:              "bg-emerald-50 text-emerald-700 border-emerald-200",
  RPV:              "bg-violet-50 text-violet-700 border-violet-200",
  AOV:              "bg-amber-50 text-amber-700 border-amber-200",
  PPV:              "bg-rose-50 text-rose-700 border-rose-200",
  CTR:              "bg-teal-50 text-teal-700 border-teal-200",
  SCVR:             "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Units per Order":"bg-orange-50 text-orange-700 border-orange-200",
}

type SortKey = "client" | "name" | "priority"

const columns: { key: SortKey | null; label: string }[] = [
  { key: null,       label: "" },
  { key: "client",   label: "Client" },
  { key: "name",     label: "Test Description" },
  { key: null,       label: "Placement" },
  { key: null,       label: "Primary Goals" },
  { key: "priority", label: "Priority" },
  { key: null,       label: "Notes" },
  { key: null,       label: "Sync" },
]

export function IdeasTable() {
  const { user } = useUser()

  const { data: rawIdeas, isLoading, mutate } = useAirtable('experiment-ideas', {
    fields: [
      'Test Description', 'Hypothesis', 'Rationale',
      'Placement', 'Placement URL', 'Category Primary Goals',
      'Brand Name (from Brand Name)', 'Record ID (from Brand Name)',
      'Devices', 'GEOs', 'Variants Weight', 'Notes',
    ],
    sort: [{ field: 'Test Description', direction: 'asc' }],
  })

  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All Clients")
  const [sortKey, setSortKey] = useState<SortKey>("client")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncIdea, setSyncIdea] = useState<Idea | null>(null)
  const [notesModalIdea, setNotesModalIdea] = useState<Idea | null>(null)

  const authHeaders: Record<string, string> = user ? {
    'Content-Type': 'application/json',
    'x-user-role': user.role,
    'x-user-id': user.id,
    'x-user-name': user.name,
    ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
  } : { 'Content-Type': 'application/json' }

  const ideas = useMemo<Idea[]>(() => {
    if (!rawIdeas) return []
    return rawIdeas.map(rec => {
      const f = rec.fields as Record<string, unknown>

      // Brand Name (from Brand Name) is a lookup that returns the client's display name
      const brandArr = f['Brand Name (from Brand Name)']
      const client = Array.isArray(brandArr)
        ? String(brandArr[0] ?? '')
        : String(brandArr ?? '')

      // Record ID (from Brand Name) is a lookup that gives the client's Airtable record ID
      // Used by the sync modal to filter batches to this client
      const clientIdArr = f['Record ID (from Brand Name)']
      const clientId = Array.isArray(clientIdArr)
        ? String(clientIdArr[0] ?? '')
        : String(clientIdArr ?? '')

      const goalsRaw = f['Category Primary Goals']
      const goals = Array.isArray(goalsRaw)
        ? (goalsRaw as string[])
        : goalsRaw ? [String(goalsRaw)] : []

      const devRaw = f['Devices']
      const devices = Array.isArray(devRaw)
        ? (devRaw as string[]).join(', ')
        : String(devRaw ?? '')

      const geosRaw = f['GEOs']
      const geos = Array.isArray(geosRaw)
        ? (geosRaw as string[]).join(', ')
        : String(geosRaw ?? '')

      return {
        id: rec.id,
        clientId,
        client,
        name:          String(f['Test Description'] ?? ''),
        hypothesis:    String(f['Hypothesis'] ?? ''),
        rationale:     String(f['Rationale'] ?? ''),
        placementLabel:String(f['Placement'] ?? ''),
        placementUrl:  String(f['Placement URL'] ?? ''),
        goals,
        devices,
        geos,
        priority:  String(f['Priority'] ?? ''),
        weighting: String(f['Variants Weight'] ?? ''),
        noteIds: Array.isArray(f['Notes']) ? (f['Notes'] as string[]) : [],
        noteCount: Array.isArray(f['Notes']) ? (f['Notes'] as string[]).length : 0,
      }
    })
  }, [rawIdeas])

  const clientOptions = useMemo(
    () => ["All Clients", ...Array.from(new Set(ideas.map(i => i.client))).filter(Boolean).sort()],
    [ideas]
  )

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = useMemo(() => {
    let list = [...ideas]
    if (clientFilter !== "All Clients") list = list.filter(i => i.client === clientFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.hypothesis.toLowerCase().includes(q) ||
        i.client.toLowerCase().includes(q) ||
        i.placementLabel.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [ideas, search, clientFilter, sortKey, sortDir])

  // Skeleton rows while loading
  const skeletonRows = Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="border-b border-border">
      <td className="px-4 py-3.5"><div className="h-4 w-4 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-28 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-52 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-24 rounded-md bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-14 rounded bg-muted animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-7 w-7 rounded-md bg-muted animate-pulse mx-auto" /></td>
    </tr>
  ))

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Client</label>
                <SelectField value={clientFilter} onChange={setClientFilter} options={clientOptions} />
              </div>
            </div>

            <div className="flex-1 relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ideas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="h-9 rounded-lg bg-foreground text-card px-4 text-[13px] font-medium hover:bg-foreground/90 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New Idea
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-4 py-3 text-[12px] font-medium text-muted-foreground whitespace-nowrap text-left",
                        i === 0 && "w-10 px-0 pl-4",
                        i === 1 && "w-[130px]",
                        i === 3 && "w-[160px]",
                        i === 4 && "w-[200px]",
                        i === 5 && "w-[90px]",
                        i === 6 && "w-[80px]",
                        i === 7 && "w-[52px]"
                      )}
                    >
                      {col.key ? (
                        <button
                          onClick={() => handleSort(col.key!)}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                        >
                          {col.label}
                          <ArrowUpDown className={cn(
                            "h-3 w-3 transition-colors",
                            sortKey === col.key
                              ? "text-foreground"
                              : "text-muted-foreground/30 group-hover:text-muted-foreground"
                          )} />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? skeletonRows : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                      No ideas found
                    </td>
                  </tr>
                ) : filtered.map((idea) => {
                  const isExpanded = expandedRows.has(idea.id)
                  return (
                    <Fragment key={idea.id}>
                      <tr
                        onClick={() => toggleRow(idea.id)}
                        className="border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/30 transition-colors"
                      >
                        <td className="w-10 px-0 pl-4 py-3.5 align-middle">
                          <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap align-middle">
                          {idea.client || <span className="text-muted-foreground italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground align-middle min-w-0">
                          <span className="block truncate">{idea.name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap align-middle">
                          {idea.placementLabel}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {idea.goals.map((g) => (
                              <span
                                key={g}
                                className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                  goalColors[g] ?? "bg-accent text-foreground border-border"
                                )}
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {idea.priority ? (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "h-2 w-4 rounded-sm",
                                    i < Number(idea.priority)
                                      ? Number(idea.priority) >= 4
                                        ? "bg-emerald-500"
                                        : Number(idea.priority) >= 3
                                          ? "bg-amber-400"
                                          : "bg-rose-400"
                                      : "bg-muted"
                                  )}
                                />
                              ))}
                              <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">{idea.priority}/5</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {idea.noteCount > 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setNotesModalIdea(idea)
                              }}
                              className="text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                            >
                              {idea.noteCount} {idea.noteCount === 1 ? "note" : "notes"}
                            </button>
                          ) : (
                            <span className="text-[12px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center align-middle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSyncIdea(idea)
                              setSyncModalOpen(true)
                            }}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Sync idea to a batch"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-border">
                          <td colSpan={columns.length} className="bg-accent/20 px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-6">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hypothesis</span>
                                <p className="text-[13px] text-foreground leading-relaxed">{idea.hypothesis || "—"}</p>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rationale</span>
                                <p className="text-[13px] text-foreground leading-relaxed">{idea.rationale || "—"}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pl-6 mt-4">
                              {idea.placementUrl && (
                                <div className="flex flex-col gap-1.5 min-w-0">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">URL</span>
                                  <a
                                    href={idea.placementUrl.startsWith("http") ? idea.placementUrl : `https://${idea.placementUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors inline-flex items-center gap-1 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="truncate">{idea.placementUrl}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                </div>
                              )}
                              {idea.weighting && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Weighting</span>
                                  <p className="text-[13px] text-foreground">{idea.weighting}</p>
                                </div>
                              )}
                              {idea.devices && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Devices</span>
                                  <p className="text-[13px] text-foreground">{idea.devices}</p>
                                </div>
                              )}
                              {idea.geos && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">GEOs</span>
                                  <p className="text-[13px] text-foreground">{idea.geos}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewIdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => mutate()}
      />

      {syncIdea && (
        <SyncIdeaModal
          isOpen={syncModalOpen}
          onClose={() => { setSyncModalOpen(false); setSyncIdea(null) }}
          onSuccess={() => { setSyncModalOpen(false); setSyncIdea(null); mutate() }}
          idea={syncIdea}
        />
      )}

      {notesModalIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setNotesModalIdea(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-foreground">Idea Notes</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{notesModalIdea.client} — {notesModalIdea.name}</p>
              </div>
              <button
                onClick={() => setNotesModalIdea(null)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors shrink-0 ml-3"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1">
              <NotesPanel
                linkedField="Experiments"
                linkedRecordId={notesModalIdea.id}
                authHeaders={authHeaders}
                placeholder="Write a note about this idea…"
                noteIds={notesModalIdea.noteIds}
                showVisibilityToggle
                onNoteCreated={() => mutate()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
