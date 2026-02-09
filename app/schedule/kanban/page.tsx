"use client"

import { AppShell } from "@/components/v2/app-shell"
import { ScheduleContent } from "@/components/v2/schedule/schedule-content"

export default function KanbanPage() {
  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Kanban</h1>
        <p className="text-sm text-muted-foreground mb-6">Organize tasks by status</p>
      </div>
      <ScheduleContent initialView="kanban" />
    </AppShell>
  )
}
