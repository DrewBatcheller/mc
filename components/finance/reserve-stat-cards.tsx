"use client"

import { Wallet, TrendingUp, TrendingDown } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

export function ReserveStatCards({ year = "all" }: { year?: string }) {
  const { data: rawReserve } = useAirtable('reserve', {
    sort: [{ field: 'DateClean', direction: 'desc' }],
  })

  const { currentBalance, allocations, deallocations } = useMemo(() => {
    if (!rawReserve?.length) return { currentBalance: 0, allocations: 0, deallocations: 0 }

    // Current balance = the most recent record's New Account Balance (always all-time)
    const currentBalance = parseCurrency(rawReserve[0].fields['New Account Balance'] as string)

    // Allocations/deallocations filtered by selected year
    const yearNum = year !== 'all' ? parseInt(year) : null
    const filtered = yearNum
      ? rawReserve.filter(r => {
          const d = String(r.fields['DateClean'] ?? '')
          return d.startsWith(String(yearNum))
        })
      : rawReserve

    let allocations = 0
    let deallocations = 0
    for (const r of filtered) {
      const amt = parseCurrency(r.fields['Allocated Amount'] as string)
      if (amt >= 0) allocations += amt
      else deallocations += amt
    }

    return { currentBalance, allocations, deallocations }
  }, [rawReserve, year])

  const cards = [
    { label: "Current Reserve Balance", value: currentBalance, icon: Wallet, currency: true },
    { label: "Reserve Allocations", value: allocations, icon: TrendingUp, currency: true },
    { label: "Reserve Deallocations", value: deallocations, icon: TrendingDown, currency: true },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  )
}
