'use client'

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted rounded-lg animate-pulse",
        className
      )}
    />
  )
}

export function PageSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-60" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="w-full space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function DirectorySkeleton() {
  return (
    <div className="w-full h-full space-y-3 p-6">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}
