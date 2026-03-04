'use client'

import { useMemo } from "react"
import { Phone, UserPlus, Search, Sparkles, TrendingUp, AlertCircle } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"

function daysSince(dateStr: string): number {
  const created = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  created.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
}

export function SalesStatCards() {
  const { data: leads, isLoading: leadsLoading } = useAirtable('leads', {
    fields: ['Date Created', 'Lead Status', 'Stage'],
  })

  // Upcoming call counts — Call Record table, filtered to future Event Start Time
  const { data: callRecords, isLoading: callsLoading } = useAirtable('call-record', {
    fields: ['Event Name', 'Event Start Time'],
  })

  const isLoading = leadsLoading || callsLoading

  const stats = useMemo(() => {
    const all  = leads ?? []
    const now  = new Date()
    const cm   = now.getMonth()
    const cy   = now.getFullYear()

    let fresh = 0, stale = 0, old = 0, converted = 0
    let wonThisMonth = 0, lostThisMonth = 0

    for (const r of all) {
      const status  = String(r.fields['Lead Status'] ?? '')
      const stage   = String(r.fields['Stage'] ?? '')
      const dateStr = String(r.fields['Date Created'] ?? '')

      const isThisMonth = dateStr
        ? (() => { const d = new Date(dateStr); return d.getMonth() === cm && d.getFullYear() === cy })()
        : false

      if (status === 'Client') {
        converted++
        if (isThisMonth) wonThisMonth++
        continue
      }

      // Age-based classification for non-converted leads
      if (dateStr) {
        const age = daysSince(dateStr)
        if (age < 60)       fresh++
        else if (age < 180) stale++
        else                old++
      } else {
        old++
      }

      // Lost = moved to Churned / Rejected; use Date Created as a proximity for "this month"
      if (stage === 'Churned / Rejected' && isThisMonth) lostThisMonth++
    }

    // Upcoming Discovery / Sales calls — only count records where Event Start Time is in the future
    const calls = callRecords ?? []
    const discovery = calls.filter(r => {
      const name  = String(r.fields['Event Name'] ?? '').toLowerCase()
      const start = String(r.fields['Event Start Time'] ?? '')
      return name.includes('discovery') && start && new Date(start) > now
    }).length
    const sales = calls.filter(r => {
      const name  = String(r.fields['Event Name'] ?? '').toLowerCase()
      const start = String(r.fields['Event Start Time'] ?? '')
      return name.includes('sales') && start && new Date(start) > now
    }).length

    return { fresh, stale, old, converted, discovery, sales, wonThisMonth, lostThisMonth }
  }, [leads, callRecords])

  const row1 = [
    { label: 'Leads to Clients', value: isLoading ? '—' : String(stats.converted),    icon: UserPlus },
    { label: 'Upcoming Discovery Calls', value: isLoading ? '—' : String(stats.discovery), icon: Search },
    { label: 'Upcoming Sales Calls',     value: isLoading ? '—' : String(stats.sales),     icon: Phone },
    { label: 'Fresh Leads',      value: isLoading ? '—' : String(stats.fresh),        icon: Sparkles },
  ]
  const row2 = [
    { label: 'Stale Leads',     value: isLoading ? '—' : String(stats.stale),        icon: AlertCircle },
    { label: 'Old Leads',       value: isLoading ? '—' : String(stats.old),          icon: AlertCircle },
    { label: 'Won This Month',  value: isLoading ? '—' : String(stats.wonThisMonth), icon: TrendingUp },
    { label: 'Lost This Month', value: isLoading ? '—' : String(stats.lostThisMonth), icon: TrendingUp },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {row1.map(s => <MetricCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map(s => <MetricCard key={s.label} {...s} />)}
      </div>
    </div>
  )
}
