import { StatCards } from "@/components/dashboard/stat-cards"
import { RecentExperiments } from "@/components/dashboard/recent-experiments"
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks"
import { ActivityChart } from "@/components/dashboard/activity-chart"

export default function DashboardPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Overview of your experiments, clients, and business metrics
        </p>
      </div>

      <StatCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityChart />
        <RecentExperiments />
      </div>

      <UpcomingTasks />
    </>
  )
}
