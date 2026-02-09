"use client"

import { AppShell } from "@/components/v2/app-shell"
import { ScheduleContent } from "@/components/v2/schedule/schedule-content"

export default function CalendarPage() {
  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Calendar</h1>
        <p className="text-sm text-muted-foreground mb-6">View tasks in calendar format</p>
      </div>
      <ScheduleContent initialView="calendar" />
    </AppShell>
  )
}
