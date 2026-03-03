'use client'

import { Phone, UserPlus, Search, Sparkles, TrendingUp, AlertCircle } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"
import { useMemo } from "react"

export function SalesStatCards() {
  const { data: leads, isLoading } = useAirtable('leads', {
    fields: ['Lead Status', 'Stage', 'Date Created'],
  })

  const stats = useMemo(() => {
    const all = leads ?? []
    const now = new Date()
    const thisMonth = all.filter(r => {
      const d = r.fields['Date Created'] as string
      if (!d) return false
      const dt = new Date(d)
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
    })
    return {
      fresh: all.filter(r => String(r.fields['Lead Status'] ?? '') === 'Fresh').length,
      discovery: all.filter(r => String(r.fields['Stage'] ?? '') === 'Qualifying Call').length,
      sales: all.filter(r => String(r.fields['Stage'] ?? '') === 'Sales Call').length,
      converted: all.filter(r => String(r.fields['Lead Status'] ?? '') === 'Client').length,
      stale: all.filter(r => String(r.fields['Lead Status'] ?? '') === 'Stale').length,
      old: all.filter(r => String(r.fields['Lead Status'] ?? '') === 'Old').length,
      wonThisMonth: thisMonth.filter(r => String(r.fields['Lead Status'] ?? '') === 'Client').length,
      lostThisMonth: thisMonth.filter(r => String(r.fields['Lead Status'] ?? '') === 'Lost').length,
    }
  }, [leads])

  const row1 = [
    { label: 'Leads to Clients', value: isLoading ? '—' : String(stats.converted), icon: UserPlus },
    { label: 'Discovery Calls', value: isLoading ? '—' : String(stats.discovery), icon: Search },
    { label: 'Sales Calls', value: isLoading ? '—' : String(stats.sales), icon: Phone },
    { label: 'Fresh Leads', value: isLoading ? '—' : String(stats.fresh), icon: Sparkles },
  ]
  const row2 = [
    { label: 'Stale Leads', value: isLoading ? '—' : String(stats.stale), icon: AlertCircle },
    { label: 'Old Leads', value: isLoading ? '—' : String(stats.old), icon: AlertCircle },
    { label: 'Won This Month', value: isLoading ? '—' : String(stats.wonThisMonth), icon: TrendingUp },
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
