"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  date: number
  month: number
  year: number
  label: string
  color: string
}

const events: CalendarEvent[] = [
  { date: 2, month: 0, year: 2026, label: "Submit Mockups", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { date: 5, month: 0, year: 2026, label: "Submit Mockups", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { date: 28, month: 0, year: 2026, label: "Submit Mockups", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { date: 9, month: 1, year: 2026, label: "Submit Mockups", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { date: 17, month: 1, year: 2026, label: "Submit Mockups", color: "bg-sky-100 text-sky-700 border-sky-200" },
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay()
}

export function TaskCalendar() {
  const [currentMonth, setCurrentMonth] = useState(1) // February
  const [currentYear, setCurrentYear] = useState(2026)

  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)

  const prevMonthDays = getDaysInMonth(
    currentMonth === 0 ? 11 : currentMonth - 1,
    currentMonth === 0 ? currentYear - 1 : currentYear
  )

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const getEventsForDay = (day: number) => {
    return events.filter(
      (e) => e.date === day && e.month === currentMonth && e.year === currentYear
    )
  }

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  // Build calendar grid cells
  const cells: { day: number; isCurrentMonth: boolean }[] = []

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, isCurrentMonth: false })
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, isCurrentMonth: true })
  }
  // Next month leading days
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, isCurrentMonth: false })
  }

  const totalTasks = events.filter(
    (e) => e.month === currentMonth && e.year === currentYear
  ).length

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {MONTHS[currentMonth]}{" "}
            <span className="text-muted-foreground font-normal">{currentYear}</span>
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={goToToday}
            className="px-2.5 py-1 rounded-md text-[12px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            Today
          </button>
          <span className="px-2.5 py-1 rounded-md text-[12px] font-medium text-foreground bg-muted">
            Month
          </span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((day) => (
          <div
            key={day}
            className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dayEvents = cell.isCurrentMonth ? getEventsForDay(cell.day) : []
          return (
            <div
              key={idx}
              className={cn(
                "min-h-[90px] border-b border-r border-border px-2 py-1.5",
                idx % 7 === 0 && "border-l-0",
                !cell.isCurrentMonth && "bg-muted/20"
              )}
            >
              <span
                className={cn(
                  "text-[12px] inline-flex items-center justify-center",
                  !cell.isCurrentMonth && "text-muted-foreground/40",
                  cell.isCurrentMonth && "text-foreground",
                  isToday(cell.day) && cell.isCurrentMonth &&
                    "bg-foreground text-background rounded-full w-6 h-6 text-[11px] font-semibold"
                )}
              >
                {cell.day}
              </span>
              {dayEvents.map((event, eIdx) => (
                <div
                  key={eIdx}
                  className={cn(
                    "mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate border",
                    event.color
                  )}
                >
                  {event.label}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <span className="text-[12px] text-muted-foreground">
          {totalTasks} task{totalTasks !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}
