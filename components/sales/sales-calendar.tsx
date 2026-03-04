"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskDetailsModal } from "./task-details-modal"
import { CreateTaskModal } from "./create-task-modal"
import { useAirtable } from "@/hooks/use-airtable"
import { SelectField } from "@/components/shared/select-field"

const MAX_VISIBLE = 2

export interface CalendarTask {
  id: string
  day: number
  month: number
  year: number
  title: string
  subtitle: string
  time: string
  type: "call" | "followup" | "meeting"
  assignedTo: string
  description: string
  priority: number   // 0–3 star rating
  status: string
  startDate: string | null
  dueDate: string | null
  // Linked records — used by task detail modal
  noteIds: string[]    // IDs of linked Note records
  leadId: string       // first linked Lead record ID
  leadName: string     // Full Name (from Lead) lookup
  clientId: string     // first linked Client record ID
  clientName: string   // Brand Name (from Client) lookup
  /** Raw "Client Facing Name" field value (for editing) */
  clientFacingName: string
  /** True when the task has a Call Record linked (= came from Calendly; read-only) */
  hasCallRecord: boolean
}

const typeStyles: Record<string, { bg: string; border: string; dot: string }> = {
  call:      { bg: "bg-sky-50",    border: "border-sky-200/60",    dot: "bg-sky-500"    },
  followup:  { bg: "bg-amber-50",  border: "border-amber-200/60",  dot: "bg-amber-500"  },
  meeting:   { bg: "bg-emerald-50",border: "border-emerald-200/60",dot: "bg-emerald-500"},
}

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

/**
 * Map the Airtable "Type" field value to our internal type key.
 * Airtable single-select values are matched case-insensitively.
 * Falls back to "meeting" for anything unrecognised.
 */
function resolveType(typeField: unknown): "call" | "followup" | "meeting" {
  const val = String(typeField ?? "").toLowerCase().replace(/[\s-]/g, "")
  if (val.includes("call"))   return "call"
  if (val.includes("follow")) return "followup"
  return "meeting"
}

/** Format a Date's time as "9am", "4pm", "4:15pm", "12pm", etc. */
function formatHour(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const suffix     = h < 12 ? "am" : "pm"
  const displayH   = h === 0 ? 12 : h > 12 ? h - 12 : h
  const minutePart = m > 0 ? `:${String(m).padStart(2, "0")}` : ""
  return `${displayH}${minutePart}${suffix}`
}

/**
 * Parse an Airtable date string into calendar components + a display time.
 *
 * IMPORTANT: JavaScript parses date-only strings like "2026-02-15" as
 * UTC midnight, which shifts the date back one day in UTC-negative timezones
 * (EST = UTC-5, CST = UTC-6, etc.). We parse date-only strings manually
 * to always treat them as local dates. Datetime strings (containing "T")
 * are fine to parse with the Date constructor.
 */
function parseDateStr(
  dateStr: string | null
): { day: number; month: number; year: number; time: string } | null {
  if (!dateStr) return null

  // Date-only string — parse manually to avoid UTC shift
  if (!dateStr.includes("T")) {
    const parts = dateStr.split("-")
    if (parts.length !== 3) return null
    const year  = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1  // convert to 0-indexed
    const day   = parseInt(parts[2], 10)
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null
    return { day, month, year, time: "" }
  }

  // Datetime string with timezone — use Date constructor (local time)
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return {
    day:   d.getDate(),
    month: d.getMonth(),
    year:  d.getFullYear(),
    time:  formatHour(d),
  }
}

/** Return first-name initials or just first name for compact badge display */
function shortName(fullName: string): string {
  return fullName.trim().split(" ")[0]
}

export function SalesCalendar() {
  const now = new Date()
  const [year,            setYear]            = useState(now.getFullYear())
  const [month,           setMonth]           = useState(now.getMonth())
  const [expandedDay,     setExpandedDay]     = useState<number | null>(null)
  const [selectedTask,    setSelectedTask]    = useState<CalendarTask | null>(null)
  const [taskModalOpen,   setTaskModalOpen]   = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [todayInfo,       setTodayInfo]       = useState<{ d: number; m: number; y: number } | null>(null)
  const [assigneeFilter,  setAssigneeFilter]  = useState("All Assignees")

  useEffect(() => {
    const n = new Date()
    setTodayInfo({ d: n.getDate(), m: n.getMonth(), y: n.getFullYear() })
  }, [])

  // ── Live data ────────────────────────────────────────────────────────────────
  const { data: rawTasks, isLoading, error, mutate: mutateTasks } = useAirtable("tasks", {
    fields: [
      "Team Facing Name",
      "Client Facing Name",
      "Department",
      "Type",
      "Start Date",
      "Due Date",
      "Status",
      "Assigned to",
      "Description",
      "Priority",
      // Linked records — needed by detail modal
      "Notes",                    // → noteIds  (linked to Notes table)
      "Lead",                     // → leadId   (linked to Leads table)
      "Full Name (from Lead)",    // → leadName (lookup)
      "Client",                   // → clientId (linked to Clients table)
      "Brand Name (from Client)", // → clientName (lookup)
      "Call Record",              // → hasCallRecord (linked via Calendly)
    ],
    filterExtra: `{Department}='Sales'`,
    sort: [{ field: "Start Date", direction: "asc" }],
  })

  // Transform raw Airtable records into CalendarTask objects.
  // Tasks without any date (Start Date or Due Date) are skipped.
  const tasks: CalendarTask[] = useMemo(() => {
    if (!rawTasks) return []

    return rawTasks.flatMap((rec) => {
      const f = rec.fields as Record<string, unknown>

      const name = String(f["Team Facing Name"] ?? "").trim()
      if (!name) return []

      const startStr = f["Start Date"] ? String(f["Start Date"]) : null
      const dueStr   = f["Due Date"]   ? String(f["Due Date"])   : null
      const parsed   = parseDateStr(startStr) ?? parseDateStr(dueStr)
      if (!parsed) return []  // can't place on calendar without a date

      // Use Client Facing Name as subtitle when it differs from the task name
      const clientFacingName = String(f["Client Facing Name"] ?? "").trim()
      const subtitle =
        clientFacingName && clientFacingName !== name ? clientFacingName : "Internal"

      // Priority: Airtable Rating field returns a number (or null/undefined when unset)
      const rawPriority = f["Priority"]
      const priority    = typeof rawPriority === "number" ? rawPriority : 0

      // Linked-record fields return string[] of record IDs
      const noteIds         = Array.isArray(f["Notes"])        ? (f["Notes"]        as string[]) : []
      const leadArr         = Array.isArray(f["Lead"])         ? (f["Lead"]         as string[]) : []
      const clientArr       = Array.isArray(f["Client"])       ? (f["Client"]       as string[]) : []
      const callRecordArr   = Array.isArray(f["Call Record"])  ? (f["Call Record"]  as string[]) : []

      // Lookup fields return string[] of display values
      const leadNameArr   = Array.isArray(f["Full Name (from Lead)"])    ? (f["Full Name (from Lead)"]    as string[]) : []
      const clientNameArr = Array.isArray(f["Brand Name (from Client)"]) ? (f["Brand Name (from Client)"] as string[]) : []

      return [{
        id:            rec.id,
        day:           parsed.day,
        month:         parsed.month,
        year:          parsed.year,
        title:         name,
        subtitle,
        time:          parsed.time,
        type:          resolveType(f["Type"]),
        assignedTo:    f["Assigned to"] ? String(f["Assigned to"]) : "",
        description:   f["Description"] ? String(f["Description"]) : "",
        priority,
        status:        f["Status"]      ? String(f["Status"])      : "",
        startDate:     startStr,
        dueDate:       dueStr,
        noteIds,
        leadId:          leadArr[0]         ?? "",
        leadName:        leadNameArr[0]     ?? "",
        clientId:        clientArr[0]       ?? "",
        clientName:      clientNameArr[0]   ?? "",
        clientFacingName,
        hasCallRecord:   callRecordArr.length > 0,
      }]
    })
  }, [rawTasks])

  // ── Unique assignees for filter dropdown ──────────────────────────────────────
  const assigneeOptions = useMemo(() => {
    const names = new Set<string>()
    tasks.forEach(t => {
      if (!t.assignedTo) return
      t.assignedTo.split(",").forEach(n => {
        const trimmed = n.trim()
        if (trimmed) names.add(trimmed)
      })
    })
    return ["All Assignees", ...Array.from(names).sort()]
  }, [tasks])

  // ── Calendar nav ─────────────────────────────────────────────────────────────
  const isCurrentMonth = todayInfo !== null && year === todayInfo.y && month === todayInfo.m
  const today = todayInfo?.d ?? -1

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }
  const goToday = () => {
    const n = new Date()
    setYear(n.getFullYear())
    setMonth(n.getMonth())
  }

  // ── Task update callback (updates selectedTask in place) ──────────────────────
  const handleTaskUpdate = useCallback((updates: Partial<CalendarTask>) => {
    setSelectedTask(prev => prev ? { ...prev, ...updates } : prev)
    mutateTasks()
  }, [mutateTasks])

  // ── Build task map for current month ─────────────────────────────────────────
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay    = getFirstDayOfMonth(year, month)

  const taskMap = useMemo(() => {
    const map: Record<number, CalendarTask[]> = {}

    // Apply assignee filter before building map
    const filtered = assigneeFilter === "All Assignees"
      ? tasks
      : tasks.filter(t =>
          t.assignedTo.split(",").map(n => n.trim()).includes(assigneeFilter)
        )

    filtered
      .filter((t) => t.month === month && t.year === year)
      .forEach((t) => {
        if (!map[t.day]) map[t.day] = []
        map[t.day].push(t)
      })
    // Sort by time within each day
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => {
        const toHour = (s: string) => {
          if (!s) return 999
          const h = parseInt(s)
          return s.includes("PM") && h !== 12 ? h + 12 : h
        }
        return toHour(a.time) - toHour(b.time)
      })
    )
    return map
  }, [tasks, month, year, assigneeFilter])

  // ── Build calendar grid ───────────────────────────────────────────────────────
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

  // ── Open task — preserve optimistically-added noteIds when reopening same task ─
  const openTask = (task: CalendarTask) => {
    setSelectedTask(prev => {
      // If the same task is clicked again, merge noteIds so any optimistically-added
      // note IDs from this session are preserved in the filter for the notes fetch.
      if (prev?.id === task.id && prev.noteIds.length > task.noteIds.length) {
        const merged = [...new Set([...task.noteIds, ...prev.noteIds])]
        return { ...task, noteIds: merged }
      }
      return task
    })
    setTaskModalOpen(true)
    setExpandedDay(null)
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <TaskDetailsModal
        isOpen={taskModalOpen}
        task={selectedTask}
        onClose={() => setTaskModalOpen(false)}
        onTaskMutate={mutateTasks}
        onTaskUpdate={handleTaskUpdate}
      />

      <CreateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTaskCreated={mutateTasks}
      />

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border gap-3 flex-wrap">
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

        <div className="flex items-center gap-3 flex-wrap">
          {/* Type legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            {Object.entries(typeStyles).map(([type, styles]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                <span className="text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>

          {/* Assignee filter */}
          <SelectField
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            options={assigneeOptions}
          />

          {isLoading && (
            <span className="text-[11px] text-muted-foreground animate-pulse">
              Loading…
            </span>
          )}
          {error && (
            <span className="text-[11px] text-red-500 font-medium">
              {error.message}
            </span>
          )}

          <button
            onClick={goToday}
            className="text-[13px] font-medium text-foreground border border-border rounded-lg px-3.5 py-1.5 hover:bg-accent transition-colors"
          >
            Today
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-background bg-foreground rounded-lg px-3.5 py-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
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
            const isToday  = isCurrentMonth && day === today
            const dayTasks = day ? taskMap[day] || [] : []
            const isFriday = di === 5

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
                        const s = typeStyles[task.type]
                        const assigneeShort = task.assignedTo
                          ? task.assignedTo.split(",").map(n => shortName(n)).join(", ")
                          : null
                        return (
                          <div
                            key={ti}
                            onClick={() => openTask(task)}
                            className={cn(
                              "rounded-md px-2 py-1 cursor-pointer transition-colors border",
                              s.bg, s.border, "hover:opacity-80"
                            )}
                          >
                            {/* Single-row: dot · title · assignee  time */}
                            <div className="flex items-baseline justify-between gap-1 min-w-0">
                              <div className="flex items-baseline gap-1 min-w-0 flex-1">
                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 self-center", s.dot)} />
                                <span className="text-[11px] font-medium text-foreground leading-tight break-words min-w-0">
                                  {task.title}
                                  {assigneeShort && (
                                    <span className="font-normal text-muted-foreground"> · {assigneeShort}</span>
                                  )}
                                </span>
                              </div>
                              {task.time && (
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-0.5 leading-tight">
                                  {task.time}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {dayTasks.length > MAX_VISIBLE && (
                        <button
                          onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                          className="text-[11px] font-medium text-sky-600 hover:text-sky-700 text-left pl-1 transition-colors"
                        >
                          +{dayTasks.length - MAX_VISIBLE} more
                        </button>
                      )}
                    </div>

                    {/* Expanded day popover */}
                    {expandedDay === day && dayTasks.length > MAX_VISIBLE && (
                      <div className="absolute top-0 left-0 right-0 z-20 bg-card rounded-xl border border-border shadow-lg p-3 min-w-[200px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-semibold text-foreground">
                            {MONTHS[month]} {day} &middot; {dayTasks.length} tasks
                          </span>
                          <button
                            onClick={() => setExpandedDay(null)}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent transition-colors"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {dayTasks.map((task, ti) => {
                            const s = typeStyles[task.type]
                            const assigneeShort = task.assignedTo
                              ? task.assignedTo.split(",").map(n => shortName(n)).join(", ")
                              : null
                            return (
                              <div
                                key={ti}
                                onClick={() => openTask(task)}
                                className={cn(
                                  "rounded-md px-2 py-1.5 border cursor-pointer hover:opacity-80 transition-colors",
                                  s.bg, s.border
                                )}
                              >
                                {/* Single-row: dot · title · assignee  time */}
                                <div className="flex items-baseline justify-between gap-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0 self-center", s.dot)} />
                                    <span className="text-[11px] font-medium text-foreground leading-tight break-words min-w-0">
                                      {task.title}
                                      {assigneeShort && (
                                        <span className="font-normal text-muted-foreground"> · {assigneeShort}</span>
                                      )}
                                    </span>
                                  </div>
                                  {task.time && (
                                    <span className="text-[10px] text-muted-foreground shrink-0 ml-0.5 leading-tight">
                                      {task.time}
                                    </span>
                                  )}
                                </div>
                                {task.subtitle && task.subtitle !== "Internal" && (
                                  <span className="text-[10px] text-muted-foreground/60 block pl-3 leading-tight">
                                    {task.subtitle}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
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
