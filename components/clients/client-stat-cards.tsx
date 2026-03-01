import { Users, UserCheck, Repeat, TrendingUp, Star, Clock } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

const row1 = [
  { label: "Total Clients", value: 70, icon: Users },
  { label: "Active Clients", value: 10, icon: UserCheck },
  { label: "Monthly Recurring Revenue (USD)", value: 59000.00, icon: Repeat, currency: true },
  { label: "Average LTV", value: 33008.41, icon: TrendingUp, currency: true },
]

const row2 = [
  { label: "Average Client Sentiment", value: "3.63", sub: "Active Clients*", icon: Star },
  { label: "Clients in Onboarding", value: 35, icon: Clock },
]

export function ClientStatCards() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row1.map((s) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            currency={s.currency}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {row2.map((s) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            icon={s.icon}
          />
        ))}
      </div>
    </div>
  )
}
