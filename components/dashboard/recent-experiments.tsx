'use client'

import { useAirtable } from "@/hooks/use-airtable"
import { cn } from "@/lib/utils"

type Status = "Successful" | "Unsuccessful" | "Inconclusive" | "Live - Collecting Data" | "Pending"

const statusStyles: Record<string, string> = {
  "Successful": "bg-emerald-50 text-emerald-700",
  "Unsuccessful": "bg-red-50 text-red-600",
  "Inconclusive": "bg-amber-50 text-amber-600",
  "Live - Collecting Data": "bg-sky-50 text-sky-600",
  "Pending": "bg-gray-100 text-gray-500",
}

const statusLabels: Record<string, string> = {
  "Successful": "Successful",
  "Unsuccessful": "Unsuccessful",
  "Inconclusive": "Inconclusive",
  "Live - Collecting Data": "Live",
  "Pending": "Pending",
}

export function RecentExperiments() {
  const { data, isLoading } = useAirtable('experiments', {
    maxRecords: 8,
    fields: ['Test Description', 'Brand Name (from Brand Name)', 'Test Status', 'Launch Date', 'End Date'],
    sort: [{ field: 'Last Modified', direction: 'desc' }],
  })

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">Recent Experiments</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Latest test activity</p>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
            </div>
          ))
        ) : (data ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No experiments yet</div>
        ) : (
          (data ?? []).map((r) => {
            const name = String(r.fields['Test Description'] ?? '')
            const clientArr = r.fields['Brand Name (from Brand Name)']
            const client = Array.isArray(clientArr) ? clientArr[0] : String(clientArr ?? '')
            const status = String(r.fields['Test Status'] ?? 'Pending')
            const date = r.fields['Launch Date'] ? new Date(String(r.fields['Launch Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

            return (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
                  <p className="text-[12px] text-muted-foreground">{client} · {date}</p>
                </div>
                <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", statusStyles[status] ?? "bg-gray-100 text-gray-500")}>
                  {statusLabels[status] ?? status}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
