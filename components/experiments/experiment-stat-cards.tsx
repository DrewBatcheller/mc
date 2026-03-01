'use client'

import { FlaskConical, CheckCircle, XCircle, HelpCircle, DollarSign, Calendar } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"

function parseCur(v: unknown): number {
  if (typeof v === 'number') return v
  return parseFloat(String(v ?? '0').replace(/[$,KkMm]/g, match => match.toLowerCase() === 'k' ? '000' : match.toLowerCase() === 'm' ? '000000' : '').replace(/[^0-9.]/g, '')) || 0
}

export function ExperimentStatCards() {
  const { data, isLoading } = useAirtable('experiments', {
    fields: ['Test Status', 'Revenue Added (MRR) (Regular Format)'],
  })

  const exps = data ?? []
  const total = exps.length
  const successful = exps.filter(r => String(r.fields['Test Status']) === 'Successful').length
  const unsuccessful = exps.filter(r => String(r.fields['Test Status']) === 'Unsuccessful').length
  const inconclusive = exps.filter(r => String(r.fields['Test Status']) === 'Inconclusive').length
  const live = exps.filter(r => String(r.fields['Test Status']) === 'Live - Collecting Data').length
  const pending = exps.filter(r => String(r.fields['Test Status']) === 'Pending').length

  const totalMrr = exps
    .filter(r => String(r.fields['Test Status']) === 'Successful')
    .reduce((sum, r) => sum + parseCur(r.fields['Revenue Added (MRR) (Regular Format)']), 0)

  const stats = [
    { label: "Total Experiments", value: isLoading ? '—' : String(total), icon: FlaskConical },
    { label: "Scheduled", value: isLoading ? '—' : String(pending), icon: Calendar },
    { label: "Live", value: isLoading ? '—' : String(live), icon: FlaskConical },
    { label: "Inconclusive", value: isLoading ? '—' : String(inconclusive), icon: HelpCircle },
    { label: "Unsuccessful", value: isLoading ? '—' : String(unsuccessful), icon: XCircle },
    { label: "Successful", value: isLoading ? '—' : String(successful), icon: CheckCircle },
    { label: "Total Revenue Added (New MRR)", value: isLoading ? 0 : totalMrr, icon: DollarSign, currency: true },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {stats.map(s => <MetricCard key={s.label} {...s} small />)}
    </div>
  )
}
