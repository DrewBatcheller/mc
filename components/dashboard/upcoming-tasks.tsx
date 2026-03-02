'use client'

import { useAirtable } from "@/hooks/use-airtable"
import { cn } from "@/lib/utils"

const categoryColors: Record<string, string> = {
  Strategy: "bg-blue-50 text-blue-600",
  Design: "bg-violet-50 text-violet-600",
  Management: "bg-amber-50 text-amber-600",
  Development: "bg-emerald-50 text-emerald-600",
  QA: "bg-rose-50 text-rose-600",
}

export function UpcomingTasks() {
  const today = new Date().toISOString().split('T')[0]
  const { data, isLoading } = useAirtable('tasks', {
    maxRecords: 8,
    fields: ['Team Facing Name', 'Department', 'Client', 'Due Date', 'Status'],
    sort: [{ field: 'Due Date', direction: 'asc' }],
    filterExtra: `AND({Status} != "Completed", {Due Date} >= "${today}")`,
  })

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">Upcoming Tasks</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Next items due across all clients</p>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : (data ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming tasks</div>
        ) : (
          (data ?? []).map((r) => {
            const name = String(r.fields['Team Facing Name'] ?? '')
            const dept = String(r.fields['Department'] ?? '')
            const clientArr = r.fields['Client']
            const client = Array.isArray(clientArr) ? clientArr[0] : String(clientArr ?? 'N/A')
            const dueDate = r.fields['Due Date'] ? new Date(String(r.fields['Due Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
            const due = r.fields['Due Date'] ? new Date(String(r.fields['Due Date'])) : null
            const isUrgent = due && (due.getTime() - Date.now()) < 1000 * 60 * 60 * 48

            return (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
                  <p className="text-[12px] text-muted-foreground">{client}</p>
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
    </div>
  )
}
