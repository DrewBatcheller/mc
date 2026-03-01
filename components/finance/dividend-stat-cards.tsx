"use client"

import { DollarSign, TrendingUp } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

interface DividendStatCardsProps {
  year?: string
}

const allData = [
  { yearIndex: 2022, totalDividend: 11838.52, connorDividend: 4735.41, jaydenDividend: 7103.11 },
  { yearIndex: 2022, totalDividend: 22225.67, connorDividend: 8890.27, jaydenDividend: 13335.40 },
  { yearIndex: 2022, totalDividend: 13419.97, connorDividend: 5367.99, jaydenDividend: 8051.98 },
  { yearIndex: 2022, totalDividend: 22122.18, connorDividend: 8848.87, jaydenDividend: 13273.31 },
  { yearIndex: 2023, totalDividend: 21515.52, connorDividend: 8606.21, jaydenDividend: 12909.31 },
  { yearIndex: 2023, totalDividend: 21685.14, connorDividend: 8674.06, jaydenDividend: 13011.08 },
  { yearIndex: 2023, totalDividend: 19315.82, connorDividend: 7726.33, jaydenDividend: 11589.49 },
  { yearIndex: 2023, totalDividend: 7364.85, connorDividend: 2945.94, jaydenDividend: 4418.91 },
  { yearIndex: 2023, totalDividend: 13887.20, connorDividend: 5554.88, jaydenDividend: 8332.32 },
  { yearIndex: 2023, totalDividend: -11566.75, connorDividend: -4626.70, jaydenDividend: -6940.05 },
  { yearIndex: 2023, totalDividend: 854.93, connorDividend: 341.97, jaydenDividend: 512.96 },
  { yearIndex: 2023, totalDividend: 14564.14, connorDividend: 5825.66, jaydenDividend: 8738.49 },
  { yearIndex: 2023, totalDividend: 5220.05, connorDividend: 2088.02, jaydenDividend: 3132.03 },
  { yearIndex: 2023, totalDividend: 8179.20, connorDividend: 3271.68, jaydenDividend: 4907.52 },
  { yearIndex: 2023, totalDividend: 40300.38, connorDividend: 16120.15, jaydenDividend: 24180.23 },
  { yearIndex: 2023, totalDividend: 17871.14, connorDividend: 7148.46, jaydenDividend: 10722.69 },
  { yearIndex: 2024, totalDividend: 40519.77, connorDividend: 16207.91, jaydenDividend: 24311.86 },
  { yearIndex: 2024, totalDividend: 42745.11, connorDividend: 17098.04, jaydenDividend: 25647.07 },
  { yearIndex: 2024, totalDividend: 38335.50, connorDividend: 15334.20, jaydenDividend: 23001.30 },
  { yearIndex: 2024, totalDividend: 59501.71, connorDividend: 23800.68, jaydenDividend: 35701.03 },
  { yearIndex: 2024, totalDividend: 68533.61, connorDividend: 27413.44, jaydenDividend: 41120.16 },
  { yearIndex: 2024, totalDividend: 55460.30, connorDividend: 22184.12, jaydenDividend: 33276.18 },
  { yearIndex: 2024, totalDividend: 38200.80, connorDividend: 15280.32, jaydenDividend: 22920.48 },
  { yearIndex: 2024, totalDividend: 47300.60, connorDividend: 18920.24, jaydenDividend: 28380.36 },
  { yearIndex: 2024, totalDividend: 65100.40, connorDividend: 26040.16, jaydenDividend: 39060.24 },
  { yearIndex: 2024, totalDividend: 69500.20, connorDividend: 27800.08, jaydenDividend: 41700.12 },
  { yearIndex: 2024, totalDividend: 53800.90, connorDividend: 21520.36, jaydenDividend: 32280.54 },
  { yearIndex: 2024, totalDividend: 35700.40, connorDividend: 14280.16, jaydenDividend: 21420.24 },
  { yearIndex: 2025, totalDividend: 18017.47, connorDividend: 7206.99, jaydenDividend: 10810.48 },
  { yearIndex: 2025, totalDividend: 22500.80, connorDividend: 9000.32, jaydenDividend: 13500.48 },
]

export function DividendStatCards({ year = "all" }: DividendStatCardsProps) {
  // Filter data based on year selection
  const getFilteredTotals = () => {
    let filteredData = allData
    
    if (year !== "all") {
      const yearNum = parseInt(year)
      filteredData = allData.filter(d => d.yearIndex === yearNum)
    }

    const totalPayouts = filteredData.reduce((sum, d) => sum + d.totalDividend, 0)
    const connorPayouts = filteredData.reduce((sum, d) => sum + d.connorDividend, 0)
    const jaydenPayouts = filteredData.reduce((sum, d) => sum + d.jaydenDividend, 0)

    return { totalPayouts, connorPayouts, jaydenPayouts }
  }

  const { totalPayouts, connorPayouts, jaydenPayouts } = getFilteredTotals()

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
