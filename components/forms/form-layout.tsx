'use client'

/**
 * FormLayout — shared wrapper for all hosted forms.
 *
 * Provides:
 * - Sticky header with entity info + form title badge
 * - Scrollable body container (max-w-3xl centered)
 * - Sticky bottom bar with submit button
 * - Suspense boundary for search params
 */

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Header ──────────────────────────────────────────────────────────────────

interface FormHeaderProps {
  title: string              // e.g. "Submit Test Mockups"
  entityName: string         // e.g. "Vita Hustle January 2026"
  entityInitial?: string     // First character for avatar (defaults to first char of entityName)
  badge?: string             // Optional status badge text
  badgeColor?: 'amber' | 'sky' | 'emerald' | 'neutral'
}

export function FormHeader({
  title,
  entityName,
  entityInitial,
  badge,
  badgeColor = 'sky',
}: FormHeaderProps) {
  const initial = entityInitial ?? (entityName[0] ?? '?').toUpperCase()
  const badgeColorMap = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  }

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm">
            {initial}
          </div>
          <div className="min-w-0 leading-snug">
            <p className="text-[13px] font-semibold text-neutral-800 truncate">{title}</p>
            <p className="text-[11px] text-neutral-400 truncate">{entityName}</p>
          </div>
        </div>
        {badge && (
          <span className={cn(
            'text-[11px] font-semibold px-3 py-1 rounded-full border whitespace-nowrap shrink-0',
            badgeColorMap[badgeColor]
          )}>
            {badge}
          </span>
        )}
      </div>
    </header>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

interface FormFooterProps {
  onSubmit: () => void
  submitting: boolean
  submitLabel?: string
  submittingLabel?: string
  disabled?: boolean
  summary?: React.ReactNode   // Left-side summary text
}

export function FormFooter({
  onSubmit,
  submitting,
  submitLabel = 'Submit',
  submittingLabel = 'Submitting...',
  disabled,
  summary,
}: FormFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 shadow-[0_-4px_16px_rgba(0,0,0,0.07)] z-20">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {summary ? (
          <div className="text-[13px] text-neutral-500 leading-snug min-w-0 truncate">
            {summary}
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={onSubmit}
          disabled={submitting || disabled}
          className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 text-white text-[13px] font-semibold rounded-xl hover:bg-sky-600 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-sky-500/20 shrink-0"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  )
}

// ─── Body ────────────────────────────────────────────────────────────────────

interface FormBodyProps {
  children: React.ReactNode
  className?: string
}

export function FormBody({ children, className }: FormBodyProps) {
  return (
    <div className={cn('max-w-3xl mx-auto px-6 py-8 space-y-4 pb-36', className)}>
      {children}
    </div>
  )
}

// ─── Error Banner ────────────────────────────────────────────────────────────

interface FormErrorProps {
  message: string | null
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
      {message}
    </div>
  )
}

// ─── Loading fallback ────────────────────────────────────────────────────────

export function FormLoadingFallback() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
    </div>
  )
}

// ─── Page wrapper with Suspense ──────────────────────────────────────────────

interface FormPageProps {
  children: React.ReactNode
}

export function FormPage({ children }: FormPageProps) {
  return (
    <Suspense fallback={<FormLoadingFallback />}>
      <div className="min-h-screen bg-neutral-50">
        {children}
      </div>
    </Suspense>
  )
}
