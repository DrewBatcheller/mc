import { SalesCalendar } from "@/components/sales/sales-calendar"

export default function SalesTasksPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Sales Tasks
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          View upcoming sales calls and tasks
        </p>
      </div>

      <SalesCalendar />
    </>
  )
}
