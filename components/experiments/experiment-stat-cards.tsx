import { FlaskConical, CalendarClock, Radio, HelpCircle, XCircle, CheckCircle2, DollarSign } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"

const row1 = [
  { label: "Total Experiments", value: "535", icon: FlaskConical },
  { label: "Scheduled Experiments", value: "3", icon: CalendarClock },
  { label: "Live Experiments", value: "4", icon: Radio },
]

const row2 = [
  { label: "Inconclusive", value: "60", icon: HelpCircle },
  { label: "Unsuccessful", value: "188", icon: XCircle },
  { label: "Successful", value: "236", icon: CheckCircle2 },
  { label: "Total Revenue Added", value: "$10,170.60", sub: "New MRR", icon: DollarSign },
]

export function ExperimentStatCards() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {row1.map((s) => <MetricCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map((s) => <MetricCard key={s.label} {...s} />)}
      </div>
    </div>
  )
}
