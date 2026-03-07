/**
 * StepCard — numbered section card for form steps.
 * Used across all hosted forms for consistent visual grouping.
 */

interface StepCardProps {
  num: string       // e.g. "01", "02"
  title: string
  children: React.ReactNode
}

export function StepCard({ num, title, children }: StepCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
        <span className="h-6 w-6 rounded-full bg-sky-500/10 text-sky-600 text-[11px] font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <h2 className="text-[14px] font-semibold text-neutral-800 tracking-tight">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
