import { ReactNode } from "react"

interface FinancialCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export const FinancialCard = ({ title, description, children, className = "" }: FinancialCardProps) => {
  return (
    <div className={`bg-white border border-border rounded-sm flex flex-col ${className}`}>
      <div className="px-4 py-3 border-b border-border bg-slate-600 rounded-t-sm">
        <h3 className="text-xs font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-slate-200">{description}</p>}
      </div>
      <div className="flex-1 px-3 py-2 overflow-hidden">{children}</div>
    </div>
  )
}
