"use client"

import { cn } from "@/lib/utils"
import { ArrowUpRight } from "lucide-react"

interface ContentCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  actionLabel?: string
  onActionClick?: () => void
  className?: string
}

export function ContentCard({
  title,
  subtitle,
  children,
  actionLabel,
  onActionClick,
  className,
}: ContentCardProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border flex flex-col", className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {onActionClick && actionLabel && (
          <button
            onClick={onActionClick}
            className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {actionLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-col flex-1">{children}</div>
    </div>
  )
}
