"use client"

import { DollarSign, TrendingUp } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

export function DividendStatCards({ year = "all" }: { year?: string }) {
  const { data: rawDividends } = useAirtable('dividends', {
    fields: ['Dividends Total', 'Connor', 'Jayden', 'Month & Year (from Profit & Loss (Link))'],
  })

  const { totalPayouts, connorPayouts, jaydenPayouts } = useMemo(() => {
    if (!rawDividends?.length) return { totalPayouts: 0, connorPayouts: 0, jaydenPayouts: 0 }

    const yearNum = year !== 'all' ? parseInt(year) : null

    const filtered = yearNum
      ? rawDividends.filter(r => {
          const monthYear = String(
            Array.isArray(r.fields['Month & Year (from Profit & Loss (Link))'])
              ? r.fields['Month & Year (from Profit & Loss (Link))'][0]
              : r.fields['Month & Year (from Profit & Loss (Link))']
            ?? ''
          )
          return monthYear.endsWith(String(yearNum))
        })
      : rawDividends

    let totalPayouts = 0
    let connorPayouts = 0
    let jaydenPayouts = 0

    for (const r of filtered) {
      totalPayouts += parseCurrency(r.fields['Dividends Total'] as string)
      connorPayouts += parseCurrency(r.fields['Connor'] as string)
      jaydenPayouts += parseCurrency(r.fields['Jayden'] as string)
    }

    return { totalPayouts, connorPayouts, jaydenPayouts }
  }, [rawDividends, year])

  const cards = [
    { label: "Total Dividend Payouts", value: totalPayouts, icon: DollarSign, currency: true },
    { label: "Dividend Payouts Connor", value: connorPayouts, icon: TrendingUp, currency: true },
    { label: "Dividend Payouts Jayden", value: jaydenPayouts, icon: TrendingUp, currency: true },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  )
}
