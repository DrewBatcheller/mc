import { DollarSign, Repeat, CreditCard, TrendingUp, BarChart3, Percent, PieChart } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

interface DrilldownStatCardsProps {
  month?: string
}

export function DrilldownStatCards({ month = "2025-01" }: DrilldownStatCardsProps) {
  // Sample data for different months
  const monthlyData: Record<string, { revenue: number; mrr: number; expenses: number; profit: number; ebitda: number; ebitdaMargin: string; grossMargin: string }> = {
    "2025-01": { revenue: 23000, mrr: 17500, expenses: 7446, profit: 14747, ebitda: 13420, ebitdaMargin: "-55.3%", grossMargin: "64.1%" },
    "2025-02": { revenue: 25400, mrr: 19200, expenses: 8100, profit: 16200, ebitda: 15100, ebitdaMargin: "-40.5%", grossMargin: "68.2%" },
    "2025-03": { revenue: 28900, mrr: 21800, expenses: 8800, profit: 19100, ebitda: 18500, ebitdaMargin: "-35.2%", grossMargin: "69.5%" },
    "2025-04": { revenue: 22100, mrr: 16700, expenses: 7200, profit: 13900, ebitda: 12800, ebitdaMargin: "-42.1%", grossMargin: "67.4%" },
    "2025-05": { revenue: 31200, mrr: 23600, expenses: 9400, profit: 20800, ebitda: 19800, ebitdaMargin: "-32.1%", grossMargin: "69.9%" },
    "2025-06": { revenue: 27800, mrr: 21000, expenses: 8600, profit: 18200, ebitda: 17200, ebitdaMargin: "-38.1%", grossMargin: "69.1%" },
  }

  const getMonthlyStats = () => {
    const data = monthlyData[month] || monthlyData["2025-01"]
    
    const row1 = [
      { label: "Total Revenue", value: data.revenue, icon: DollarSign, currency: true },
      { label: "Total MRR", value: data.mrr, icon: Repeat, currency: true },
      { label: "Total Expenses", value: data.expenses, icon: CreditCard, currency: true },
    ]

    const row2 = [
      { label: "Net Profit", value: data.profit, sub: "After Taxes & Reserve Allocations", icon: BarChart3, currency: true },
      { label: "EBITDA", value: data.ebitda, sub: "Before Taxes & Revenue Allocation", icon: TrendingUp, currency: true },
      { label: "EBITDA Margin %", value: data.ebitdaMargin, icon: Percent },
      { label: "Gross Margin %", value: data.grossMargin, icon: PieChart },
    ]

    return { row1, row2 }
  }

  const { row1, row2 } = getMonthlyStats()
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {row1.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  )
}
