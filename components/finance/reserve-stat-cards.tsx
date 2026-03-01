"use client"

import { Wallet, TrendingUp, TrendingDown } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

interface ReserveStatCardsProps {
  year?: string
}

const allData = [
  { yearIndex: 2022, balance: 6970.69, allocations: 6970.69, deallocations: 0 },
  { yearIndex: 2023, balance: 24445.09, allocations: 13747.66, deallocations: -178.56 },
  { yearIndex: 2024, balance: 84191.06, allocations: 62410.47, deallocations: -970.45 },
  { yearIndex: 2025, balance: 105625.00, allocations: 21433.94, deallocations: 0 },
]

export function ReserveStatCards({ year = "all" }: ReserveStatCardsProps) {
  // Filter data based on year selection
  const getFilteredTotals = () => {
    let filteredData = allData

    if (year !== "all") {
      const yearNum = parseInt(year)
      filteredData = allData.filter(d => d.yearIndex === yearNum)
    }

    const currentBalance = filteredData.length > 0 ? filteredData[filteredData.length - 1].balance : 0
    const allocations = filteredData.reduce((sum, d) => sum + d.allocations, 0)
    const deallocations = filteredData.reduce((sum, d) => sum + d.deallocations, 0)

    return { currentBalance, allocations, deallocations }
  }

  const { currentBalance, allocations, deallocations } = getFilteredTotals()

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
