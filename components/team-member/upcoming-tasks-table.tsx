"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"

interface AirtableTask {
  id: string
  name: string
  teamFacingName: string
  category: string
  sprint: string
  startDate: string
  dueDate: string
  status: string
  assigned: string
  batchRecordId: string
  openUrl: string
  clientRecordId: string
}

export interface ScheduleTask {
  title: string
  teamFacingName: string
  client: string
  department: string
  startDate?: string
  dueDate: string
  status: "Pending" | "In Progress" | "Overdue" | "Complete"
  assigned: string
  taskId: string
  batchId?: string
  batchRecordId?: string
  openUrl?: string
  clientRecordId?: string
  experimentIds?: string[]
  experiments?: { id: string; name: string; figmaUrl?: string; convertId?: string; qaApproved?: boolean; qaReportUrl?: string }[]
}

/**
 * Derive the display status from raw Airtable data + today's date.
 *
 * Rules (in priority order):
 *  1. Done/Complete in Airtable → "Complete"
 *  2. Past due date             → "Overdue"
 *  3. Start Date ≤ Today ≤ Due  → "In Progress"
 *  4. Anything else             → "Pending"
 */
export function deriveTaskStatus(
  airtableStatus: string,
  startDate: string | undefined,
  dueDate: string | undefined,
  today: Date,
): "Pending" | "In Progress" | "Overdue" | "Complete" {
  if (airtableStatus === 'Complete' || airtableStatus === 'Done') return 'Complete'
  if (dueDate) {
    const due = parseIsoDate(dueDate)
    if (due < today) return 'Overdue'
    if (startDate) {
      const start = parseIsoDate(startDate)
      if (start <= today) return 'In Progress'
    }
  }
  return 'Pending'
}

function convertToScheduleTask(task: AirtableTask, today: Date): ScheduleTask {
  const sprintStr = typeof task.sprint === 'string' ? task.sprint : String(task.sprint ?? '')
  const clientName = sprintStr.split(" | ")[0] || sprintStr
  return {
    title: task.name,
    teamFacingName: task.teamFacingName,
    client: clientName,
    department: task.category || "Development",
    startDate: task.startDate,
    dueDate: task.dueDate,
    status: deriveTaskStatus(task.status, task.startDate, task.dueDate, today),
    assigned: task.assigned,
    taskId: task.id,
    batchId: task.id,
    batchRecordId: task.batchRecordId,
    openUrl: task.openUrl,
    clientRecordId: task.clientRecordId,
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "In Progress":  return "bg-amber-500 text-white"
    case "Overdue":      return "bg-red-600 text-white"
    case "Complete":     return "bg-emerald-600 text-white"
    case "Pending":
    default:             return "bg-sky-600 text-white"
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

interface UpcomingTasksTableProps {
  onTaskClick?: (task: ScheduleTask) => void
  memberFilter?: string
  deptFilter?: string
  statusFilter?: string
}

export function UpcomingTasksTable({ onTaskClick, memberFilter, deptFilter, statusFilter }: UpcomingTasksTableProps) {
  // Build server-side filter
  const filterParts: string[] = []
  if (memberFilter && memberFilter !== "All Members") {
    filterParts.push(`FIND("${memberFilter}", {Assigned to}) > 0`)
  }
  if (deptFilter && deptFilter !== "All Departments") {
    filterParts.push(`{Department} = "${deptFilter}"`)
  }
  const filterExtra = filterParts.length > 0
    ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(", ")})`
    : undefined

  const { data: rawTasks, isLoading } = useAirtable<Record<string, unknown>>('tasks', {
    sort: [{ field: 'Start Date', direction: 'asc' }],
    ...(filterExtra ? { filterExtra } : {}),
  })

  const tasks = useMemo<AirtableTask[]>(() => {
    return (rawTasks ?? []).map(r => {
      const f = r.fields as Record<string, unknown>
      const assignedRaw = f['Assigned to']
      const assigned = Array.isArray(assignedRaw) ? (assignedRaw[0] as string ?? '') : (assignedRaw as string ?? '')
      return {
        id: r.id,
        name: (f['Client Facing Name'] as string) ?? (f['Team Facing Name'] as string) ?? 'Untitled',
        teamFacingName: (f['Team Facing Name'] as string) ?? '',
        category: (f['Department'] as string) ?? '',
        sprint: Array.isArray(f['Brand Name (from Client)'])
          ? ((f['Brand Name (from Client)'] as string[])[0] ?? (f['Batch'] as string) ?? '')
          : ((f['Brand Name (from Client)'] as string) ?? (f['Batch'] as string) ?? ''),
        startDate: (f['Start Date'] as string) ?? '',
        dueDate: (f['Due Date'] as string) ?? '',
        status: (f['Status'] as string) ?? '',
        assigned,
        batchRecordId: Array.isArray(f['Record ID (from Batch)'])
          ? ((f['Record ID (from Batch)'] as string[])[0] ?? '')
          : ((f['Record ID (from Batch)'] as string) ?? ''),
        openUrl: (f['Open URL'] as string) ?? '',
        clientRecordId: Array.isArray(f['Record ID (from Client)'])
          ? ((f['Record ID (from Client)'] as string[])[0] ?? '')
          : ((f['Record ID (from Client)'] as string) ?? ''),
      }
    })
  }, [rawTasks])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const upcomingTasks = useMemo(() => {
    return tasks.filter((task) => {
      const derived = deriveTaskStatus(task.status, task.startDate, task.dueDate, today)
      // This table shows only truly pending (not yet started) tasks
      if (derived !== 'Pending') return false
      if (statusFilter && statusFilter !== "All Status" && statusFilter !== "Pending") return false
      return true
    })
  }, [tasks, statusFilter, today])

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Upcoming Tasks</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Tasks that are scheduled but not yet started</p>
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
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Task</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sprint</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upcomingTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick && onTaskClick(convertToScheduleTask(task, today))}
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
                    {(() => {
                      const derived = deriveTaskStatus(task.status, task.startDate, task.dueDate, today)
                      return (
                        <span className={cn("px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap", getStatusStyle(derived))}>
                          {derived}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-16 flex flex-col items-center justify-center text-center">
          <p className="text-[13px] text-muted-foreground">No upcoming tasks.</p>
        </div>
      )}
    </div>
  )
}
