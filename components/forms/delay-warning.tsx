/**
 * DelayWarning — amber overdue banner + required reason textarea.
 * Matches the Fillout form pattern: "Note: This task was due on [field]. Please indicate the reason for the delay."
 */

import { AlertTriangle } from 'lucide-react'
import { inputCls, labelCls } from './form-field'

interface DelayWarningProps {
  dueDate: string              // ISO date string or human-readable
  dueDateLabel: string         // e.g. "Design Due Date", "Dev Due Date", "QA Due Date"
  daysOverdue: number
  delayReason: string
  onDelayReasonChange: (value: string) => void
}

export function DelayWarning({
  dueDate,
  dueDateLabel,
  daysOverdue,
  delayReason,
  onDelayReasonChange,
}: DelayWarningProps) {
  const formattedDate = formatDate(dueDate)

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[13px] text-amber-800 leading-relaxed">
          <span className="font-semibold">Note:</span> This task was due on{' '}
          <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 text-[12px] font-medium text-amber-700">
            {dueDateLabel}
          </span>{' '}
          ({formattedDate} &mdash; {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue).
          Please indicate the reason for the delay.
        </div>
      </div>

      {/* Reason field */}
      <div>
        <label className={labelCls}>
          Reason for Delay <span className="text-red-400">*</span>
        </label>
        <textarea
          value={delayReason}
          onChange={(e) => onDelayReasonChange(e.target.value)}
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Explain the reason for the delay..."
          required
        />
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
