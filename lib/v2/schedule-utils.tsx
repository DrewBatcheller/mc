import { CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react"

export function getStatusIcon(status?: string) {
  switch (status?.toLowerCase()) {
    case "done":
    case "complete":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    case "in progress":
    case "active":
      return <Clock className="h-3.5 w-3.5 text-blue-500" />
    case "overdue":
      return <AlertCircle className="h-3.5 w-3.5 text-red-500" />
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

export function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "done":
    case "complete":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "in progress":
    case "active":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    case "not started":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getDeptColor(dept?: string) {
  switch (dept?.toLowerCase()) {
    case "strategy":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "design":
      return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400"
    case "development":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "qa":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    case "post-test analysis":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
    case "calls":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function isOverdue(dueDate?: string, status?: string) {
  if (!dueDate || status === "Done" || status === "Complete") return false
  return new Date(dueDate) < new Date()
}
