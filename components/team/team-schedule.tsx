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
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { TaskSubmissionModal } from "./task-submission-modal"
import { ManagementTaskModal, LaunchTestsModal, SubmitStrategyModal } from "./specialized-task-modals"

/* ── Shared data ── */

interface Task {
  title: string
  client: string
  department: string
  dueDate: string          // YYYY-MM-DD
  status: "Pending" | "Overdue" | "Complete"
  assigned: string
  batchId?: string
  experiments?: { id: string; name: string; figmaUrl?: string; convertId?: string; qaApproved?: boolean; qaReportUrl?: string }[]
}

/* Type styles matching SalesCalendar's typeStyles pattern exactly */
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
  Pending:  { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  Overdue:  { bg: "bg-rose-50 border-rose-200",   text: "text-rose-700" },
  Complete: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  }

const tasks: Task[] = [
  // Sereneherbs - Batch 1
  { title: "Submit Strategy", client: "Sereneherbs", department: "Strategy", dueDate: "2026-01-20", status: "Complete", assigned: "Connor Shelefontluk", batchId: "serene-batch-1" },
  { title: "Submit Mockups", client: "Sereneherbs", department: "Design", dueDate: "2026-01-27", status: "Complete", assigned: "Tobi Akinloye", batchId: "serene-batch-1", experiments: [
    { id: "serene-1", name: "Herbal Benefits Accordion", figmaUrl: "https://figma.com/serene-accordion" },
    { id: "serene-2", name: "Free Shipping Progress Bar" },
    { id: "serene-3", name: "Blog Integration on PDP" }
  ]},
  { title: "Submit Tests for QA", client: "Sereneherbs", department: "Development", dueDate: "2026-02-03", status: "Complete", assigned: "Arafat Islam", batchId: "serene-batch-1", experiments: [
    { id: "serene-1", name: "Herbal Benefits Accordion", convertId: "EXP-10012345" },
    { id: "serene-2", name: "Free Shipping Progress Bar", convertId: "EXP-10012346" },
    { id: "serene-3", name: "Blog Integration on PDP", convertId: "EXP-10012347" }
  ]},
  { title: "Submit QA Report(s)", client: "Sereneherbs", department: "QA", dueDate: "2026-02-05", status: "Complete", assigned: "Anna Anikeieva", batchId: "serene-batch-1", experiments: [
    { id: "serene-1", name: "Herbal Benefits Accordion", qaApproved: true },
    { id: "serene-2", name: "Free Shipping Progress Bar", qaApproved: true },
    { id: "serene-3", name: "Blog Integration on PDP", qaReportUrl: "https://docs.google.com/serene-3-qa" }
  ]},
  { title: "Tests Running", client: "Sereneherbs", department: "Test Running", dueDate: "2026-02-12", status: "Complete", assigned: "Arafat Islam", batchId: "serene-batch-1" },
  { title: "Submit Post-Test Analysis", client: "Sereneherbs", department: "Analyst", dueDate: "2026-02-19", status: "Complete", assigned: "Connor Shelefontluk", batchId: "serene-batch-1" },

  // Vita Hustle - Batch 1
  { title: "Submit Strategy", client: "Vita Hustle", department: "Strategy", dueDate: "2026-01-22", status: "Overdue", assigned: "Jayden Gray", batchId: "vita-batch-1" },
  { title: "Submit Mockups", client: "Vita Hustle", department: "Design", dueDate: "2026-01-29", status: "Overdue", assigned: "Marcus Phellipe", batchId: "vita-batch-1", experiments: [
    { id: "vita-1", name: "Hero Video vs Static Image" },
    { id: "vita-2", name: "Subscription Save CTA" },
    { id: "vita-3", name: "Trust Badge Placement" }
  ]},
  { title: "Submit Tests for QA", client: "Vita Hustle", department: "Development", dueDate: "2026-02-05", status: "Pending", assigned: "Ivan Guzman", batchId: "vita-batch-1", experiments: [
    { id: "vita-1", name: "Hero Video vs Static Image" },
    { id: "vita-2", name: "Subscription Save CTA" },
    { id: "vita-3", name: "Trust Badge Placement" }
  ]},
  { title: "Submit QA Report(s)", client: "Vita Hustle", department: "QA", dueDate: "2026-02-07", status: "Pending", assigned: "Anna Anikeieva", batchId: "vita-batch-1", experiments: [
    { id: "vita-1", name: "Hero Video vs Static Image" },
    { id: "vita-2", name: "Subscription Save CTA" },
    { id: "vita-3", name: "Trust Badge Placement" }
  ]},
  { title: "Tests Running", client: "Vita Hustle", department: "Test Running", dueDate: "2026-02-14", status: "Pending", assigned: "Ivan Guzman", batchId: "vita-batch-1" },
  { title: "Submit Post-Test Analysis", client: "Vita Hustle", department: "Analyst", dueDate: "2026-02-21", status: "Pending", assigned: "Jayden Gray", batchId: "vita-batch-1" },

  // Goose Creek Candles - Batch 1
  { title: "Submit Strategy", client: "Goose Creek", department: "Strategy", dueDate: "2026-01-24", status: "Overdue", assigned: "Connor Shelefontluk", batchId: "goose-batch-1" },
  { title: "Submit Mockups", client: "Goose Creek", department: "Design", dueDate: "2026-01-31", status: "Overdue", assigned: "Tobi Akinloye", batchId: "goose-batch-1", experiments: [
    { id: "goose-1", name: "Scent Quiz Widget" },
    { id: "goose-2", name: "Bundle & Save Module" }
  ]},
  { title: "Submit Tests for QA", client: "Goose Creek", department: "Development", dueDate: "2026-02-07", status: "Pending", assigned: "Arafat Islam", batchId: "goose-batch-1", experiments: [
    { id: "goose-1", name: "Scent Quiz Widget" },
    { id: "goose-2", name: "Bundle & Save Module" }
  ]},
  { title: "Submit QA Report(s)", client: "Goose Creek", department: "QA", dueDate: "2026-02-09", status: "Pending", assigned: "Anna Anikeieva", batchId: "goose-batch-1", experiments: [
    { id: "goose-1", name: "Scent Quiz Widget" },
    { id: "goose-2", name: "Bundle & Save Module" }
  ]},
  { title: "Tests Running", client: "Goose Creek", department: "Test Running", dueDate: "2026-02-16", status: "Pending", assigned: "Arafat Islam", batchId: "goose-batch-1" },
  { title: "Submit Post-Test Analysis", client: "Goose Creek", department: "Analyst", dueDate: "2026-02-23", status: "Pending", assigned: "Connor Shelefontluk", batchId: "goose-batch-1" },

  // Live Love Locks - Batch 1
  { title: "Submit Strategy", client: "Live Love Locks", department: "Strategy", dueDate: "2026-02-01", status: "Pending", assigned: "Jayden Gray", batchId: "locks-batch-1" },
  { title: "Submit Mockups", client: "Live Love Locks", department: "Design", dueDate: "2026-02-08", status: "Pending", assigned: "Marcus Phellipe", batchId: "locks-batch-1", experiments: [
    { id: "locks-1", name: "Custom Engraving Preview" },
    { id: "locks-2", name: "Gift Messaging Expansion" },
    { id: "locks-3", name: "Cross-Sell Related Products" }
  ]},
  { title: "Submit Tests for QA", client: "Live Love Locks", department: "Development", dueDate: "2026-02-15", status: "Pending", assigned: "Ivan Guzman", batchId: "locks-batch-1", experiments: [
    { id: "locks-1", name: "Custom Engraving Preview" },
    { id: "locks-2", name: "Gift Messaging Expansion" },
    { id: "locks-3", name: "Cross-Sell Related Products" }
  ]},
  { title: "Submit QA Report(s)", client: "Live Love Locks", department: "QA", dueDate: "2026-02-17", status: "Pending", assigned: "Anna Anikeieva", batchId: "locks-batch-1", experiments: [
    { id: "locks-1", name: "Custom Engraving Preview" },
    { id: "locks-2", name: "Gift Messaging Expansion" },
    { id: "locks-3", name: "Cross-Sell Related Products" }
  ]},
  { title: "Tests Running", client: "Live Love Locks", department: "Test Running", dueDate: "2026-02-24", status: "Pending", assigned: "Ivan Guzman", batchId: "locks-batch-1" },

  // Additional Management/Sales tasks
  { title: "CRO Accelerator", client: "-", department: "Management", dueDate: "2026-02-11", status: "Pending", assigned: "-" },
  { title: "Free CRO Discovery Call", client: "-", department: "Management", dueDate: "2026-02-13", status: "Pending", assigned: "-" },
  { title: "30 Minute Meeting", client: "-", department: "Management", dueDate: "2026-02-18", status: "Pending", assigned: "-" },
]

  const allMembers = [...new Set(tasks.map((t) => t.assigned).filter((a) => a !== "-"))].sort()
  const allDepts   = ["Management", "Strategy", "Design", "Development", "QA"]
  const allStatuses = ["Pending", "Overdue", "Complete"]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MAX_VISIBLE = 2

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number)
  return { year: y, month: m - 1, day: d }
}

function formatShortDate(s: string) {
  const d = parseDate(s)
  return `${MONTHS[d.month].slice(0, 3)} ${d.day}`
}

/* ── Kanban columns based on status ── */
const kanbanCols = [
  { id: "Overdue",  label: "Overdue",  dotColor: "bg-rose-500" },
  { id: "Pending",  label: "Pending",  dotColor: "bg-amber-500" },
  { id: "Complete", label: "Complete", dotColor: "bg-emerald-500" },
]

/* ── Main Component ── */

export function TeamSchedule({
  simplified = false,
  memberFilter = "All Members",
  deptFilter = "All Departments",
  statusFilter: externalStatusFilter,
}: {
  simplified?: boolean
  memberFilter?: string
  deptFilter?: string
  statusFilter?: string
}) {
  const [view, setView] = useState<"calendar" | "kanban" | "list">("calendar")
  const [search, setSearch] = useState("")
  const [internalStatusFilter, setInternalStatusFilter] = useState("All Status")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // If an external statusFilter is passed (management page), use it; otherwise use internal
  const statusFilter = externalStatusFilter ?? internalStatusFilter

  const filtered = useMemo(() => {
    let res = tasks
    if (statusFilter !== "All Status") res = res.filter((t) => t.status === statusFilter)
    if (!simplified && memberFilter !== "All Members") res = res.filter((t) => t.assigned === memberFilter)
    if (!simplified && deptFilter !== "All Departments" && deptFilter !== "All") res = res.filter((t) => t.department === deptFilter)
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.client.toLowerCase().includes(q) ||
          t.assigned.toLowerCase().includes(q)
      )
    }
    return res
  }, [search, statusFilter, memberFilter, deptFilter, simplified])

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

      {/* Filters + Views */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-4 py-3 border-b border-border">
          {!simplified && externalStatusFilter === undefined && (
            <SelectField value={internalStatusFilter} onChange={setInternalStatusFilter} options={["All Status", ...allStatuses]} />
          )}
          {simplified && (
            <SelectField value={internalStatusFilter} onChange={setInternalStatusFilter} options={["All Status", ...allStatuses]} />
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

        {/* Views */}
        {view === "calendar" && <CalendarView tasks={filtered} onTaskClick={setSelectedTask} simplified={simplified} />}
        {view === "kanban" && <div className="p-4"><KanbanView tasks={filtered} onTaskClick={setSelectedTask} /></div>}
        {view === "list" && <ListView tasks={filtered} onTaskClick={setSelectedTask} />}
      </div>

      {/* Task Modals */}
      {selectedTask && (
        <>
          {/* Management tasks show details only */}
          {selectedTask.department === "Management" && (
            <ManagementTaskModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
          
          {/* Tests Running launches tests with confirmation */}
          {selectedTask.title === "Tests Running" && (
            <LaunchTestsModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
          
          {/* Submit Strategy adds test ideas and notifies client */}
          {selectedTask.title === "Submit Strategy" && (
            <SubmitStrategyModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
          
          {/* Other task types with experiments use standard submission modal */}
          {selectedTask.experiments && 
           selectedTask.department !== "Management" && 
           selectedTask.title !== "Tests Running" &&
           selectedTask.title !== "Submit Strategy" && (
            <TaskSubmissionModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════ */
/*  CALENDAR VIEW — matches SalesCalendar exactly */
/* ═══════════════════════════════════════════════ */

function CalendarView({ tasks: filteredTasks, onTaskClick, simplified = false }: { tasks: Task[]; onTaskClick: (task: Task) => void; simplified?: boolean }) {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(0) // January — where the data lives
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
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
    const map: Record<number, Task[]> = {}
    filteredTasks.forEach((t) => {
      const d = parseDate(t.dueDate)
      if (d.month === month && d.year === year) {
        if (!map[d.day]) map[d.day] = []
        map[d.day].push(t)
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
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[150px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
          <div className="flex items-center gap-4">
          {!simplified && (
            <div className="hidden sm:flex items-center gap-3 text-[11px]">
              {Object.entries(typeStyles).slice(0, 5).map(([type, styles]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                  <span className="text-muted-foreground capitalize">{type}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={goToday} className="text-[13px] font-medium text-foreground border border-border rounded-lg px-3.5 py-1.5 hover:bg-accent transition-colors">
            Today
          </button>
        </div>
      </div>

      {/* Day headers — matches SalesCalendar with Friday blue */}
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

      {/* Grid — matches SalesCalendar cell-for-cell */}
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
                        const s = typeStyles[task.department] || typeStyles.Management
                        const isClickable = (task.experiments && task.experiments.length > 0) || 
                                          task.department === "Management" || 
                                          task.title === "Tests Running" ||
                                          task.title === "Submit Strategy"
                        return (
                          <div
                            key={ti}
                            onClick={() => isClickable && onTaskClick(task)}
                            className={cn(
                              "rounded-md px-2 py-1 transition-colors border",
                              s.bg, s.border,
                              isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  {task.title}
                                </span>
                              </div>
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

/* ═══════════════════════════════════════════════ */
/*  KANBAN VIEW — matches KanbanBoard exactly     */
/* ═══════════════════════════════════════════════ */

function KanbanView({ tasks: filteredTasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) {
  const [draggedTask, setDraggedTask] = useState<{ task: Task; fromStatus: string } | null>(null)
  const [columnTasks, setColumnTasks] = useState<Record<string, Task[]>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [mouseDownTime, setMouseDownTime] = useState(0)

  const columns = useMemo(() => {
    return kanbanCols.map((col) => ({
      ...col,
      tasks: columnTasks[col.id] || filteredTasks.filter((t) => t.status === col.id),
    }))
  }, [filteredTasks, columnTasks])

  useEffect(() => {
    const newColumnTasks: Record<string, Task[]> = {}
    kanbanCols.forEach((col) => {
      newColumnTasks[col.id] = filteredTasks.filter((t) => t.status === col.id)
    })
    setColumnTasks(newColumnTasks)
  }, [filteredTasks])

  const handleDragStart = (task: Task, status: string) => {
    setDraggedTask({ task, fromStatus: status })
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (toStatus: string) => {
    if (!draggedTask || draggedTask.fromStatus === toStatus) {
      setDraggedTask(null)
      setIsDragging(false)
      return
    }

    setColumnTasks((prev) => {
      const newState = { ...prev }
      newState[draggedTask.fromStatus] = newState[draggedTask.fromStatus].filter(
        (t) => t.title !== draggedTask.task.title || t.client !== draggedTask.task.client
      )
      newState[toStatus] = [...(newState[toStatus] || []), draggedTask.task]
      return newState
    })

    setDraggedTask(null)
    setIsDragging(false)
  }

  const handleCardMouseDown = () => {
    setMouseDownTime(Date.now())
  }

  const handleCardClick = (task: Task) => {
    const clickDuration = Date.now() - mouseDownTime
    if (clickDuration < 200) {
      const b = deptBadge[task.department]
      const isClickable = (task.experiments && task.experiments.length > 0) || 
                        task.department === "Management" || 
                        task.title === "Tests Running" ||
                        task.title === "Submit Strategy"
      if (isClickable) {
        onTaskClick(task)
      }
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
          {/* Column header — matches KanbanBoard */}
          <div className="flex items-center gap-2 px-1 mb-3">
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", col.dotColor)} />
            <span className="text-[13px] font-semibold text-foreground">{col.label}</span>
            <span className="text-[12px] text-muted-foreground ml-auto tabular-nums">
              {col.tasks.length} tasks
            </span>
          </div>

          {/* Column body — matches KanbanBoard */}
          <div className="flex flex-col gap-2 min-h-[200px]">
            {col.tasks.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-accent/20 flex items-center justify-center py-12 text-[12px] text-muted-foreground">
                No tasks
              </div>
            ) : (
              col.tasks.map((task, i) => {
                const b = deptBadge[task.department]
                const isClickable = (task.experiments && task.experiments.length > 0) || 
                                  task.department === "Management" || 
                                  task.title === "Tests Running" ||
                                  task.title === "Submit Strategy"
                return (
                  <div
                    key={`${task.title}-${i}`}
                    draggable
                    onMouseDown={handleCardMouseDown}
                    onDragStart={() => handleDragStart(task, col.id)}
                    onDragEnd={() => setIsDragging(false)}
                    onClick={() => handleCardClick(task)}
                    className={cn(
                      "bg-card rounded-xl border border-border p-4 flex flex-col gap-2 transition-all cursor-grab active:cursor-grabbing active:opacity-50",
                      isClickable ? "hover:shadow-sm hover:border-muted-foreground/30" : ""
                    )}
                  >
                    <span className="text-[13px] font-medium text-foreground leading-snug">{task.title}</span>
                    {task.client !== "-" && (
                      <span className="text-[12px] text-muted-foreground">{task.client}</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md", b?.bg || "bg-accent", b?.text || "text-foreground")}>
                        {task.department}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatShortDate(task.dueDate)}</span>
                    </div>
                    {task.assigned !== "-" && (
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

/* ═══════════════════════════════════════════════ */
/*  LIST VIEW                                      */
/* ═══════════════════════════════════════════════ */

function ListView({ tasks: filteredTasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) {
  const [sortKey, setSortKey] = useState<"dueDate" | "title" | "department">("dueDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const sorted = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let cmp = 0
      if (sortKey === "dueDate") cmp = a.dueDate.localeCompare(b.dueDate)
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
                { key: "title" as const, label: "Task" },
                { key: null,             label: "Client" },
                { key: "department" as const, label: "Department" },
                { key: "dueDate" as const,   label: "Due Date" },
                { key: null,             label: "Status" },
                { key: null,             label: "Assigned" },
                { key: null,             label: "" },
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
            {sorted.map((task, i) => {
              const b = deptBadge[task.department]
              const isClickable = (task.experiments && task.experiments.length > 0) || 
                                task.department === "Management" || 
                                task.title === "Tests Running" ||
                                task.title === "Submit Strategy"
              return (
                <tr 
                  key={i} 
                  onClick={() => isClickable && onTaskClick(task)}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    isClickable ? "hover:bg-accent/30 cursor-pointer" : "cursor-default"
                  )}
                >
                  <td className="px-4 py-3 text-[13px] font-medium text-foreground">{task.title}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{task.client}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md", b?.bg || "bg-accent", b?.text || "text-foreground")}>
                      {task.department}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3 text-[13px]", task.status === "Overdue" ? "text-rose-400" : "text-muted-foreground")}>
                    {formatShortDate(task.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => { const s = statusBadge[task.status] || statusBadge.Pending; return (
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", s.bg, s.text)}>
                        {task.status}
                      </span>
                    ) })()}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{task.assigned}</td>
                  <td className="px-4 py-3">
                    {isClickable && (
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
    </div>
  )
}
