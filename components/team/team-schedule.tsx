"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"
import type { ScheduleTask } from "@/components/team-member/upcoming-tasks-table"

/* ── Department color maps ── */

const typeStyles: Record<string, { bg: string; border: string; dot: string }> = {
  Strategy:       { bg: "bg-sky-50",     border: "border-sky-200/60",     dot: "bg-sky-500" },
  Design:         { bg: "bg-purple-50",  border: "border-purple-200/60",  dot: "bg-purple-500" },
  Development:    { bg: "bg-emerald-50", border: "border-emerald-200/60", dot: "bg-emerald-500" },
  QA:             { bg: "bg-amber-50",   border: "border-amber-200/60",   dot: "bg-amber-500" },
  Management:     { bg: "bg-gray-100",   border: "border-gray-200/60",    dot: "bg-gray-500" },
  Sales:          { bg: "bg-rose-50",    border: "border-rose-200/60",    dot: "bg-rose-500" },
  "Test Running": { bg: "bg-teal-50",    border: "border-teal-200/60",    dot: "bg-teal-500" },
  Analyst:        { bg: "bg-orange-50",  border: "border-orange-200/60",  dot: "bg-orange-500" },
}

const deptBadge: Record<string, { bg: string; text: string }> = {
  Strategy:       { bg: "bg-sky-50",     text: "text-sky-700" },
  Design:         { bg: "bg-purple-50",  text: "text-purple-700" },
  Development:    { bg: "bg-emerald-50", text: "text-emerald-700" },
  QA:             { bg: "bg-amber-50",   text: "text-amber-700" },
  Management:     { bg: "bg-accent",     text: "text-foreground" },
  Sales:          { bg: "bg-rose-50",    text: "text-rose-700" },
  "Test Running": { bg: "bg-teal-50",    text: "text-teal-700" },
  Analyst:        { bg: "bg-orange-50",  text: "text-orange-700" },
}

const statusBadge: Record<string, { bg: string; text: string }> = {
  Pending:      { bg: "bg-sky-50 border-sky-200",       text: "text-sky-700" },
  "In Progress":{ bg: "bg-amber-50 border-amber-200",   text: "text-amber-700" },
  Overdue:      { bg: "bg-rose-50 border-rose-200",     text: "text-rose-700" },
  Complete:     { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
}

/* ── Calendar helpers ── */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MAX_VISIBLE = 2

const kanbanCols = [
  { id: "Overdue",     label: "Overdue",      dotColor: "bg-rose-500" },
  { id: "In Progress", label: "In Progress",  dotColor: "bg-amber-500" },
  { id: "Pending",     label: "Pending",      dotColor: "bg-sky-500" },
  { id: "Complete",    label: "Complete",     dotColor: "bg-emerald-500" },
]

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number)
  return { year: y, month: m - 1, day: d }
}

function formatShortDate(s: string) {
  if (!s) return "—"
  try {
    const d = parseDate(s)
    return `${MONTHS[d.month].slice(0, 3)} ${d.day}`
  } catch {
    return s
  }
}

/* ══════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                        */
/* ══════════════════════════════════════════════════════ */

export function TeamSchedule({
  simplified = false,
  badgeMode = "dept",
  memberFilter = "All Members",
  deptFilter = "All Departments",
  statusFilter: externalStatusFilter,
  onTaskClick,
}: {
  simplified?: boolean
  /**
   * "dept"   — calendar pills show department color (bg) + status border.
   *             Best for management who need to see who owns what at a glance.
   * "status" — calendar pills show status color only (no dept color).
   *             Best for individual team members who only see their own tasks.
   */
  badgeMode?: "dept" | "status"
  memberFilter?: string
  deptFilter?: string
  statusFilter?: string
  onTaskClick?: (task: ScheduleTask) => void
}) {
  const [view, setView] = useState<"calendar" | "kanban" | "list">("calendar")
  const [search, setSearch] = useState("")
  const [internalStatusFilter, setInternalStatusFilter] = useState("All Status")

  const statusFilter = externalStatusFilter ?? internalStatusFilter

  // Build server-side filter formula from props
  // Always exclude Sales (not a team schedule department)
  const filterParts: string[] = ['{Department} != "Sales"']
  if (memberFilter && memberFilter !== "All Members") {
    filterParts.push(`FIND("${memberFilter}", {Assigned to}) > 0`)
  }
  if (deptFilter && deptFilter !== "All Departments") {
    filterParts.push(`{Department} = "${deptFilter}"`)
  }
  const filterExtra = filterParts.length === 1
    ? filterParts[0]
    : `AND(${filterParts.join(", ")})`

  const { data: rawTasks, isLoading } = useAirtable<Record<string, unknown>>('tasks', {
    sort: [{ field: 'Due Date', direction: 'asc' }],
    ...(filterExtra ? { filterExtra } : {}),
  })

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const allTasks = useMemo<ScheduleTask[]>(() => {
    return (rawTasks ?? []).map(r => {
      const f = r.fields as Record<string, unknown>
      const assignedRaw = f['Assigned to']
      const assigned = Array.isArray(assignedRaw)
        ? (assignedRaw[0] as string ?? '')
        : (assignedRaw as string ?? '')

      const sprintRaw = Array.isArray(f['Brand Name (from Client)'])
        ? ((f['Brand Name (from Client)'] as string[])[0] ?? (f['Batch'] as string) ?? '')
        : ((f['Brand Name (from Client)'] as string) ?? (f['Batch'] as string) ?? '')
      const clientName = sprintRaw.split(" | ")[0] || sprintRaw

      const dueDate = (f['Due Date'] as string) ?? ''
      const startDateRaw = (f['Start Date'] as string) ?? ''

      // Derive status: Done > Overdue (past due) > In Progress (started, not past due) > Pending
      let status: "Pending" | "In Progress" | "Overdue" | "Complete" = "Pending"
      const airtableStatus = (f['Status'] as string) ?? ''
      if (airtableStatus === 'Complete' || airtableStatus === 'Done') {
        status = 'Complete'
      } else if (dueDate) {
        const due = new Date(dueDate + 'T00:00:00')
        due.setHours(0, 0, 0, 0)
        if (due < today) {
          status = 'Overdue'
        } else if (startDateRaw) {
          const start = new Date(startDateRaw + 'T00:00:00')
          start.setHours(0, 0, 0, 0)
          if (start <= today) status = 'In Progress'
        }
      }

      return {
        // Team Facing Name is authoritative for team member display; Client Facing Name is fallback only
        title: (f['Team Facing Name'] as string) || (f['Client Facing Name'] as string) || 'Untitled',
        teamFacingName: (f['Team Facing Name'] as string) ?? '',
        client: clientName || '—',
        department: (f['Department'] as string) ?? '',
        startDate: (f['Start Date'] as string) ?? '',
        dueDate,
        status,
        assigned: assigned || '—',
        taskId: r.id,
        batchId: r.id,
        batchRecordId: Array.isArray(f['Record ID (from Batch)'])
          ? ((f['Record ID (from Batch)'] as string[])[0] ?? '')
          : ((f['Record ID (from Batch)'] as string) ?? ''),
        openUrl: (f['Open URL'] as string) ?? '',
        clientRecordId: Array.isArray(f['Record ID (from Client)'])
          ? ((f['Record ID (from Client)'] as string[])[0] ?? '')
          : ((f['Record ID (from Client)'] as string) ?? ''),
        experimentIds: Array.isArray(f['Experiments Attached (from Batch)'])
          ? (f['Experiments Attached (from Batch)'] as string[]).filter(Boolean)
          : f['Experiments Attached (from Batch)']
            ? [f['Experiments Attached (from Batch)'] as string]
            : [],
      }
    })
  }, [rawTasks, today])

  const allStatuses = ["Pending", "In Progress", "Overdue", "Complete"]

  const filtered = useMemo(() => {
    let res = allTasks
    if (statusFilter !== "All Status") res = res.filter(t => t.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.assigned.toLowerCase().includes(q)
      )
    }
    return res
  }, [allTasks, search, statusFilter])

  const views = [
    { key: "calendar" as const, label: "Calendar", icon: Calendar },
    { key: "kanban" as const,   label: "Kanban",   icon: LayoutGrid },
    { key: "list" as const,     label: "List",     icon: List },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-accent/50 rounded-lg p-1 w-fit">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors",
              view === v.key
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <v.icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters + Content */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-4 py-3 border-b border-border">
          {/* Show internal status filter only when no external one is provided */}
          {externalStatusFilter === undefined && (
            <SelectField
              value={internalStatusFilter}
              onChange={setInternalStatusFilter}
              options={["All Status", ...allStatuses]}
            />
          )}
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tasks…
          </div>
        ) : (
          <>
            {view === "calendar" && (
              <CalendarView tasks={filtered} onTaskClick={onTaskClick} simplified={simplified} badgeMode={badgeMode} />
            )}
            {view === "kanban" && (
              <div className="p-4">
                <KanbanView tasks={filtered} onTaskClick={onTaskClick} />
              </div>
            )}
            {view === "list" && (
              <ListView tasks={filtered} onTaskClick={onTaskClick} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
/*  CALENDAR VIEW                                         */
/* ══════════════════════════════════════════════════════ */

/* ── Status-only styles for "status" badge mode ── */
const calendarStatusStyles: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  Pending:      { bg: "bg-sky-50",     border: "border-sky-200",            dot: "bg-sky-400",    text: "text-foreground" },
  "In Progress":{ bg: "bg-amber-50",   border: "border-amber-300",          dot: "bg-amber-500",  text: "text-foreground" },
  Overdue:      { bg: "bg-rose-50",    border: "border-rose-400 border-dashed", dot: "bg-rose-500", text: "text-rose-700" },
  Complete:     { bg: "bg-emerald-50", border: "border-emerald-300",        dot: "bg-emerald-500",text: "text-foreground" },
}

/* ── Status-based border override for "dept" badge mode ── */
const calendarStatusBorder: Record<string, string> = {
  "In Progress": "border-amber-400",
  Overdue:       "border-rose-500 border-dashed",
  Complete:      "border-emerald-400",
  // Pending: no override — keeps the natural dept border
}

function CalendarView({
  tasks: filteredTasks,
  onTaskClick,
  simplified = false,
  badgeMode = "dept",
}: {
  tasks: ScheduleTask[]
  onTaskClick?: (task: ScheduleTask) => void
  simplified?: boolean
  badgeMode?: "dept" | "status"
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [todayInfo, setTodayInfo] = useState<{ d: number; m: number; y: number } | null>(null)

  useEffect(() => {
    const n = new Date()
    setTodayInfo({ d: n.getDate(), m: n.getMonth(), y: n.getFullYear() })
  }, [])

  const isCurrentMonth = todayInfo !== null && year === todayInfo.y && month === todayInfo.m
  const today = todayInfo?.d ?? -1

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1) }
  const goToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()) }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const taskMap = useMemo(() => {
    const map: Record<number, ScheduleTask[]> = {}
    filteredTasks.forEach((t) => {
      if (!t.dueDate) return
      try {
        const d = parseDate(t.dueDate)
        if (d.month === month && d.year === year) {
          if (!map[d.day]) map[d.day] = []
          map[d.day].push(t)
        }
      } catch {
        // skip tasks with unparseable dates
      }
    })
    return map
  }, [filteredTasks, month, year])

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) currentWeek.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = [] }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  return (
    <div>
      {/* Calendar header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[150px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          {!simplified && badgeMode === "dept" && (
            <div className="hidden sm:flex items-center gap-4 text-[11px]">
              {/* Department color legend */}
              <div className="flex items-center gap-3">
                {Object.entries(typeStyles).slice(0, 5).map(([type, styles]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                    <span className="text-muted-foreground capitalize">{type}</span>
                  </div>
                ))}
              </div>
              {/* Status border legend — explains the border convention */}
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <div className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-amber-400 bg-transparent inline-block" />
                  <span className="text-muted-foreground">In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-dashed border-rose-500 bg-transparent inline-block" />
                  <span className="text-muted-foreground">Overdue</span>
                </div>
              </div>
            </div>
          )}
          {!simplified && badgeMode === "status" && (
            <div className="hidden sm:flex items-center gap-3 text-[11px]">
              {Object.entries(calendarStatusStyles).map(([label, styles]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={goToday}
            className="text-[13px] font-medium text-foreground border border-border rounded-lg px-3.5 py-1.5 hover:bg-accent transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "px-3 py-2.5 text-[12px] font-medium text-center",
              i === 5 ? "text-sky-600" : "text-muted-foreground"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const isToday = isCurrentMonth && day === today
            const isFriday = di === 5
            const dayTasks = day ? taskMap[day] || [] : []

            return (
              <div
                key={`${wi}-${di}`}
                className={cn(
                  "h-[120px] border-b border-r border-border p-2 relative",
                  di === 6 && "border-r-0",
                  wi === weeks.length - 1 && "border-b-0",
                  isToday && "bg-sky-50/40",
                  !day && "bg-accent/15"
                )}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-[12px] font-medium inline-flex items-center justify-center",
                          isToday
                            ? "bg-sky-500 text-white h-6 w-6 rounded-full text-[11px] font-semibold"
                            : isFriday
                            ? "text-sky-600"
                            : "text-foreground"
                        )}
                      >
                        {day}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayTasks.slice(0, MAX_VISIBLE).map((task, ti) => {
                        if (badgeMode === "status") {
                          // Status-only mode (team member view): colour entirely by status
                          const ss = calendarStatusStyles[task.status] || calendarStatusStyles.Pending
                          return (
                            <div
                              key={task.taskId || ti}
                              onClick={() => onTaskClick?.(task)}
                              className={cn(
                                "rounded-md px-2 py-1 transition-colors border cursor-pointer hover:opacity-80",
                                ss.bg, ss.border,
                              )}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ss.dot)} />
                                <span className={cn("text-[11px] font-medium truncate", ss.text)}>
                                  {task.teamFacingName || task.title}
                                </span>
                              </div>
                            </div>
                          )
                        }

                        // Dept mode (management view): dept bg + status border
                        const s = typeStyles[task.department] || typeStyles.Management
                        const statusBorder = calendarStatusBorder[task.status] || s.border
                        return (
                          <div
                            key={task.taskId || ti}
                            onClick={() => onTaskClick?.(task)}
                            className={cn(
                              "rounded-md px-2 py-1 transition-colors border cursor-pointer hover:opacity-80",
                              s.bg, statusBorder,
                            )}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                              <span className="text-[11px] font-medium text-foreground truncate">
                                {task.teamFacingName || task.title}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {dayTasks.length > MAX_VISIBLE && (
                        <span className="text-[10px] text-muted-foreground px-1">
                          +{dayTasks.length - MAX_VISIBLE} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
/*  KANBAN VIEW                                           */
/* ══════════════════════════════════════════════════════ */

function KanbanView({
  tasks: filteredTasks,
  onTaskClick,
}: {
  tasks: ScheduleTask[]
  onTaskClick?: (task: ScheduleTask) => void
}) {
  const [draggedTask, setDraggedTask] = useState<{ task: ScheduleTask; fromStatus: string } | null>(null)
  const [columnTasks, setColumnTasks] = useState<Record<string, ScheduleTask[]>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [mouseDownTime, setMouseDownTime] = useState(0)

  const columns = useMemo(() => {
    return kanbanCols.map((col) => ({
      ...col,
      tasks: columnTasks[col.id] ?? filteredTasks.filter((t) => t.status === col.id),
    }))
  }, [filteredTasks, columnTasks])

  useEffect(() => {
    const newColumnTasks: Record<string, ScheduleTask[]> = {}
    kanbanCols.forEach((col) => {
      newColumnTasks[col.id] = filteredTasks.filter((t) => t.status === col.id)
    })
    setColumnTasks(newColumnTasks)
  }, [filteredTasks])

  const handleDragStart = (task: ScheduleTask, status: string) => {
    setDraggedTask({ task, fromStatus: status })
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDrop = (toStatus: string) => {
    if (!draggedTask || draggedTask.fromStatus === toStatus) {
      setDraggedTask(null)
      setIsDragging(false)
      return
    }
    setColumnTasks((prev) => {
      const newState = { ...prev }
      newState[draggedTask.fromStatus] = (newState[draggedTask.fromStatus] ?? []).filter(
        (t) => t.taskId !== draggedTask.task.taskId
      )
      const updated = { ...draggedTask.task, status: toStatus as "Pending" | "In Progress" | "Overdue" | "Complete" }
      newState[toStatus] = [...(newState[toStatus] ?? []), updated]
      return newState
    })
    setDraggedTask(null)
    setIsDragging(false)
  }

  const handleCardMouseDown = () => { setMouseDownTime(Date.now()) }

  const handleCardClick = (task: ScheduleTask) => {
    if (Date.now() - mouseDownTime < 200) {
      onTaskClick?.(task)
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex flex-col min-w-[260px] w-[260px] shrink-0"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(col.id)}
        >
          {/* Column header */}
          <div className="flex items-center gap-2 px-1 mb-3">
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", col.dotColor)} />
            <span className="text-[13px] font-semibold text-foreground">{col.label}</span>
            <span className="text-[12px] text-muted-foreground ml-auto tabular-nums">
              {col.tasks.length} tasks
            </span>
          </div>

          {/* Column cards */}
          <div className="flex flex-col gap-2 min-h-[200px]">
            {col.tasks.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-accent/20 flex items-center justify-center py-12 text-[12px] text-muted-foreground">
                No tasks
              </div>
            ) : (
              col.tasks.map((task, i) => {
                const b = deptBadge[task.department]
                return (
                  <div
                    key={task.taskId || i}
                    draggable
                    onMouseDown={handleCardMouseDown}
                    onDragStart={() => handleDragStart(task, col.id)}
                    onDragEnd={() => setIsDragging(false)}
                    onClick={() => handleCardClick(task)}
                    className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2 transition-all cursor-grab active:cursor-grabbing active:opacity-50 hover:shadow-sm hover:border-muted-foreground/30"
                  >
                    <span className="text-[13px] font-medium text-foreground leading-snug">{task.teamFacingName || task.title}</span>
                    {task.client && task.client !== "—" && (
                      <span className="text-[12px] text-muted-foreground">{task.client}</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.department && (
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md", b?.bg || "bg-accent", b?.text || "text-foreground")}>
                          {task.department}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">{formatShortDate(task.dueDate)}</span>
                    </div>
                    {task.assigned && task.assigned !== "—" && (
                      <div className="flex items-center gap-2 pt-1.5 border-t border-border mt-1">
                        <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-[9px] font-semibold text-foreground">
                            {task.assigned.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate">{task.assigned}</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
/*  LIST VIEW                                             */
/* ══════════════════════════════════════════════════════ */

function ListView({
  tasks: filteredTasks,
  onTaskClick,
}: {
  tasks: ScheduleTask[]
  onTaskClick?: (task: ScheduleTask) => void
}) {
  const [sortKey, setSortKey] = useState<"dueDate" | "title" | "department">("dueDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const sorted = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let cmp = 0
      if (sortKey === "dueDate") cmp = (a.dueDate || '').localeCompare(b.dueDate || '')
      else if (sortKey === "title") cmp = a.title.localeCompare(b.title)
      else cmp = a.department.localeCompare(b.department)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredTasks, sortKey, sortDir])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            {[
              { key: "title" as const,     label: "Task" },
              { key: null,                  label: "Client" },
              { key: "department" as const, label: "Department" },
              { key: "dueDate" as const,    label: "Due Date" },
              { key: null,                  label: "Status" },
              { key: null,                  label: "Assigned" },
              { key: null,                  label: "" },
            ].map((col, i) => (
              <th
                key={i}
                onClick={() => col.key && handleSort(col.key)}
                className={cn(
                  "px-4 py-3 text-[12px] font-medium text-muted-foreground whitespace-nowrap",
                  col.key && "cursor-pointer hover:text-foreground select-none"
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center text-[13px] text-muted-foreground">
                No tasks match the current filters.
              </td>
            </tr>
          ) : (
            sorted.map((task, i) => {
              const b = deptBadge[task.department]
              const s = statusBadge[task.status] || statusBadge.Pending
              return (
                <tr
                  key={task.taskId || i}
                  onClick={() => onTaskClick?.(task)}
                  className="border-b border-border last:border-0 transition-colors hover:bg-accent/30 cursor-pointer"
                >
                  <td className="px-4 py-3 text-[13px] font-medium text-foreground">{task.teamFacingName || task.title}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{task.client}</td>
                  <td className="px-4 py-3">
                    {task.department && (
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md", b?.bg || "bg-accent", b?.text || "text-foreground")}>
                        {task.department}
                      </span>
                    )}
                  </td>
                  <td className={cn("px-4 py-3 text-[13px]", task.status === "Overdue" ? "text-rose-400" : "text-muted-foreground")}>
                    {formatShortDate(task.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", s.bg, s.text)}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{task.assigned}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTaskClick?.(task) }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
