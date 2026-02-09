import React from "react"

interface DashboardGridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

/**
 * Unified grid wrapper for all dashboard layouts (metric cards, charts, financial cards, etc.)
 * Provides consistent gap-2 spacing horizontally and mt-2 spacing vertically between rows
 * Ensures uniform spacing across all dashboard elements
 */
export function DashboardGrid({
  children,
  cols = 4,
  className = "",
}: DashboardGridProps) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  }[cols]

  return (
    <div className={`grid ${colClass} gap-2 mt-2 ${className}`}>
      {children}
    </div>
  )
}
