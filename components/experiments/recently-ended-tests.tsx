'use client'

import { useAirtable } from "@/hooks/use-airtable"
import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  Successful: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Unsuccessful: "bg-rose-50 text-rose-700 border-rose-200",
  Inconclusive: "bg-amber-50 text-amber-700 border-amber-200",
}

export function RecentlyEndedTests() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data, isLoading } = useAirtable('experiments', {
    maxRecords: 8,
    fields: ['Test Description', 'Brand Name (from Brand Name)', 'Test Status', 'End Date', 'Revenue Added (MRR)'],
    sort: [{ field: 'End Date', direction: 'desc' }],
    filterExtra: `AND(OR({Test Status} = "Successful", {Test Status} = "Unsuccessful", {Test Status} = "Inconclusive"), {End Date} >= "${thirtyDaysAgo}")`,
  })

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold">Recently Ended Tests</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Last 30 days</p>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : (data ?? []).length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">No tests ended in the last 30 days</div>
        ) : (
          (data ?? []).map(r => {
            const name = String(r.fields['Test Description'] ?? '')
            const clientArr = r.fields['Brand Name (from Brand Name)']
            const client = Array.isArray(clientArr) ? clientArr[0] : String(clientArr ?? '')
            const status = String(r.fields['Test Status'] ?? '')
            const revenue = String(r.fields['Revenue Added (MRR)'] ?? '$0')
            return (
              <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{name}</p>
                  <p className="text-[12px] text-muted-foreground">{client}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-medium text-emerald-600 tabular-nums">{revenue}</span>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", statusStyles[status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                    {status}
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
