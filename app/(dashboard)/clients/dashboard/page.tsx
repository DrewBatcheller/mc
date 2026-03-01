import { ClientStatCards } from "@/components/clients/client-stat-cards"
import {
  ClientsOnboardedChart,
  ClientsChurnedChart,
  ChurnReasonsChart,
  MrrByPlanTypeChart,
  ClientRetentionChart,
  RevenueByClientChart,
} from "@/components/clients/client-charts"
import { ClientsTable } from "@/components/clients/clients-table"

export default function ClientDashboardPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Client Overview</h1>
        <p className="text-[13px] text-muted-foreground">
          Key client data points, status, plan details, financial and team info for each client.
        </p>
      </div>

      <ClientStatCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClientsOnboardedChart />
        <ClientsChurnedChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClientRetentionChart />
        <ChurnReasonsChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MrrByPlanTypeChart />
        <RevenueByClientChart />
      </div>

      <ClientsTable />
    </>
  )
}
