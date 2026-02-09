"use client"

import { Badge } from "@/components/ui/badge"

/**
 * StatusBadge — Standardized status display across the system
 * 
 * Uses flat, muted tones by default (subtle variant) for data-dense views.
 * Solid variant available for emphasis where needed.
 *
 * Color mapping:
 * - Green:  Successful, Winner, Approved, Active
 * - Rose:   Unsuccessful, Failed, Loser, Blocked
 * - Amber:  Pending, Draft, Inconclusive
 * - Sky:    In Progress, Development, QA, Design
 * - Teal:   Live, Collecting
 * - Slate:  Mixed, Unknown
 */

export type BadgeStatus =
  | "successful" | "unsuccessful" | "pending" | "blocked"
  | "in_progress" | "mixed" | "live" | "inconclusive"
  | "approved" | "failed" | "winner" | "loser"
  | "draft" | "collecting" | "unknown"

// Ordered: longer/more-specific keywords first to avoid substring conflicts
const statusMap: Record<string, BadgeStatus> = {
  unsuccessful: "unsuccessful",
  successful: "successful",
  loser: "unsuccessful",
  winner: "successful",
  failed: "unsuccessful",
  blocked: "blocked",
  pending: "pending",
  draft: "draft",
  "in progress": "in_progress",
  "in-progress": "in_progress",
  mixed: "mixed",
  collecting: "live",
  live: "live",
  inconclusive: "inconclusive",
  approved: "successful",
}

// Subtle variant — soft bg, muted text (default for data-dense views)
const subtleStyles: Record<BadgeStatus, string> = {
  successful:   "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  unsuccessful: "bg-rose-50 text-rose-700 border-rose-200/60",
  pending:      "bg-amber-50 text-amber-700 border-amber-200/60",
  blocked:      "bg-rose-50 text-rose-600 border-rose-200/60",
  in_progress:  "bg-sky-50 text-sky-700 border-sky-200/60",
  mixed:        "bg-slate-100 text-slate-600 border-slate-200/60",
  live:         "bg-teal-50 text-teal-700 border-teal-200/60",
  inconclusive: "bg-amber-50 text-amber-600 border-amber-200/60",
  draft:        "bg-slate-50 text-slate-600 border-slate-200/60",
  collecting:   "bg-teal-50 text-teal-700 border-teal-200/60",
  failed:       "bg-rose-50 text-rose-700 border-rose-200/60",
  winner:       "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  loser:        "bg-rose-50 text-rose-700 border-rose-200/60",
  approved:     "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  unknown:      "bg-slate-50 text-slate-500 border-slate-200/60",
}

// Solid variant — stronger bg for callouts and headers
const solidStyles: Record<BadgeStatus, string> = {
  successful:   "bg-emerald-600 text-white",
  unsuccessful: "bg-rose-500 text-white",
  pending:      "bg-amber-500 text-white",
  blocked:      "bg-rose-500 text-white",
  in_progress:  "bg-sky-500 text-white",
  mixed:        "bg-slate-500 text-white",
  live:         "bg-teal-600 text-white",
  inconclusive: "bg-amber-500 text-white",
  draft:        "bg-slate-400 text-white",
  collecting:   "bg-teal-600 text-white",
  failed:       "bg-rose-500 text-white",
  winner:       "bg-emerald-600 text-white",
  loser:        "bg-rose-500 text-white",
  approved:     "bg-emerald-600 text-white",
  unknown:      "bg-slate-400 text-white",
}

function getStatusType(status: string): BadgeStatus {
  const normalized = status.toLowerCase().trim()
  for (const [key, value] of Object.entries(statusMap)) {
    if (normalized.includes(key)) return value
  }
  return "unknown"
}

interface StatusBadgeProps {
  status?: string
  label?: string
  /** "subtle" (default) for data-dense views, "solid" for emphasis */
  variant?: "subtle" | "solid"
}

export function StatusBadge({ status, label, variant = "subtle" }: StatusBadgeProps) {
  if (!status) return <Badge variant="outline" className="text-xs">Unknown</Badge>

  const statusType = getStatusType(status)
  const displayLabel = label || status
  const styles = variant === "solid" ? solidStyles[statusType] : subtleStyles[statusType]

  return <Badge className={`text-xs font-medium border ${styles}`}>{displayLabel}</Badge>
}
