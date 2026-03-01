'use client'

import { useAirtable } from "@/hooks/use-airtable"
import { Calendar } from "lucide-react"

export function UpcomingBatches() {
  const today = new Date().toISOString().split('T')[0]
  const { data, isLoading } = useAirtable('batches', {
    maxRecords: 6,
    fields: ['Batch Key', 'Brand Name (from Client)', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)'],
    sort: [{ field: 'Launch Date', direction: 'asc' }],
    filterExtra: `{Launch Date} >= "${today}"`,
  })

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold">Upcoming Batches</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Scheduled launch dates</p>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-36 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : (data ?? []).length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">No upcoming batches</div>
        ) : (
          (data ?? []).map(r => {
            const batchKey = String(r.fields['Batch Key'] ?? '')
            const clientArr = r.fields['Brand Name (from Client)']
            const client = Array.isArray(clientArr) ? clientArr[0] : String(clientArr ?? '')
            const launchDate = r.fields['Launch Date'] ? new Date(String(r.fields['Launch Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
            const tests = Array.isArray(r.fields['Linked Test Names']) ? r.fields['Linked Test Names'].length : 0
            return (
              <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{client}</p>
                  <p className="text-[12px] text-muted-foreground">{launchDate} · {tests} test{tests !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
