import { Phone, UserPlus, Search, Sparkles } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

const row1 = [
  { label: "Leads to Clients", value: "3", icon: UserPlus },
  { label: "Discovery Calls", value: "12", icon: Search },
  { label: "Sales Calls", value: "0", icon: Phone },
  { label: "Fresh Leads", value: "3", icon: Sparkles },
]

const row2 = [
  { label: "Stale Leads", value: "75", icon: Search },
  { label: "Old Leads", value: "385", icon: Search },
  { label: "Won This Month", value: "1", icon: UserPlus },
  { label: "Lost This Month", value: "1", icon: UserPlus },
]

export function SalesStatCards() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {row1.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  )
}
