'use client'

import { useAirtable } from "@/hooks/use-airtable"
import type { AirtableRecord } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Calendar, ChevronRight, FlaskConical } from "lucide-react"

interface Props {
  onBatchClick?: (batch: AirtableRecord) => void
  clientId?: string
}

// Safe formatter: strips ISO time to avoid UTC→local day shift on midnight-UTC Airtable dates
function formatDateSafe(raw: string): string {
  const ymd = raw.split('T')[0]
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return raw
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m[2]-1]} ${+m[3]}, ${m[1]}`
}

function getDaysUntil(launchDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const launch = new Date(launchDate)
  launch.setHours(0, 0, 0, 0)
  const diffMs = launch.getTime() - today.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days < 0) return "Overdue"
  return `${days}d`
}

export function UpcomingBatches({ onBatchClick, clientId }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const dateFilter = `{Launch Date} >= "${today}"`
  const filterExtra = clientId
    ? `AND(${dateFilter}, {Record ID (from Client)} = "${clientId}")`
    : dateFilter

  const { data, isLoading } = useAirtable('batches', {
    maxRecords: 6,
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)', 'Experiments Attached'],
    sort: [{ field: 'Launch Date', direction: 'asc' }],
    filterExtra,
  })

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold">Upcoming Batches</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Scheduled launch dates</p>
        </div>
        {!isLoading && (data ?? []).length > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 tabular-nums">
            {(data ?? []).length}
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <div className="h-9 w-9 bg-muted rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-28 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
            </div>
          ))
        ) : (data ?? []).length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium text-muted-foreground">No upcoming batches</p>
            <p className="text-[12px] text-muted-foreground/70">All scheduled launches will appear here</p>
          </div>
        ) : (
          (data ?? []).map(r => {
            const batchKey    = String(r.fields['Batch Key'] ?? '—')
            const launchRaw   = r.fields['Launch Date'] ? String(r.fields['Launch Date']) : null
            const launchDate  = launchRaw ? formatDateSafe(launchRaw) : '—'
            const daysUntil   = launchRaw ? getDaysUntil(launchRaw) : null
            const tests       = Array.isArray(r.fields['Linked Test Names']) ? r.fields['Linked Test Names'].length : 0
            const isClickable = !!onBatchClick

            const daysColor = daysUntil === 'Overdue'
              ? 'text-rose-600 bg-rose-50 border-rose-200'
              : daysUntil === 'Today' || daysUntil === 'Tomorrow'
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-muted-foreground bg-muted/50 border-border'

            return (
              <div
                key={r.id}
                onClick={() => onBatchClick?.(r)}
                className={cn(
                  "px-5 py-3.5 flex items-center gap-3 group",
                  isClickable && "cursor-pointer hover:bg-muted/40 transition-colors"
                )}
              >
                {/* Icon */}
                <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <FlaskConical className="h-4 w-4 text-sky-600" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{batchKey}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                    {tests > 0 && <span>{tests} test{tests !== 1 ? 's' : ''}</span>}
                    {tests > 0 && launchRaw && <span className="text-muted-foreground/60"> · </span>}
                    {launchRaw && <span>{launchDate}</span>}
                  </p>
                </div>

                {/* Right side: days + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {daysUntil && (
                    <span className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full border tabular-nums",
                      daysColor
                    )}>
                      {daysUntil}
                    </span>
                  )}
                  {isClickable && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
