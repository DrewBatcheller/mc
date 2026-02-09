/**
 * Badge color utilities — consistent styling across the system
 * Uses soft flat tones aligned with MC brand (teals, navy-greys, greens)
 *
 * Semantic mapping:
 * - Active/Won     → emerald
 * - Paused/Pending → amber
 * - Churned/Lost   → rose
 * - New/Open       → teal
 * - Proposal/Sales → sky
 * - Progress       → blue
 */

export function getClientStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400"
    case "paused":
      return "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400"
    case "churned":
      return "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/20 dark:text-rose-400"
    default:
      return "bg-slate-50 text-slate-500 border-slate-200/60"
  }
}

export function getLeadStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "new":
    case "fresh":
      return "bg-teal-50 text-teal-700 border-teal-200/60 dark:bg-teal-900/20 dark:text-teal-400"
    case "contacted":
      return "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400"
    case "qualified":
      return "bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-900/20 dark:text-sky-400"
    case "proposal":
      return "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400"
    case "won":
    case "converted to client":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400"
    case "lost":
    case "rejected":
    case "dead":
      return "bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-900/20 dark:text-rose-400"
    case "stale":
      return "bg-slate-100 text-slate-500 border-slate-200/60 dark:bg-slate-800/20 dark:text-slate-400"
    case "client":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400"
    default:
      return "bg-slate-50 text-slate-500 border-slate-200/60"
  }
}

export function getLeadStageColor(stage?: string) {
  switch (stage?.toLowerCase()) {
    case "open":
      return "bg-teal-50 text-teal-700 border-teal-200/60 dark:bg-teal-900/20 dark:text-teal-400"
    case "qualifying call":
      return "bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-900/20 dark:text-sky-400"
    case "sales call":
      return "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400"
    case "onboarding call":
      return "bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-900/20 dark:text-cyan-400"
    case "closed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400"
    case "maybe":
      return "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400"
    case "no show":
      return "bg-orange-50 text-orange-600 border-orange-200/60 dark:bg-orange-900/20 dark:text-orange-400"
    case "churned / rejected":
      return "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/20 dark:text-rose-400"
    default:
      return "bg-slate-50 text-slate-500 border-slate-200/60"
  }
}
