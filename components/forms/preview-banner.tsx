/**
 * Preview Mode — shared infrastructure for form preview.
 *
 * When ?id=preview, forms render with mock data and all interactions disabled.
 * This lets management view the form layout from the Forms Directory without
 * needing a real Airtable record ID.
 */

import { Eye } from 'lucide-react'

/** Check if the current form is in preview mode */
export function isPreviewMode(id: string): boolean {
  return id.toLowerCase() === 'preview'
}

/** Amber banner displayed at the top of forms in preview mode */
export function PreviewBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-3xl mx-auto px-6 py-2 flex items-center justify-center gap-2">
        <Eye className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-[12px] font-semibold text-amber-700">
          Preview Mode — display only with sample data
        </span>
      </div>
    </div>
  )
}

/**
 * Wrapper that disables all pointer events and dims interactive elements.
 * Wrap the form body content in this when in preview mode.
 */
export function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none select-none">
      {children}
    </div>
  )
}
