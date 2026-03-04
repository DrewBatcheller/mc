"use client"

import { useMemo } from "react"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"

interface AirtableTask {
  id: string
  name: string
  category: string
  sprint: string
  startDate: string
  dueDate: string
  status: string
  assigned: string
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

function convertToScheduleTask(task: AirtableTask): ScheduleTask {
  const clientName = task.sprint.split(" | ")[0] || task.sprint
  return {
    title: task.name,
    client: clientName,
    department: task.category || "Development",
    dueDate: task.dueDate,
    status: "Pending",
    assigned: task.assigned,
    batchId: task.id,
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Ready to Start": return "bg-emerald-600 text-white"
    case "In Progress": return "bg-amber-500 text-white"
    case "Pending Approval": return "bg-purple-600 text-white"
    case "Complete": return "bg-sky-600 text-white"
    case "Pending": return "bg-emerald-600 text-white"
    case "Overdue": return "bg-red-600 text-white"
    default: return "bg-muted text-muted-foreground"
  }
}

function getCategoryStyle(category: string) {
  return category === "Design"
    ? "bg-sky-500/10 text-sky-600 border border-sky-500/20"
    : category === "Development"
    ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
    : "bg-muted/50 text-muted-foreground border border-border"
}

function parseIsoDate(dateString: string): Date {
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const [y, m, d] = dateString.split("-").map(Number)
    const dt = new Date(y, m - 1, d)
    dt.setHours(0, 0, 0, 0)
    return dt
  }
  const dt = new Date(dateString)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function formatDate(dateString: string): string {
  if (!dateString) return "—"
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const [y, m, d] = dateString.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
  return dateString
}

interface InProgressTasksTableProps {
  onTaskClick?: (task: ScheduleTask) => void
  memberFilter?: string
  deptFilter?: string
  statusFilter?: string
}

export function InProgressTasksTable({ onTaskClick, memberFilter, deptFilter, statusFilter }: InProgressTasksTableProps) {
  // Build server-side filter
  const filterParts: string[] = []
  if (memberFilter && memberFilter !== "All Members") {
    filterParts.push(`FIND("${memberFilter}", {Assigned To}) > 0`)
  }
  if (deptFilter && deptFilter !== "All Departments") {
    filterParts.push(`{Department} = "${deptFilter}"`)
  }
  const filterExtra = filterParts.length > 0
    ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(", ")})`
    : undefined

  const { data: rawTasks, isLoading } = useAirtable<Record<string, unknown>>('tasks', {
    fields: ['Client Facing Name', 'Start Date', 'Due Date', 'Status', 'Department', 'Assigned To', 'Sprint'],
    sort: [{ field: 'Start Date', direction: 'asc' }],
    ...(filterExtra ? { filterExtra } : {}),
  })

  const tasks = useMemo<AirtableTask[]>(() => {
    return (rawTasks ?? []).map(r => {
      const f = r.fields as Record<string, unknown>
      const assignedRaw = f['Assigned To']
      const assigned = Array.isArray(assignedRaw) ? (assignedRaw[0] as string ?? '') : (assignedRaw as string ?? '')
      return {
        id: r.id,
        name: (f['Client Facing Name'] as string) ?? (f['Name'] as string) ?? 'Untitled',
        category: (f['Department'] as string) ?? '',
        sprint: (f['Sprint'] as string) ?? '',
        startDate: (f['Start Date'] as string) ?? '',
        dueDate: (f['Due Date'] as string) ?? '',
        status: (f['Status'] as string) ?? '',
        assigned,
      }
    })
  }, [rawTasks])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const inProgressTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.startDate || !task.dueDate) return false
      const startDate = parseIsoDate(task.startDate)
      const dueDate = parseIsoDate(task.dueDate)
      if (!(startDate <= today && today <= dueDate)) return false
      if (statusFilter && statusFilter !== "All Status") {
        if (task.status !== statusFilter) return false
      }
      return true
    })
  }, [tasks, statusFilter, today])

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">In Progress Tasks</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Tasks currently being worked on</p>
        </div>
        <div className="px-5 py-16 flex items-center justify-center text-[13px] text-muted-foreground">
          Loading…
        </div>
      </div>
    )
  }

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
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sprint</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inProgressTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick && onTaskClick(convertToScheduleTask(task))}
                  className="transition-colors hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {task.category && (
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap", getCategoryStyle(task.category))}>
                          {task.category}
                        </span>
                      )}
                      <span className="text-[13px] text-foreground">{task.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                    {task.sprint || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                    {formatDate(task.startDate)}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                    {formatDate(task.dueDate)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn("px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap", getStatusStyle(task.status))}>
                      {task.status || "—"}
                    </span>
                  </td>
                </tr>
              ))}
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
