"use client"

import { X, Clock, User, Tag, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarTask {
  day: number
  month: number
  year: number
  title: string
  subtitle: string
  time: string
  type: "call" | "followup" | "meeting"
}

interface TaskDetailsModalProps {
  isOpen: boolean
  task: CalendarTask | null
  onClose: () => void
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const typeConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string; icon: string }> = {
  call: {
    label: "Call",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
    icon: "📞",
  },
  followup: {
    label: "Follow Up",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: "↩",
  },
  meeting: {
    label: "Meeting",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: "👥",
  },
}

// Expanded task details keyed by title+subtitle for demo data
const taskDetails: Record<string, { description: string; assignee: string; priority: string; notes: string }> = {
  "Discovery Call|Goose Creek Candles": {
    description: "Initial discovery call to understand their current marketing setup, goals, and pain points. Focus on understanding their AOV, CAC, and current ROAS.",
    assignee: "Alex Morgan",
    priority: "High",
    notes: "They run primarily on Meta. Budget around $15k/mo. Looking to scale to $30k. Decision maker is the founder — James.",
  },
  "Follow up|Primal Queen": {
    description: "Follow up on the proposal sent last week. Check if they have reviewed the strategy deck and address any questions.",
    assignee: "Sarah Lee",
    priority: "Medium",
    notes: "Sent proposal on Jan 6. They seemed interested but wanted to review with their CFO first.",
  },
  "Sales Call|Blox Boom": {
    description: "Close the deal. They've reviewed the proposal and are ready to move forward. Go over onboarding timeline and kick-off process.",
    assignee: "Alex Morgan",
    priority: "High",
    notes: "Deal value ~$8k/mo retainer. They want to start Feb 1. Have the MSA ready to send after the call.",
  },
  "Team Sync|Internal": {
    description: "Weekly internal sales team sync. Review pipeline, discuss blockers, and align on weekly priorities.",
    assignee: "All Sales",
    priority: "Medium",
    notes: "Agenda: pipeline review, new lead updates, strategy feedback from last week.",
  },
  "Onboarding Call|Perfect White Tee": {
    description: "Kick-off onboarding call. Walk through the onboarding checklist, collect all access credentials, and set expectations for the first 30 days.",
    assignee: "Jamie Torres",
    priority: "High",
    notes: "They are a new client starting this month. Make sure to collect FB Business Manager access, Shopify read access, and GA4 access.",
  },
  "Call Jim|Fake Brand": {
    description: "Check-in call with Jim to see how the first month is going and whether they're happy with progress.",
    assignee: "Alex Morgan",
    priority: "Low",
    notes: "Jim is generally happy. Just a relationship touch-point call.",
  },
  "Review Proposal|Kitty Spout": {
    description: "Walk through the proposal together on a screen share. Address objections and work toward a close.",
    assignee: "Sarah Lee",
    priority: "High",
    notes: "They had concerns about the timeline. Be ready to offer a 2-week faster ramp-up option.",
  },
  "Call Dave|Fake User": {
    description: "Reconnect call with Dave who went cold after initial discovery. See if they're still interested.",
    assignee: "Alex Morgan",
    priority: "Low",
    notes: "Dave went quiet after the first call. Last contact was 3 weeks ago.",
  },
  "Qualifying Call|New Lead": {
    description: "Initial qualifying call with a new inbound lead. Determine if they're a good fit based on budget, timeline, and goals.",
    assignee: "Jamie Torres",
    priority: "Medium",
    notes: "Came in through the website contact form. No context yet — come in with discovery questions.",
  },
  "Strategy Meeting|Team": {
    description: "Monthly strategy alignment meeting with the full team. Review what's working, what's not, and set goals for the coming month.",
    assignee: "All Sales",
    priority: "Medium",
    notes: "Bring data from last month's pipeline. Identify top 3 priorities for February.",
  },
  "Client Check-in|Goose Creek": {
    description: "Monthly client check-in to review results, discuss upcoming experiments, and keep the relationship strong.",
    assignee: "Alex Morgan",
    priority: "Medium",
    notes: "Highlight ROAS improvement from last month's creative refresh. Propose scaling budget.",
  },
}

const priorityColors: Record<string, string> = {
  High: "bg-red-50 text-red-600 border-red-200",
  Medium: "bg-amber-50 text-amber-600 border-amber-200",
  Low: "bg-slate-50 text-slate-500 border-slate-200",
}

export function TaskDetailsModal({ isOpen, task, onClose }: TaskDetailsModalProps) {
  if (!isOpen || !task) return null

  const config = typeConfig[task.type]
  const detailKey = `${task.title}|${task.subtitle}`
  const details = taskDetails[detailKey] ?? {
    description: "No additional details available for this task.",
    assignee: "Unassigned",
    priority: "Medium",
    notes: "",
  }

  const dateStr = `${MONTHS[task.month]} ${task.day}, ${task.year}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-label={task.title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md">
        {/* Header */}
        <div className={cn("rounded-t-xl px-5 py-4 border-b border-border flex items-start justify-between gap-3", config.bg)}>
          <div className="flex items-start gap-3 min-w-0">
            <span className={cn("mt-0.5 h-2.5 w-2.5 rounded-full shrink-0", config.dot)} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground leading-tight">{task.title}</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">{task.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4 text-foreground/60" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border", config.bg, config.text, config.border)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
              {config.label}
            </span>
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border", priorityColors[details.priority])}>
              {details.priority} Priority
            </span>
          </div>

          {/* Info fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Date</p>
                <p className="text-[13px] text-foreground font-medium">{dateStr}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Time</p>
                <p className="text-[13px] text-foreground font-medium">{task.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Assignee</p>
                <p className="text-[13px] text-foreground font-medium">{details.assignee}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Type</p>
                <p className="text-[13px] text-foreground font-medium capitalize">{task.type}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Description */}
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-[13px] text-foreground leading-relaxed">{details.description}</p>
          </div>

          {/* Notes */}
          {details.notes && (
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Notes</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{details.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
