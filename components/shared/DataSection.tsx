/**
 * DataSection — Suspense boundary wrapper for async data sections.
 *
 * Use this to wrap any section that fetches data independently.
 * The fallback renders while the section's async server component resolves.
 * An error boundary catches section-level failures without crashing the page.
 *
 * Usage (in a page.tsx):
 *   <DataSection fallback={<TableSkeleton rows={6} />}>
 *     <LeadsTable />   ← async Server Component
 *   </DataSection>
 */

import { Suspense } from 'react'
import { AlertCircle } from 'lucide-react'

interface DataSectionProps {
  children: React.ReactNode
  fallback: React.ReactNode
}

export function DataSection({ children, fallback }: DataSectionProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}

// ─── Inline error fallback ────────────────────────────────────────────────────
export function SectionError({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex items-center gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
      <div>
        <p className="text-sm font-medium text-red-700">Failed to load data</p>
        {message && (
          <p className="text-xs text-red-600 mt-0.5">{message}</p>
        )}
      </div>
    </div>
  )
}
