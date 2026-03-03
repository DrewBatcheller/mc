'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAirtable } from "@/hooks/use-airtable"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 5

const categoryColors: Record<string, string> = {
  Strategy:    "bg-blue-50 text-blue-600",
  Design:      "bg-violet-50 text-violet-600",
  Management:  "bg-amber-50 text-amber-600",
  Development: "bg-emerald-50 text-emerald-600",
  QA:          "bg-rose-50 text-rose-600",
}

export function UpcomingTasks() {
  const today = new Date().toISOString().split('T')[0]
  const { data, isLoading } = useAirtable('tasks', {
    maxRecords: 100,
    sort: [{ field: 'Due Date', direction: 'asc' }],
    filterExtra: `AND({Status} != "Completed", {Due Date} >= "${today}")`,
  })

  const [page, setPage] = useState(0)

  const allTasks = useMemo(() => data ?? [], [data])
  const totalPages = Math.max(1, Math.ceil(allTasks.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => allTasks.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [allTasks, page]
  )

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">Upcoming Tasks</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Next items due across all clients</p>
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
        ) : allTasks.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming tasks</div>
        ) : (
          pageItems.map((r) => {
            const name      = String(r.fields['Team Facing Name'] ?? '')
            const dept      = String(r.fields['Department'] ?? '')
            // Prefer lookup fields over the raw linked record IDs
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
            const dueDate   = r.fields['Due Date']
              ? new Date(String(r.fields['Due Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'
            const due       = r.fields['Due Date'] ? new Date(String(r.fields['Due Date'])) : null
            const isUrgent  = due && (due.getTime() - Date.now()) < 1000 * 60 * 60 * 48

            return (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
                  <p className="text-[12px] text-muted-foreground truncate">
                    {client}{assignedTo ? <><span className="mx-1 opacity-40">·</span>{assignedTo}</> : null}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", categoryColors[dept] ?? "bg-gray-100 text-gray-500")}>
                    {dept}
                  </span>
                  <span className={cn("text-[12px] font-medium tabular-nums", isUrgent ? "text-red-600" : "text-muted-foreground")}>
                    {dueDate}
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
          {allTasks.length > 0 ? page + 1 : 0} of {totalPages}
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
