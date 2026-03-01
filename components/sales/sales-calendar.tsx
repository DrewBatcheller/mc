"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskDetailsModal } from "./task-details-modal"

const MAX_VISIBLE = 2

interface CalendarTask {
  day: number
  month: number
  year: number
  title: string
  subtitle: string
  time: string
  type: "call" | "followup" | "meeting"
}

const typeStyles: Record<string, { bg: string; border: string; dot: string }> = {
  call: { bg: "bg-sky-50", border: "border-sky-200/60", dot: "bg-sky-500" },
  followup: { bg: "bg-amber-50", border: "border-amber-200/60", dot: "bg-amber-500" },
  meeting: { bg: "bg-emerald-50", border: "border-emerald-200/60", dot: "bg-emerald-500" },
}

const tasks: CalendarTask[] = [
  { day: 10, month: 1, year: 2026, title: "Discovery Call", subtitle: "Goose Creek Candles", time: "9AM", type: "call" },
  { day: 10, month: 1, year: 2026, title: "Follow up", subtitle: "Primal Queen", time: "11AM", type: "followup" },
  { day: 10, month: 1, year: 2026, title: "Sales Call", subtitle: "Blox Boom", time: "2PM", type: "call" },
  { day: 10, month: 1, year: 2026, title: "Team Sync", subtitle: "Internal", time: "4PM", type: "meeting" },
  { day: 12, month: 1, year: 2026, title: "Onboarding Call", subtitle: "Perfect White Tee", time: "10AM", type: "call" },
  { day: 13, month: 1, year: 2026, title: "Call Jim", subtitle: "Fake Brand", time: "7PM", type: "call" },
  { day: 13, month: 1, year: 2026, title: "Review Proposal", subtitle: "Kitty Spout", time: "3PM", type: "followup" },
  { day: 14, month: 1, year: 2026, title: "Call Dave", subtitle: "Fake User", time: "5PM", type: "call" },
  { day: 3, month: 1, year: 2026, title: "Follow up", subtitle: "Primal Queen", time: "10AM", type: "followup" },
  { day: 18, month: 1, year: 2026, title: "Qualifying Call", subtitle: "New Lead", time: "11AM", type: "call" },
  { day: 20, month: 1, year: 2026, title: "Sales Call", subtitle: "Blox Boom", time: "2PM", type: "call" },
  { day: 24, month: 1, year: 2026, title: "Strategy Meeting", subtitle: "Team", time: "9AM", type: "meeting" },
  { day: 24, month: 1, year: 2026, title: "Client Check-in", subtitle: "Goose Creek", time: "1PM", type: "followup" },
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export function SalesCalendar() {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(1)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [todayInfo, setTodayInfo] = useState<{ d: number; m: number; y: number } | null>(null)

  useEffect(() => {
    const n = new Date()
    setTodayInfo({ d: n.getDate(), m: n.getMonth(), y: n.getFullYear() })
    setYear(n.getFullYear())
    setMonth(n.getMonth())
  }, [])

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
  const goToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()) }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const taskMap = useMemo(() => {
    const map: Record<number, CalendarTask[]> = {}
    tasks
      .filter((t) => t.month === month && t.year === year)
      .forEach((t) => {
        if (!map[t.day]) map[t.day] = []
        map[t.day].push(t)
      })
    // Sort by time within each day
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => {
        const parseTime = (t: string) => {
          const h = parseInt(t)
          return t.includes("PM") && h !== 12 ? h + 12 : h
        }
        return parseTime(a.time) - parseTime(b.time)
      })
    )
    return map
  }, [month, year])

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

  const openTask = (task: CalendarTask) => {
    setSelectedTask(task)
    setTaskModalOpen(true)
    setExpandedDay(null)
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <TaskDetailsModal
        isOpen={taskModalOpen}
        task={selectedTask}
        onClose={() => setTaskModalOpen(false)}
      />
      {/* Header */}
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
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            {Object.entries(typeStyles).map(([type, styles]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                <span className="text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
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
                        return (
                          <div
                            key={ti}
                            onClick={() => openTask(task)}
                            className={cn(
                              "rounded-md px-2 py-1 cursor-pointer transition-colors border",
                              s.bg, s.border, "hover:opacity-80"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {task.time}
                              </span>
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
                            return (
                              <div
                                key={ti}
                                onClick={() => openTask(task)}
                                className={cn(
                                  "rounded-md px-2 py-1.5 border cursor-pointer hover:opacity-80 transition-colors",
                                  s.bg, s.border
                                )}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                                    <span className="text-[11px] font-medium text-foreground truncate">
                                      {task.title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {task.time}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground block pl-3">
                                  {task.subtitle}
                                </span>
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
