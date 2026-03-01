import { TeamSchedule } from "@/components/team/team-schedule"

export const metadata = { title: "Team Schedule", description: "View and manage team tasks across calendar, kanban, and list views." }

export default function TeamSchedulePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Schedule</h1>
        <p className="text-[13px] text-muted-foreground mt-1">View and manage team tasks across different views.</p>
      </div>
      <TeamSchedule />
    </div>
  )
}
