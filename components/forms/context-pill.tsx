/**
 * ContextPill — read-only entity metadata display.
 * Shows key contextual info (Brand Name, Test Description, etc.) as a pill/badge.
 */

import { cn } from '@/lib/utils'

interface ContextPillProps {
  label: string
  value: string
  className?: string
}

export function ContextPill({ label, value, className }: ContextPillProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      <span className="text-[13px] font-medium text-neutral-700">{value}</span>
    </div>
  )
}

/**
 * ContextHeader — a row of context pills, used at the top of forms.
 */
interface ContextHeaderProps {
  items: Array<{ label: string; value: string }>
  className?: string
}

export function ContextHeader({ items, className }: ContextHeaderProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.filter(i => i.value).map((item) => (
        <ContextPill key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  )
}
