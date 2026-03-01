"use client"

import { cn } from "@/lib/utils"
import { ContentCard } from "@/components/shared/content-card"

interface Task {
  title: string
  category: string
  client: string
  date: string
  urgent: boolean
}

const tasks: Task[] = [
  {
    title: "Submit Strategy",
    category: "Strategy",
    client: "Vita Hustle",
    date: "Dec 31",
    urgent: true,
  },
  {
    title: "Submit Strategy",
    category: "Strategy",
    client: "Cosara",
    date: "Jan 1",
    urgent: true,
  },
  {
    title: "Submit Mockups",
    category: "Design",
    client: "Vita Hustle",
    date: "Jan 7",
    urgent: false,
  },
  {
    title: "Submit Mockups",
    category: "Design",
    client: "Cosara",
    date: "Jan 8",
    urgent: false,
  },
  {
    title: "CRO Accelerator",
    category: "Management",
    client: "N/A",
    date: "Jan 12",
    urgent: false,
  },
  {
    title: "Submit Tests for QA",
    category: "Development",
    client: "Vita Hustle",
    date: "Jan 14",
    urgent: false,
  },
]

const categoryColors: Record<string, string> = {
  Strategy: "bg-blue-50 text-blue-600",
  Design: "bg-violet-50 text-violet-600",
  Management: "bg-amber-50 text-amber-600",
  Development: "bg-emerald-50 text-emerald-600",
}

export function UpcomingTasks() {
  return (
    <ContentCard
      title="Upcoming Tasks"
    >
      <div className="divide-y divide-border">
        {tasks.map((task, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  task.urgent ? "bg-red-500" : "bg-border"
                )}
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-medium text-foreground truncate">
                  {task.title}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {task.client}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span
                className={cn(
                  "hidden sm:inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                  categoryColors[task.category] ?? "bg-accent text-muted-foreground"
                )}
              >
                {task.category}
              </span>
              <span className="text-[12px] text-muted-foreground tabular-nums min-w-[48px] text-right">
                {task.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ContentCard>
  )
}
