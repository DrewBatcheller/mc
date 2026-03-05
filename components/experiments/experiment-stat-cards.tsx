'use client'

import { FlaskConical, CheckCircle, XCircle, HelpCircle, DollarSign, Calendar } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"

function parseCur(v: unknown): number {
  if (typeof v === 'number') return v
  return parseFloat(
    String(v ?? '0')
      .replace(/k/i, '000')
      .replace(/m/i, '000000')
      .replace(/[^0-9.]/g, '')
  ) || 0
}

export function ExperimentStatCards({ clientId }: { clientId?: string }) {
  const { data, isLoading } = useAirtable('experiments', {
    fields: ['Test Status', 'Revenue Added (MRR) (Regular Format)'],
    filterExtra: clientId ? `{Record ID (from Brand Name)} = "${clientId}"` : undefined,
  })

  const exps = data ?? []
  const total        = exps.length
  const pending      = exps.filter(r => String(r.fields['Test Status']) === 'Pending').length
  const live         = exps.filter(r => String(r.fields['Test Status']) === 'Live - Collecting Data').length
  const inconclusive = exps.filter(r => String(r.fields['Test Status']) === 'Inconclusive').length
  const unsuccessful = exps.filter(r => String(r.fields['Test Status']) === 'Unsuccessful').length
  const successful   = exps.filter(r => String(r.fields['Test Status']) === 'Successful').length

  const totalMrr = exps
    .filter(r => String(r.fields['Test Status']) === 'Successful')
    .reduce((sum, r) => sum + parseCur(r.fields['Revenue Added (MRR) (Regular Format)']), 0)

  // ── Row 1: overview (3 cards) ─────────────────────────────────────────────
  const overviewStats = [
    { label: "Total Experiments",  value: isLoading ? '—' : String(total),   icon: FlaskConical },
    { label: "Scheduled",          value: isLoading ? '—' : String(pending),  icon: Calendar },
    { label: "Live",               value: isLoading ? '—' : String(live),     icon: FlaskConical },
  ]

  // ── Row 2: outcomes + revenue (4 cards) ──────────────────────────────────
  const outcomeStats = [
    { label: "Inconclusive",                  value: isLoading ? '—' : String(inconclusive), icon: HelpCircle },
    { label: "Unsuccessful",                  value: isLoading ? '—' : String(unsuccessful), icon: XCircle },
    { label: "Successful",                    value: isLoading ? '—' : String(successful),   icon: CheckCircle },
    { label: "Total Revenue Added (New MRR)", value: isLoading ? 0   : totalMrr,             icon: DollarSign, currency: true },
  ]

  return (
    <div className="space-y-3">
      {/* Row 1 — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {overviewStats.map(s => <MetricCard key={s.label} {...s} small />)}
      </div>
      {/* Row 2 — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {outcomeStats.map(s => <MetricCard key={s.label} {...s} small />)}
      </div>
    </div>
  )
}
