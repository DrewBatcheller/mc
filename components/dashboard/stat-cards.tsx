import { Users, FlaskConical, FolderKanban, TrendingUp } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

const stats = [
  { label: "Total Clients", value: "70", sub: "10 active", icon: Users },
  { label: "Total Experiments", value: "535", sub: "0 live", icon: FlaskConical },
  { label: "Active Batches", value: "0", sub: "of 192 total", icon: FolderKanban },
  { label: "Avg Win Rate", value: "0%", sub: "from 0 completed", icon: TrendingUp },
]

export function StatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <MetricCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
