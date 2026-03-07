/**
 * Page-level skeleton components for use in loading.tsx files.
 *
 * These render while server components are fetching data (Suspense fallback).
 * Design matches the overall card-based layout of the dashboard.
 */

import React from 'react'
import { cn } from '@/lib/utils'

// ─── Base shimmer ─────────────────────────────────────────────────────────────
function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'bg-muted rounded-lg animate-pulse',
        className
      )}
      style={style}
    />
  )
}

// ─── Stat card row skeleton ───────────────────────────────────────────────────
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-8 w-8 rounded-lg" />
          </div>
          <Shimmer className="h-8 w-20" />
          <Shimmer className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-4">
        <Shimmer className="h-5 w-32" />
        <div className="flex-1" />
        <Shimmer className="h-8 w-24 rounded-lg" />
        <Shimmer className="h-8 w-24 rounded-lg" />
      </div>
      {/* Column headers */}
      <div
        className="grid px-4 py-2.5 border-b border-border gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-3 w-20" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="grid px-4 py-3 border-b border-border last:border-b-0 gap-4 items-center"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Shimmer
              key={colIdx}
              className={cn('h-4', colIdx === 0 ? 'w-36' : 'w-20')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-3 w-48" />
        </div>
        <Shimmer className="h-8 w-28 rounded-lg" />
      </div>
      <Shimmer className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}

// ─── Card grid skeleton ───────────────────────────────────────────────────────
export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-lg" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-3 w-16" />
            </div>
          </div>
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-4/5" />
          <div className="flex items-center gap-2 mt-1">
            <Shimmer className="h-5 w-16 rounded-full" />
            <Shimmer className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page header skeleton ─────────────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
      <div className="flex flex-col gap-2">
        <Shimmer className="h-6 w-40" />
        <Shimmer className="h-3 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-8 w-24 rounded-lg" />
        <Shimmer className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Full page skeleton ───────────────────────────────────────────────────────
// Combines header + stat cards + table
export function FullPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  )
}

// ─── Dashboard overview skeleton ──────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <StatCardsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
      </div>
      <TableSkeleton rows={5} cols={4} />
    </div>
  )
}
