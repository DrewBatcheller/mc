'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { useAirtable } from '@/hooks/use-airtable'
import { StatCards } from "@/components/dashboard/stat-cards"
import { RecentExperiments } from "@/components/dashboard/recent-experiments"
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks"
import { RecentlyDueTasks } from "@/components/dashboard/recently-due-tasks"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { ChevronDown, Users, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Client filter dropdown ─────────────────────────────────────────────────────
function ClientFilter({
  selectedIds,
  onChange,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: clientRecords } = useAirtable('clients', {
    fields: ['Brand Name'],
    sort: [{ field: 'Brand Name', direction: 'asc' }],
  })

  const clients = useMemo(
    () => (clientRecords ?? []).map(r => ({ id: r.id, name: String(r.fields['Brand Name'] ?? '') })),
    [clientRecords]
  )

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const label = selectedIds.length === 0
    ? 'All Clients'
    : selectedIds.length === 1
      ? (clients.find(c => c.id === selectedIds[0])?.name ?? '1 client')
      : `${selectedIds.length} clients`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-[13px] hover:bg-accent/40 transition-colors"
      >
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn("font-medium", selectedIds.length > 0 ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
          {/* Clear filter */}
          {selectedIds.length > 0 && (
            <button
              onClick={() => { onChange([]); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:bg-accent/40 border-b border-border transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear filter
            </button>
          )}
          <div className="max-h-60 overflow-y-auto">
            {clients.map(c => {
              const checked = selectedIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] hover:bg-accent/40 transition-colors text-left"
                >
                  <span className={cn("truncate", checked ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {c.name}
                  </span>
                  {checked && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [clientIds, setClientIds] = useState<string[]>([])

  useEffect(() => {
    if (isLoading || !user) return

    // Team members should go to their team dashboard
    if (user.role === 'team') {
      router.replace('/team')
      return
    }

    // Sales should go to sales overview
    if (user.role === 'sales') {
      router.replace('/sales/overview')
      return
    }

    // Clients should go to their dashboard
    if (user.role === 'client') {
      router.replace('/clients/client-dashboard')
      return
    }

    // Management and Strategy see the main dashboard (this page)
  }, [user, isLoading, router])

  // Only show dashboard content for management/strategy users
  if (user?.role === 'team' || user?.role === 'sales' || user?.role === 'client') {
    return null
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Overview of your experiments, clients, and business metrics
          </p>
        </div>
        <ClientFilter selectedIds={clientIds} onChange={setClientIds} />
      </div>

      <StatCards clientIds={clientIds} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityChart clientIds={clientIds} />
        <RecentExperiments clientIds={clientIds} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingTasks />
        <RecentlyDueTasks />
      </div>
    </>
  )
}
