/**
 * FormField — label + input wrapper with consistent styles.
 * Provides the standard label and input class names used across all hosted forms.
 */

import { cn } from '@/lib/utils'

// Shared CSS class strings — can be used directly when FormField wrapper isn't appropriate
export const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-colors'

export const labelCls =
  'text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5 block'

interface FormFieldProps {
  label: string
  required?: boolean
  description?: string
  className?: string
  children: React.ReactNode
}

export function FormField({ label, required, description, className, children }: FormFieldProps) {
  return (
    <div className={cn(className)}>
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {description && (
        <p className="text-[11px] text-neutral-400 mb-2 -mt-0.5 leading-relaxed">{description}</p>
      )}
      {children}
    </div>
  )
}
