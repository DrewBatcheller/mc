"use client"

import { useMemo } from "react"
import { Clock } from "lucide-react"
import { FinancialCard } from "@/components/v2/financial/financial-card"
import type { AirtableRecord, TaskFields } from "@/lib/v2/types"

function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function UpcomingTasksSection({
  tasks,
}: {
  tasks: AirtableRecord<TaskFields>[]
}) {
  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter((t) => {
        const status = t.fields.Status?.toLowerCase()
        return t.fields["Due Date"] && status !== "done" && status !== "complete"
      })
      .sort((a, b) => {
        const da = new Date(a.fields["Due Date"] || 0).getTime()
        const db = new Date(b.fields["Due Date"] || 0).getTime()
        return da - db
      })
      .slice(0, 6)
  }, [tasks])

  return (
    <FinancialCard title="Upcoming Tasks">
      <div className="flex flex-col gap-3">
        {upcomingTasks.map((task) => {
          const overdue =
            task.fields["Due Date"] &&
            new Date(task.fields["Due Date"]) < new Date()
          return (
            <div
              key={task.id}
              className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {task.fields["Team Facing Name"]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.fields.Department || "N/A"} -- {task.fields["Brand Name (from Batch)"] || "N/A"}
                </p>
              </div>
              <span
                className={`text-xs shrink-0 ml-2 ${
                  overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {formatDate(task.fields["Due Date"])}
              </span>
            </div>
          )
        })}
        {upcomingTasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming tasks.</p>
        )}
      </div>
    </FinancialCard>
  )
}
