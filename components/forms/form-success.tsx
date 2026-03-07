/**
 * FormSuccess — full-screen success/confirmation card.
 * Shown after a form has been submitted successfully.
 */

import { CheckCircle2 } from 'lucide-react'

interface FormSuccessProps {
  title: string
  description: React.ReactNode
  footnote?: string
}

export function FormSuccess({ title, description, footnote = 'You can close this window.' }: FormSuccessProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-10 max-w-sm w-full text-center flex flex-col items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
          <div className="text-[14px] text-neutral-500 mt-2 leading-relaxed">
            {description}
          </div>
        </div>
        <div className="w-full h-px bg-neutral-100" />
        <p className="text-[11px] text-neutral-400">{footnote}</p>
      </div>
    </div>
  )
}
