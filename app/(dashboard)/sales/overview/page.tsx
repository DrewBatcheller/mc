import { SalesStatCards } from "@/components/sales/sales-stat-cards"
import {
  LeadsByAttributionChart,
  PipelineCountChart,
  DaysToCloseChart,
} from "@/components/sales/sales-charts"

export default function SalesOverviewPage() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Sales Overview
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Pipeline summary and key metrics
          </p>
        </div>
      </div>

      <SalesStatCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LeadsByAttributionChart />
        <PipelineCountChart />
      </div>

      <DaysToCloseChart />
    </>
  )
}
