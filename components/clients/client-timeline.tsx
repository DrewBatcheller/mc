"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Phase {
  label: string
  startDate: string
  endDate: string
  color: string
  textColor: string
}

const phaseStyles: Record<string, { bg: string; text: string }> = {
  "Strategy Submitted": { bg: "bg-sky-100", text: "text-sky-800" },
  "Design":            { bg: "bg-purple-100", text: "text-purple-800" },
  "Development":       { bg: "bg-blue-100", text: "text-blue-800" },
  "QA Started":        { bg: "bg-amber-100", text: "text-amber-800" },
  "Test(s) Live":      { bg: "bg-cyan-200", text: "text-cyan-900" },
  "Post-Test Analyses":{ bg: "bg-gray-200", text: "text-gray-700" },
}

// Default placeholder phases for when there's no live data
const defaultPhases: Phase[] = [
  { label: "Strategy Submitted", startDate: "2026-01-28", endDate: "2026-01-31", color: "bg-sky-100", textColor: "text-sky-800" },
  { label: "Design", startDate: "2026-02-02", endDate: "2026-02-07", color: "bg-purple-100", textColor: "text-purple-800" },
  { label: "Development", startDate: "2026-02-09", endDate: "2026-02-14", color: "bg-blue-100", textColor: "text-blue-800" },
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}
function getFirstDayOfMonth(y: number, m: number) {
  return new Date(y, m, 1).getDay()
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function ClientTimeline() {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(1)
  const [today, setToday] = useState<{ d: number; m: number; y: number } | null>(null)
  const [phases] = useState<Phase[]>(defaultPhases)

  useEffect(() => {
    const now = new Date()
    setToday({ d: now.getDate(), m: now.getMonth(), y: now.getFullYear() })
  }, [])

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }
  const goToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()) }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const weeks = useMemo(() => {
    const result: (number | null)[][] = []
    let week: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d)
      if (week.length === 7) {
        result.push(week)
        week = []
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      result.push(week)
    }
    return result
  }, [year, month, daysInMonth, firstDay])

  const phaseBarsByWeek = useMemo(() => {
    const bars: Map<number, { label: string; colStart: number; colEnd: number; bg: string; textColor: string }[]> = new Map()

    phases.forEach((phase) => {
      const start = parseDate(phase.startDate)
      const end = parseDate(phase.endDate)

      weeks.forEach((week, wi) => {
        const weekDays = week.map((d, di) => {
          if (!d) return null
          return { day: d, col: di, date: new Date(year, month, d) }
        }).filter(Boolean) as { day: number; col: number; date: Date }[]

        if (weekDays.length === 0) return

        const weekStart = weekDays[0].date
        const weekEnd = weekDays[weekDays.length - 1].date

        if (start > weekEnd || end < weekStart) return

        const clampedStart = start < weekStart ? weekDays[0].col : weekDays.find((wd) => wd.date >= start)?.col ?? weekDays[0].col
        const clampedEnd = end > weekEnd ? weekDays[weekDays.length - 1].col : [...weekDays].reverse().find((wd) => wd.date <= end)?.col ?? weekDays[0].col

        const existing = bars.get(wi) || []
        existing.push({
          label: phase.label,
          colStart: clampedStart,
          colEnd: typeof clampedEnd === "number" ? clampedEnd : clampedStart,
          bg: phase.color,
          textColor: phase.textColor,
        })
        bars.set(wi, existing)
      })
    })

    return bars
  }, [weeks, year, month, phases])

  const taskCount = phases.length

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Legend */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        {Object.entries(phaseStyles).map(([label, s]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", s.bg)} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="p-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {MONTHS[month]} {year}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={prev} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={goToday} className="h-8 px-3.5 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-accent transition-colors">
              Today
            </button>
            <button onClick={next} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[12px] font-medium pb-2 text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="border-l border-border">
          {weeks.map((week, wi) => {
            const weekBars = phaseBarsByWeek.get(wi) || []
            const barRows: typeof weekBars[] = []
            weekBars.forEach((bar) => {
              let placed = false
              for (const row of barRows) {
                const overlaps = row.some(
                  (b) => !(bar.colEnd < b.colStart || bar.colStart > b.colEnd)
                )
                if (!overlaps) { row.push(bar); placed = true; break }
              }
              if (!placed) barRows.push([bar])
            })

            const isToday = (d: number | null) =>
              d !== null && today !== null && d === today.d && month === today.m && year === today.y

            return (
              <div key={wi}>
                {/* Date row */}
                <div className="grid grid-cols-7">
                  {week.map((day, di) => (
                    <div
                      key={`${wi}-${di}`}
                      className={cn(
                        "border-r border-b border-border px-2 py-1.5",
                        !day && "bg-accent/15"
                      )}
                    >
                      {day && (
                        <span
                          className={cn(
                            "text-[12px] font-medium inline-flex items-center justify-center",
                            isToday(day)
                              ? "bg-sky-500 text-white h-6 w-6 rounded-full text-[11px] font-semibold"
                              : "text-foreground"
                          )}
                        >
                          {day}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Phase bars */}
                {barRows.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-7 relative">
                    {week.map((day, di) => (
                      <div key={`bg-${di}`} className={cn("h-8 border-r border-b border-border", !day && "bg-accent/15")} />
                    ))}
                    {row.map((bar, bi) => {
                      const leftPct = (bar.colStart / 7) * 100
                      const widthPct = ((bar.colEnd - bar.colStart + 1) / 7) * 100
                      return (
                        <div
                          key={bi}
                          className={cn("absolute top-1 h-6 rounded-md flex items-center px-2 overflow-hidden", bar.bg, bar.textColor)}
                          style={{ left: `calc(${leftPct}% + 4px)`, width: `calc(${widthPct}% - 8px)` }}
                        >
                          <span className="text-[11px] font-medium truncate">{bar.label}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}

                {barRows.length === 0 && (
                  <div className="grid grid-cols-7">
                    {week.map((day, di) => (
                      <div key={`empty-${di}`} className={cn("h-6 border-r border-b border-border", !day && "bg-accent/15")} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[12px] text-muted-foreground mt-4">{taskCount} tasks</p>
      </div>
    </div>
  )
}

  useEffect(() => {
    const now = new Date()
    setToday({ d: now.getDate(), m: now.getMonth(), y: now.getFullYear() })
  }, [])

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }
  const goToday = () => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()) }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const weeks = useMemo(() => {
    const result: (number | null)[][] = []
    let week: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d)
      if (week.length === 7) {
        result.push(week)
        week = []
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      result.push(week)
    }
    return result
  }, [year, month, daysInMonth, firstDay])

  const phaseBarsByWeek = useMemo(() => {
    const bars: Map<number, { label: string; colStart: number; colEnd: number; bg: string; textColor: string }[]> = new Map()

    phases.forEach((phase) => {
      const start = parseDate(phase.startDate)
      const end = parseDate(phase.endDate)

      weeks.forEach((week, wi) => {
        const weekDays = week.map((d, di) => {
          if (!d) return null
          return { day: d, col: di, date: new Date(year, month, d) }
        }).filter(Boolean) as { day: number; col: number; date: Date }[]

        if (weekDays.length === 0) return

        const weekStart = weekDays[0].date
        const weekEnd = weekDays[weekDays.length - 1].date

        if (start > weekEnd || end < weekStart) return

        const clampedStart = start < weekStart ? weekDays[0].col : weekDays.find((wd) => wd.date >= start)?.col ?? weekDays[0].col
        const clampedEnd = end > weekEnd ? weekDays[weekDays.length - 1].col : [...weekDays].reverse().find((wd) => wd.date <= end)?.col ?? weekDays[0].col

        const existing = bars.get(wi) || []
        existing.push({
          label: phase.label,
          colStart: clampedStart,
          colEnd: typeof clampedEnd === "number" ? clampedEnd : clampedStart,
          bg: phase.color,
          textColor: phase.textColor,
        })
        bars.set(wi, existing)
      })
    })

    return bars
  }, [weeks, year, month])

  const taskCount = phases.length

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Controls */}
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(phaseStyles).map(([label, s]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", s.bg)} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Client Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[13px] text-muted-foreground font-medium">Client:</label>
          <SelectField value={selectedClient} onChange={setSelectedClient} options={clients} />
        </div>
      </div>

      <div className="p-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {MONTHS[month]} {year}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={prev} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={goToday} className="h-8 px-3.5 rounded-lg border border-border text-[13px] font-medium text-foreground hover:bg-accent transition-colors">
              Today
            </button>
            <button onClick={next} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[12px] font-medium pb-2 text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="border-l border-border">
          {weeks.map((week, wi) => {
            const weekBars = phaseBarsByWeek.get(wi) || []
            const barRows: typeof weekBars[] = []
            weekBars.forEach((bar) => {
              let placed = false
              for (const row of barRows) {
                const overlaps = row.some(
                  (b) => !(bar.colEnd < b.colStart || bar.colStart > b.colEnd)
                )
                if (!overlaps) { row.push(bar); placed = true; break }
              }
              if (!placed) barRows.push([bar])
            })

            const isToday = (d: number | null) =>
              d !== null && today !== null && d === today.d && month === today.m && year === today.y

            return (
              <div key={wi}>
                {/* Date row */}
                <div className="grid grid-cols-7">
                  {week.map((day, di) => (
                    <div
                      key={`${wi}-${di}`}
                      className={cn(
                        "border-r border-b border-border px-2 py-1.5",
                        !day && "bg-accent/15"
                      )}
                    >
                      {day && (
                        <span
                          className={cn(
                            "text-[12px] font-medium inline-flex items-center justify-center",
                            isToday(day)
                              ? "bg-sky-500 text-white h-6 w-6 rounded-full text-[11px] font-semibold"
                              : "text-foreground"
                          )}
                        >
                          {day}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Phase bars */}
                {barRows.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-7 relative">
                    {week.map((day, di) => (
                      <div key={`bg-${di}`} className={cn("h-8 border-r border-b border-border", !day && "bg-accent/15")} />
                    ))}
                    {row.map((bar, bi) => {
                      const leftPct = (bar.colStart / 7) * 100
                      const widthPct = ((bar.colEnd - bar.colStart + 1) / 7) * 100
                      return (
                        <div
                          key={bi}
                          className={cn("absolute top-1 h-6 rounded-md flex items-center px-2 overflow-hidden", bar.bg, bar.textColor)}
                          style={{ left: `calc(${leftPct}% + 4px)`, width: `calc(${widthPct}% - 8px)` }}
                        >
                          <span className="text-[11px] font-medium truncate">{bar.label}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}

                {barRows.length === 0 && (
                  <div className="grid grid-cols-7">
                    {week.map((day, di) => (
                      <div key={`empty-${di}`} className={cn("h-6 border-r border-b border-border", !day && "bg-accent/15")} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[12px] text-muted-foreground mt-4">{taskCount} tasks</p>
      </div>
    </div>
  )
}
