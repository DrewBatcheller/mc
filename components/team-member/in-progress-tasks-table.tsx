"use client"

import { useState, useEffect } from "react"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { allTasks } from "./upcoming-tasks-table"

interface ScheduleTask {
  title: string
  client: string
  department: string
  dueDate: string
  status: "Pending" | "Overdue" | "Complete"
  assigned: string
  batchId?: string
  experiments?: { id: string; name: string; figmaUrl?: string; convertId?: string; qaApproved?: boolean; qaReportUrl?: string }[]
}

interface Task {
  id: string
  name: string
  category: "Design" | "Development"
  sprint: string
  startDate: string
  dueDate: string
  status: "Ready to Start" | "In Progress" | "Pending Approval" | "Complete"
}

// Convert local Task to ScheduleTask format for modal compatibility
function convertToScheduleTask(task: Task): ScheduleTask {
  const clientName = task.sprint.split(" | ")[0]
  const department = task.category === "Design" ? "Design" : "Development"
  
  return {
    title: task.name,
    client: clientName,
    department: department,
    dueDate: task.dueDate,
    status: "Pending",
    assigned: "Team Member",
    batchId: task.id,
    experiments: task.name === "Submit Mockups" ? [
      { id: `${task.id}-1`, name: "Test 1" },
      { id: `${task.id}-2`, name: "Test 2" },
      { id: `${task.id}-3`, name: "Test 3" },
    ] : undefined
  }
}

interface InProgressTasksTableProps {
  onTaskClick?: (task: ScheduleTask) => void
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Ready to Start":
      return "bg-emerald-600 text-white"
    case "In Progress":
      return "bg-amber-500 text-white"
    case "Pending Approval":
      return "bg-purple-600 text-white"
    case "Complete":
      return "bg-sky-600 text-white"
    default:
      return "bg-gray-600 text-white"
  }
}

function getCategoryStyle(category: string) {
  return category === "Design"
    ? "bg-sky-500/10 text-sky-600 border border-sky-500/20"
    : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
}

function parseDate(dateString: string): Date {
  return new Date(dateString)
}

export function InProgressTasksTable({ onTaskClick }: InProgressTasksTableProps) {
  const [inProgressTasks, setInProgressTasks] = useState<typeof allTasks>([])

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setInProgressTasks(
      allTasks.filter((task) => {
        const startDate = parseDate(task.startDate)
        const dueDate = parseDate(task.dueDate)
        return startDate <= today && today <= dueDate
      })
    )
  }, [])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">In Progress Tasks</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Tasks currently being worked on
        </p>
      </div>
      {inProgressTasks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Task
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Sprint
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inProgressTasks.map((task) => {
                const isClickable = task.name === "Submit Mockups" || task.name === "Submit Tests for QA" || task.name === "Submit QA Report(s)"
                return (
                  <tr 
                    key={task.id}
                    onClick={() => isClickable && onTaskClick && onTaskClick(convertToScheduleTask(task))}
                    className={cn(
                      "transition-colors",
                      isClickable ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"
                    )}
                  >
                    <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap",
                          getCategoryStyle(task.category)
                        )}
                      >
                        {task.category}
                      </span>
                      <span className="text-[13px] text-foreground">{task.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                    {task.sprint}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                    {task.startDate}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                    {task.dueDate}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap",
                        getStatusStyle(task.status)
                      )}
                    >
                      {task.status}
                    </span>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[13px] text-muted-foreground">
            No tasks exist or match the current filters.
          </p>
        </div>
      )}
    </div>
  )
}
