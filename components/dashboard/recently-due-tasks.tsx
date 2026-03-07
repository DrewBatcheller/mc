'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAirtable } from "@/hooks/use-airtable"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 5

type SortField = 'dueDate' | 'status'
type SortDir = 'asc' | 'desc'

const categoryColors: Record<string, string> = {
  Strategy:   "bg-blue-50 text-blue-600",
  Design:     "bg-violet-50 text-violet-600",
  Management: "bg-amber-50 text-amber-600",
  Development:"bg-emerald-50 text-emerald-600",
  QA:         "bg-rose-50 text-rose-600",
}

function daysSince(dateStr: string): number {
  const due = new Date(dateStr)
  // Compare date only (no time component) to avoid off-by-one from timezone offsets
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export function RecentlyDueTasks() {
  const today = new Date().toISOString().split('T')[0]

  const { data, isLoading } = useAirtable('tasks', {
    maxRecords: 50,
    sort: [{ field: 'Due Date', direction: 'desc' }],
    filterExtra: `{Due Date} < "${today}"`,
  })

  const [sortField, setSortField] = useState<SortField>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const tasks = useMemo(() => {
    if (!data) return []
    return data.map(r => {
      // Prefer lookup fields — raw 'Client' linked field returns record IDs
      const brandArr  = r.fields['Brand Name (from Client)']
      const brandName = Array.isArray(brandArr) && brandArr.length > 0 ? String(brandArr[0]) : null
      const leadArr   = r.fields['Full Name (from Lead)']
      const leadName  = Array.isArray(leadArr) && leadArr.length > 0 ? String(leadArr[0]) : null
      const client    = brandName ?? leadName ?? 'N/A'

      // Assigned to — handles text, string[], or People field (object[])
      const assignedRaw = r.fields['Assigned to']
      let assignedTo = ''
      if (Array.isArray(assignedRaw) && assignedRaw.length > 0) {
        const first = assignedRaw[0]
        assignedTo = first && typeof first === 'object' && 'name' in first
          ? String((first as { name: unknown }).name ?? '')
          : String(first ?? '')
      } else if (assignedRaw) {
        assignedTo = String(assignedRaw)
      }

      return {
        id: r.id,
        name: String(r.fields['Team Facing Name'] ?? ''),
        dept: String(r.fields['Department'] ?? ''),
        client,
        assignedTo,
        dueDate: String(r.fields['Due Date'] ?? ''),
        status: String(r.fields['Status'] ?? ''),
        completedAt: r.fields['Completed At'] ? String(r.fields['Completed At']) : null,
      }
    })
  }, [data])

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let cmp = 0
      if (sortField === 'dueDate') {
        cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      } else {
        // Status sort: Done (1) vs not done (0) — so "not done" floats to top in asc
        const aVal = a.status === 'Done' ? 1 : 0
        const bVal = b.status === 'Done' ? 1 : 0
        cmp = aVal - bVal
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [tasks, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => sortedTasks.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [sortedTasks, page]
  )

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'status' ? 'asc' : 'desc')
    }
    setPage(0) // reset to first page on sort change
  }

  const activeSortLabel = sortField === 'status' ? 'Status' : 'Date'

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">Recently Due Tasks</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Past-due items and recent completions</p>
        </div>
        <button
          onClick={() => toggleSort(sortField === 'status' ? 'dueDate' : 'status')}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border shrink-0",
            "border-border text-muted-foreground hover:bg-accent"
          )}
          title={`Currently sorted by ${activeSortLabel}. Click to sort by ${sortField === 'status' ? 'Date' : 'Status'}`}
        >
          <ArrowUpDown className="h-3 w-3" />
          Sort: {activeSortLabel}
        </button>
      </div>

      <div className="flex flex-col divide-y divide-border flex-1">
        {isLoading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : sortedTasks.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No recently due tasks</div>
        ) : (
          pageItems.map(task => {
            const isDone = task.status === 'Done'
            const days = task.dueDate ? daysSince(task.dueDate) : 0

            return (
              <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[13px] font-medium truncate",
                    isDone ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {task.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate">
                    {task.client}{task.assignedTo ? <><span className="mx-1 opacity-40">·</span>{task.assignedTo}</> : null}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.dept && (
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full",
                      categoryColors[task.dept] ?? "bg-gray-100 text-gray-500"
                    )}>
                      {task.dept}
                    </span>
                  )}

                  {/* Status badge */}
                  <span className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-full",
                    isDone
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  )}>
                    {isDone ? 'Done' : 'Overdue'}
                  </span>

                  {/* Days ago */}
                  <span className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap min-w-[44px] text-right">
                    {formatDaysAgo(days)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">
          {sortedTasks.length > 0 ? page + 1 : 0} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
