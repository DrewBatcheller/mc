"use client"

import { useState, useMemo } from "react"
import { useTasks, useClients, useTeam } from "@/hooks/v2/use-airtable"
import { useUser } from "@/contexts/v2/user-context"
import type { AirtableRecord, TaskFields } from "@/lib/v2/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Calendar as CalendarIcon,
  LayoutGrid,
  ListTodo,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TaskDetailModal } from "./task-detail-modal"
import { getStatusIcon, getStatusColor, getDeptColor, formatDate, isOverdue } from "@/lib/v2/schedule-utils"

const DEPARTMENTS = ["All", "Strategy", "Design", "Development", "QA", "Post-Test Analysis", "Calls"]

export function ScheduleContent({ initialView = "kanban" }: { initialView?: "calendar" | "kanban" | "list" } = {}) {
  const { currentUser } = useUser()
  const { tasks, isLoading } = useTasks()
  const { clients } = useClients()
  const { team } = useTeam()
  const [department, setDepartment] = useState("All")
  const [statusFilter, setStatusFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"calendar" | "kanban" | "list">(initialView)
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AirtableRecord<TaskFields> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Calendar state
  const today = new Date()
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())

  const isManagement = currentUser?.role === "management"
  const isTeam = currentUser?.role === "team"

  // Build client-to-assigned-team map for user filtering
  const clientAssignmentMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of clients) {
      // Map client record ID -> assigned team member per dept
      if (c.fields.Developer) map[`${c.id}_Development`] = c.fields.Developer
      if (c.fields.Designer) map[`${c.id}_Design`] = c.fields.Designer
      if (c.fields.Strategist) map[`${c.id}_Strategy`] = c.fields.Strategist
      if (c.fields.QA) map[`${c.id}_QA`] = c.fields.QA
    }
    return map
  }, [clients])

  const clientNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of clients) {
      map[c.id] = c.fields["Brand Name"]
    }
    return map
  }, [clients])

  // Get team members in the current user's department for the user filter
  const deptTeamMembers = useMemo(() => {
    if (!isManagement) return []
    const activeDept = department !== "All" ? department : null
    return team.filter((m) => {
      if (activeDept && m.fields.Department !== activeDept) return false
      return m.fields["Employment Status"]?.toLowerCase() !== "inactive"
    }).sort((a, b) => (a.fields["Full Name"] || "").localeCompare(b.fields["Full Name"] || ""))
  }, [team, department, isManagement])

  const filteredTasks = useMemo(() => {
    let result = tasks

    // Team members only see their department tasks
    if (isTeam && currentUser?.department) {
      result = result.filter((t) => t.fields.Department === currentUser.department)
    }

    // Department filter (management only)
    if (isManagement && department !== "All") {
      result = result.filter((t) => t.fields.Department === department)
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        result = result.filter((t) => isOverdue(t.fields["Due Date"], t.fields.Status))
      } else {
        result = result.filter((t) => t.fields.Status?.toLowerCase() === statusFilter.toLowerCase())
      }
    }

    // User filter (management filtering by team member)
    if (isManagement && userFilter !== "all") {
      result = result.filter((t) => {
        return t.fields["Assigned to"] === userFilter
      })
    }

    // "Show only my tasks" toggle for team members
    if (isTeam && showOnlyMine && currentUser?.name) {
      result = result.filter((t) => {
        return t.fields["Assigned to"] === currentUser.name
      })
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.fields["Team Facing Name"]?.toLowerCase().includes(q) ||
          t.fields["Client Facing Name"]?.toLowerCase().includes(q) ||
          t.fields["Brand Name (from Batch)"]?.toLowerCase().includes(q)
      )
    }

    return result
  }, [tasks, department, statusFilter, search, currentUser, isManagement, isTeam, userFilter, showOnlyMine])

  // Group tasks by status for kanban
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, AirtableRecord<TaskFields>[]> = {
      "Not Started": [],
      "In Progress": [],
      "Done": [],
    }
    for (const task of filteredTasks) {
      const status = task.fields.Status || "Not Started"
      if (status.toLowerCase().includes("done") || status.toLowerCase().includes("complete")) {
        groups.Done.push(task)
      } else if (status.toLowerCase().includes("progress") || status.toLowerCase().includes("active")) {
        groups["In Progress"].push(task)
      } else {
        groups["Not Started"].push(task)
      }
    }
    return groups
  }, [filteredTasks])

  // Group tasks by department for kanban
  const tasksByDepartment = useMemo(() => {
    const groups: Record<string, AirtableRecord<TaskFields>[]> = {}
    for (const task of filteredTasks) {
      const dept = task.fields.Department || "Unassigned"
      if (!groups[dept]) groups[dept] = []
      groups[dept].push(task)
    }
    return groups
  }, [filteredTasks])

  // Group tasks by date for calendar
  const tasksByDate = useMemo(() => {
    const map: Record<string, AirtableRecord<TaskFields>[]> = {}
    for (const task of filteredTasks) {
      const due = task.fields["Due Date"]
      if (!due) continue
      const dateKey = due.split("T")[0] // YYYY-MM-DD
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(task)
    }
    return map
  }, [filteredTasks])

  const overdueCount = tasks.filter((t) => isOverdue(t.fields["Due Date"], t.fields.Status)).length

  // Calendar navigation
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) }
    else setCalMonth(calMonth - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) }
    else setCalMonth(calMonth + 1)
  }
  const goToToday = () => {
    setCalMonth(today.getMonth())
    setCalYear(today.getFullYear())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Schedule & Tasks</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTasks.length} tasks{overdueCount > 0 ? ` -- ${overdueCount} overdue` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "calendar" ? "default" : "outline"}
              size="sm"
              className={view !== "calendar" ? "bg-transparent" : ""}
              onClick={() => setView("calendar")}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Calendar
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "outline"}
              size="sm"
              className={view !== "kanban" ? "bg-transparent" : ""}
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              className={view !== "list" ? "bg-transparent" : ""}
              onClick={() => setView("list")}
            >
              <ListTodo className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Department filter - management can select, team sees their dept */}
          {isManagement && (
            <Select value={department} onValueChange={(val) => { setDepartment(val); setUserFilter("all") }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not started">Not Started</SelectItem>
              <SelectItem value="in progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          {/* User filter for management */}
          {isManagement && deptTeamMembers.length > 0 && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Team Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {deptTeamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.fields["Full Name"] || m.id}>
                    {m.fields["Full Name"]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Show only mine toggle for team members */}
          {isTeam && (
            <div className="flex items-center gap-2">
              <Switch
                id="show-mine"
                checked={showOnlyMine}
                onCheckedChange={setShowOnlyMine}
              />
              <Label htmlFor="show-mine" className="text-sm text-muted-foreground cursor-pointer">
                My tasks only
              </Label>
            </div>
          )}

          {isTeam && currentUser?.department && (
            <Badge variant="outline" className="text-xs">
              {currentUser.department}
            </Badge>
          )}
        </div>

        {/* Calendar View */}
        {view === "calendar" && (
          <CalendarView
            calMonth={calMonth}
            calYear={calYear}
            tasksByDate={tasksByDate}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            goToToday={goToToday}
            today={today}
          />
        )}

        {/* Kanban View */}
        {view === "kanban" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "400px" }}>
              {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                <div key={status} className="flex flex-col gap-2 min-w-[320px] flex-shrink-0">
                  <div className="flex items-center gap-2 mb-1 sticky top-0 bg-background py-1">
                    {getStatusIcon(status)}
                    <h3 className="font-semibold text-sm text-foreground">{status}</h3>
                    <Badge variant="secondary" className="text-xs">{statusTasks.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {statusTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        clientNameMap={clientNameMap}
                        onClick={() => {
                          setSelectedTask(task)
                          setIsModalOpen(true)
                        }}
                      />
                    ))}
                    {statusTasks.length === 0 && (
                      <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-md">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Extra columns by department when in "All" view */}
              {department === "All" && isManagement && Object.keys(tasksByDepartment).length > 3 && null}
            </div>
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const overdue = isOverdue(task.fields["Due Date"], task.fields.Status)
                    return (
                      <TableRow key={task.id} className={`${overdue ? "bg-red-50 dark:bg-red-900/10" : ""} cursor-pointer hover:bg-muted/50 transition-colors`} onClick={() => {
                        setSelectedTask(task)
                        setIsModalOpen(true)
                      }}>
                        <TableCell className="font-medium text-sm max-w-xs truncate">
                          {task.fields["Team Facing Name"]}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.fields["Brand Name (from Batch)"] || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getDeptColor(task.fields.Department)}`}>
                            {task.fields.Department || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {formatDate(task.fields["Due Date"])}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${getStatusColor(overdue ? "overdue" : task.fields.Status)}`}>
                            {overdue ? "Overdue" : task.fields.Status || "Not Started"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.fields["Assigned to"] || "-"}
                        </TableCell>
                        <TableCell>
                          {task.fields["Open URL"] && (
                            <a
                              href={task.fields["Open URL"]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        No tasks found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Task Detail Modal */}
        <TaskDetailModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTask(null)
          }}
          clientNameMap={clientNameMap}
        />
      </div>
    </TooltipProvider>
  )
}

// Calendar View Component
function CalendarView({
  calMonth,
  calYear,
  tasksByDate,
  prevMonth,
  nextMonth,
  goToToday,
  today,
}: {
  calMonth: number
  calYear: number
  tasksByDate: Record<string, AirtableRecord<TaskFields>[]>
  prevMonth: () => void
  nextMonth: () => void
  goToToday: () => void
  today: Date
}) {
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()

  // Build calendar grid cells
  const cells: Array<{ day: number | null; dateKey: string }> = []
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateKey: "" })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth + 1).padStart(2, "0")
    const dd = String(d).padStart(2, "0")
    cells.push({ day: d, dateKey: `${calYear}-${mm}-${dd}` })
  }
  // Fill remaining cells to complete last row
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dateKey: "" })
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  return (
    <div className="flex flex-col gap-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-transparent" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground min-w-[180px] text-center">
            {new Date(calYear, calMonth).toLocaleString("default", { month: "long" })} {calYear}
          </h2>
          <Button variant="outline" size="sm" className="bg-transparent" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="bg-transparent" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-l border-t border-border">
        {cells.map((cell, idx) => {
          const dayTasks = cell.dateKey ? tasksByDate[cell.dateKey] || [] : []
          const isToday = cell.dateKey === todayKey
          const isPast = cell.day && new Date(cell.dateKey) < new Date(todayKey)

          return (
            <div
              key={idx}
              className={`border-r border-b border-border min-h-[100px] p-1 ${
                cell.day === null ? "bg-muted/30" : ""
              } ${isToday ? "bg-teal-50/60 dark:bg-teal-950/20" : ""}`}
            >
              {cell.day !== null && (
                <>
                  <div className={`text-xs font-medium mb-0.5 ${
                    isToday ? "text-teal-700 font-bold" : "text-muted-foreground"
                  }`}>
                    {cell.day}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[80px]">
                    {dayTasks.slice(0, 3).map((task) => {
                      const overdue = isOverdue(task.fields["Due Date"], task.fields.Status)
                      return (
                        <Tooltip key={task.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-default ${
                                overdue
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : task.fields.Status?.toLowerCase().includes("done")
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : task.fields.Status?.toLowerCase().includes("progress")
                                      ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {task.fields["Team Facing Name"]}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            <div className="text-xs">
                              <p className="font-medium">{task.fields["Team Facing Name"]}</p>
                              <p className="text-muted-foreground">{task.fields["Brand Name (from Batch)"] || "No client"}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {task.fields.Department || "N/A"}
                                </Badge>
                                <Badge className={`text-[10px] px-1 py-0 ${getStatusColor(overdue ? "overdue" : task.fields.Status)}`}>
                                  {overdue ? "Overdue" : task.fields.Status || "Not Started"}
                                </Badge>
                              </div>
                              {task.fields["Assigned to"] && (
                                <p className="text-muted-foreground mt-1">Assigned: {task.fields["Assigned to"]}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  clientNameMap,
  onClick,
}: {
  task: AirtableRecord<TaskFields>
  clientNameMap: Record<string, string>
  onClick?: () => void
}) {
  const overdue = isOverdue(task.fields["Due Date"], task.fields.Status)
  const clientName =
    task.fields["Brand Name (from Batch)"] ||
    (task.fields.Client?.[0] ? clientNameMap[task.fields.Client[0]] : null) ||
    "N/A"

  return (
    <Card className={`${overdue ? "border-red-300 dark:border-red-800" : ""} cursor-pointer hover:shadow-md transition-shadow`} onClick={onClick}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {task.fields["Team Facing Name"]}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
          </div>
          {task.fields["Open URL"] && (
            <a
              href={task.fields["Open URL"]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className={`text-xs ${getDeptColor(task.fields.Department)}`}>
            {task.fields.Department || "N/A"}
          </Badge>
          <span className={`text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            {overdue ? "Overdue - " : ""}
            {formatDate(task.fields["Due Date"])}
          </span>
        </div>
        {task.fields["Assigned to"] && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Assigned: {task.fields["Assigned to"]}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
