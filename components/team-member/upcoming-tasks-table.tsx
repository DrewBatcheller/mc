"use client"

import { cn } from "@/lib/utils"

interface Task {
  id: string
  name: string
  category: "Design" | "Development"
  sprint: string
  startDate: string
  dueDate: string
  status: "Ready to Start" | "In Progress" | "Pending Approval" | "Complete"
}

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

export const allTasks: Task[] = [
  {
    id: "1",
    name: "Submit Mockups",
    category: "Design",
    sprint: "Vita Hustle | 2026 January 16",
    startDate: "January 2, 2026",
    dueDate: "January 7, 2026",
    status: "Ready to Start",
  },
  {
    id: "2",
    name: "Submit Mockups",
    category: "Design",
    sprint: "Cosara | 2026 January 19",
    startDate: "January 5, 2026",
    dueDate: "January 8, 2026",
    status: "Ready to Start",
  },
  {
    id: "3",
    name: "Submit Mockups",
    category: "Design",
    sprint: "Cosara | 2026 February 11",
    startDate: "January 28, 2026",
    dueDate: "February 4, 2026",
    status: "Ready to Start",
  },
  {
    id: "4",
    name: "Submit Mockups",
    category: "Design",
    sprint: "Paleo Brand | 2026 February 12",
    startDate: "February 12, 2026",
    dueDate: "February 24, 2026",
    status: "In Progress",
  },
  {
    id: "5",
    name: "Submit Mockups",
    category: "Design",
    sprint: "Dr Woof Apparel | 2026 February 20",
    startDate: "February 20, 2026",
    dueDate: "February 28, 2026",
    status: "Ready to Start",
  },
]

function getStatusStyle(status: Task["status"]) {
  switch (status) {
    case "Ready to Start":
      return "bg-emerald-600 text-white"
    case "In Progress":
      return "bg-amber-500 text-white"
    case "Pending Approval":
      return "bg-purple-600 text-white"
    case "Complete":
      return "bg-sky-600 text-white"
  }
}

function getCategoryStyle(category: Task["category"]) {
  return category === "Design"
    ? "bg-sky-500/10 text-sky-600 border border-sky-500/20"
    : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
}

function parseDate(dateString: string): Date {
  return new Date(dateString)
}

interface UpcomingTasksTableProps {
  onTaskClick?: (task: ScheduleTask) => void
  memberFilter?: string
  deptFilter?: string
  statusFilter?: string
}

export function UpcomingTasksTable({ onTaskClick, memberFilter, deptFilter, statusFilter }: UpcomingTasksTableProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const upcomingTasks = allTasks.filter((task) => {
    const startDate = parseDate(task.startDate)
    if (startDate <= today) return false
    if (deptFilter && deptFilter !== "All Departments" && deptFilter !== "All") {
      if (task.category !== deptFilter) return false
    }
    if (statusFilter && statusFilter !== "All Status") {
      if (task.status !== statusFilter) return false
    }
    return true
  })

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Upcoming Tasks</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Tasks that are scheduled but not yet started
        </p>
      </div>
      {upcomingTasks.length > 0 ? (
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
              {upcomingTasks.map((task) => {
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
          <p className="text-[13px] text-muted-foreground">
            No upcoming tasks.
          </p>
        </div>
      )}
    </div>
  )
}
