"use client"

import { useState, useMemo, Fragment } from "react"
import { Search, Plus, ArrowUpDown, ChevronDown, ExternalLink, Loader, Send, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { NewIdeaModal } from "@/components/clients/new-idea-modal"
import { NotesPanel } from "@/components/shared/notes-panel"
import { SyncIdeaModal } from "./sync-idea-modal"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/UserContext"

interface ClientIdea {
  id: string
  testDescription: string
  hypothesis: string
  rationale: string
  placement: string
  placementUrl?: string
  primaryGoals: string[]
  noteIds: string[]
  noteCount: number
  isPending?: boolean
}

const goalColors: Record<string, string> = {
  CVR: "bg-sky-50 text-sky-700 border-sky-200",
  ATC: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RPV: "bg-violet-50 text-violet-700 border-violet-200",
  AOV: "bg-amber-50 text-amber-700 border-amber-200",
  SCVR: "bg-indigo-50 text-indigo-700 border-indigo-200",
}

type SortKey = "testDescription" | "placement"

const columns: { key: SortKey | null; label: string }[] = [
  { key: null, label: "" },
  { key: "testDescription", label: "Test Description" },
  { key: "placement", label: "Placement" },
  { key: null, label: "Primary Goals" },
  { key: null, label: "Sync" },
]

export function ClientIdeasTable() {
  const { user } = useUser()
  const { data: rawIdeas, mutate } = useAirtable('experiment-ideas', {
    fields: ['Test Description', 'Hypothesis', 'Rationale', 'Placement', 'Placement URL', 'Category Primary Goals', 'Notes'],
  })
  const { toast } = useToast()

  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("testDescription")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncIdea, setSyncIdea] = useState<ClientIdea | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingIdeas, setPendingIdeas] = useState<ClientIdea[]>([])
  const [notesModalIdea, setNotesModalIdea] = useState<{ id: string; name: string; noteIds: string[] } | null>(null)

  const authHeaders: Record<string, string> = user
    ? {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-id': user.id,
        'x-user-name': user.name,
        ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
      }
    : { 'Content-Type': 'application/json' }

  // Transform Airtable records to ClientIdea format
  const ideas = useMemo(() => {
    if (!rawIdeas) return []
    return rawIdeas.map(record => {
      const notesRaw = record.fields['Notes']
      return {
        id: record.id,
        testDescription: record.fields['Test Description'] as string || '',
        hypothesis: record.fields['Hypothesis'] as string || '',
        rationale: record.fields['Rationale'] as string || '',
        placement: record.fields['Placement'] as string || '',
        placementUrl: record.fields['Placement URL'] as string,
        primaryGoals: (record.fields['Category Primary Goals'] as string[]) || [],
        noteIds: Array.isArray(notesRaw) ? (notesRaw as string[]) : [],
        noteCount: Array.isArray(notesRaw) ? (notesRaw as string[]).length : 0,
        isPending: false,
      }
    })
  }, [rawIdeas])

  // Combine pending and persisted ideas
  const allIdeas = useMemo(() => [...pendingIdeas, ...ideas], [pendingIdeas, ideas])

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const handleCreateIdea = async () => {
    setPendingIdeas([])
    await mutate()
  }

  const handleAddOptimisticIdea = (idea: any) => {
    setPendingIdeas(prev => [...prev, idea])
  }

  const filtered = useMemo(() => {
    let list = allIdeas.map((idea, i) => ({ ...idea, _idx: i }))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.testDescription.toLowerCase().includes(q) ||
          i.hypothesis.toLowerCase().includes(q) ||
          i.rationale.toLowerCase().includes(q) ||
          i.placement.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [search, sortKey, sortDir, allIdeas])

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search test ideas..."
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

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
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
                        i === 2 && "w-[160px]",
                        i === 3 && "w-[220px]"
                      )}
                    >
                      {col.key ? (
                        <button
                          onClick={() => handleSort(col.key!)}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                        >
                          {col.label}
                          <ArrowUpDown
                            className={cn(
                              "h-3 w-3 transition-colors",
                              sortKey === col.key
                                ? "text-foreground"
                                : "text-muted-foreground/30 group-hover:text-muted-foreground"
                            )}
                          />
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((idea) => {
                  const isExpanded = expandedRows.has(idea._idx)
                  return (
                    <Fragment key={idea.id || `pending-${idea._idx}`}>
                      <tr
                        onClick={() => toggleRow(idea._idx)}
                        className={cn(
                          "border-b border-border last:border-b-0 cursor-pointer transition-colors",
                          idea.isPending ? "bg-amber-50/50 hover:bg-amber-50/70" : "hover:bg-accent/30"
                        )}
                      >
                        <td className="w-10 px-0 pl-4 py-3.5 align-middle">
                          {idea.isPending ? (
                            <Loader className="h-4 w-4 text-amber-600 animate-spin" />
                          ) : (
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground align-middle min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="block truncate">{idea.testDescription}</span>
                            {idea.isPending && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
                                Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap align-middle">
                          {idea.placement}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {idea.primaryGoals.map((g) => (
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
                        <td className="px-4 py-3.5 text-center align-middle">
                          {!idea.isPending && (
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
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-border">
                          <td colSpan={columns.length} className={cn("px-5 py-4", idea.isPending ? "bg-amber-50/30" : "bg-accent/20")}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl pl-6">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Hypothesis
                                </span>
                                <p className="text-[13px] text-foreground leading-relaxed">
                                  {idea.hypothesis}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Rationale
                                </span>
                                <p className="text-[13px] text-foreground leading-relaxed">
                                  {idea.rationale}
                                </p>
                              </div>
                            </div>
                            {idea.placementUrl && (
                              <div className="mt-4 pl-6 flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  URL
                                </span>
                                <a
                                  href={idea.placementUrl.startsWith("http") ? idea.placementUrl : `https://${idea.placementUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {idea.placementUrl}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                            {/* Notes hyperlink */}
                            <div className="mt-3 pl-6">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setNotesModalIdea({ id: idea.id, name: idea.testDescription, noteIds: idea.noteIds }) }}
                                className="inline-flex items-center gap-1 text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                              >
                                <FileText className="h-3 w-3" />
                                {idea.noteCount > 0
                                  ? `${idea.noteCount} ${idea.noteCount === 1 ? 'Note' : 'Notes'}`
                                  : 'Add Note'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                      No test ideas found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewIdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateIdea}
        clientName={user?.name || 'Unknown Client'}
        clientId={user?.clientId || ''}
        onAddOptimistic={handleAddOptimisticIdea}
      />

      {syncIdea && (
        <SyncIdeaModal
          isOpen={syncModalOpen}
          onClose={() => {
            setSyncModalOpen(false)
            setSyncIdea(null)
          }}
          onSuccess={() => {
            setSyncModalOpen(false)
            setSyncIdea(null)
            mutate()
          }}
          idea={syncIdea}
        />
      )}

      {/* Notes modal */}
      {notesModalIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setNotesModalIdea(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-foreground">Idea Notes</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{notesModalIdea.name}</p>
              </div>
              <button type="button" onClick={() => setNotesModalIdea(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1">
              <NotesPanel
                linkedField="Experiments"
                linkedRecordId={notesModalIdea.id}
                authHeaders={authHeaders}
                placeholder="Add a note about this idea…"
                noteIds={notesModalIdea.noteIds}
                mode="add-only"
                onNoteCreated={() => mutate()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
