"use client"

import { ReactNode } from "react"

interface GraphCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/**
 * GraphCard is a specialized card component for rendering charts and graphs
 * with predefined spacing for axis labels, titles, and content.
 * 
 * Layout structure:
 * - Header: Title and description (py-2)
 * - Content: Chart area with space for Y-axis label on left (px-4 py-3)
 * - X-axis label area: Extra padding at bottom for comfortable spacing (pb-6)
 */
export const GraphCard = ({ title, description, children, className = "" }: GraphCardProps) => {
  return (
    <div className={`bg-white border border-border rounded-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-slate-600 rounded-t-sm">
        <h3 className="text-xs font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-slate-200">{description}</p>}
      </div>

      {/* Chart Content - with proper breathing room for labels */}
      <div className="flex-1 px-2 py-4 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
