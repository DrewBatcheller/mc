import { DollarSign, Repeat, CreditCard, Receipt, TrendingUp, BarChart3, Percent, PieChart } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

interface FinanceStatCardsProps {
  dateRange?: string
}

export function FinanceStatCards({ dateRange = "All Time" }: FinanceStatCardsProps) {
  // Filter stats based on dateRange (using sample data multipliers for demo purposes)
  const getFilteredStats = () => {
    const multiplier = dateRange === "All Time" ? 1 : dateRange === "Last Month" ? 0.08 : dateRange === "Last 3 Months" ? 0.22 : dateRange === "Last 6 Months" ? 0.45 : 1
    
    return [
      { label: "Total Revenue", value: 2015115.54 * multiplier, icon: DollarSign, currency: true },
      { label: "Total MRR", value: 1311596.28 * multiplier, icon: Repeat, currency: true },
      { label: "Total Expenses", value: 764002.46 * multiplier, icon: CreditCard, currency: true },
      { label: "Processing Fees", value: 53110.20 * multiplier, icon: Receipt, currency: true },
      { label: "EBITDA", value: 1072618.80 * multiplier, sub: "Before Taxes & Revenue Allocation", icon: TrendingUp, currency: true },
      { label: "Net Profit", value: 1179082.96 * multiplier, sub: "After Taxes & Reserve Allocations", icon: BarChart3, currency: true },
      { label: "EBITDA Margin %", value: "14.82%", icon: Percent },
      { label: "Gross Margin %", value: "44.75%", icon: PieChart },
    ]
  }

  const stats = getFilteredStats()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <MetricCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
