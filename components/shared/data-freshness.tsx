'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'

interface DataFreshnessProps {
  lastUpdated?: number // Timestamp in milliseconds
  staleAfterMs?: number // Consider stale after this duration
  onRefresh?: () => void
  showIcon?: boolean
}

/**
 * DataFreshness Component
 * Shows "Updated X seconds ago" with visual indicator
 * Indicates when data might be stale and offers refresh button
 */
export function DataFreshness({
  lastUpdated,
  staleAfterMs = 60000, // 1 minute
  onRefresh,
  showIcon = true,
}: DataFreshnessProps) {
  const [timeAgo, setTimeAgo] = useState<string>('')
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdated) return

      const now = Date.now()
      const diff = now - lastUpdated
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`)
      } else if (minutes < 60) {
        setTimeAgo(`${minutes}m ago`)
      } else if (hours < 24) {
        setTimeAgo(`${hours}h ago`)
      } else {
        setTimeAgo('1d+ ago')
      }

      setIsStale(diff > staleAfterMs)
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [lastUpdated, staleAfterMs])

  if (!lastUpdated) {
    return null
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs ${
      isStale ? 'text-yellow-600' : 'text-muted-foreground'
    }`}>
      {showIcon && (
        isStale ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <span className="h-3 w-3" />
        )
      )}
      <span>Updated {timeAgo}</span>
      {isStale && onRefresh && (
        <button
          onClick={onRefresh}
          className="ml-1 hover:text-yellow-700 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

/**
 * Hook to track data freshness
 * Usage in components:
 *   const { lastUpdated, markUpdated } = useDataFreshness()
 *   useEffect(() => { markUpdated() }, [data])
 */
export function useDataFreshness() {
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const markUpdated = () => {
    setLastUpdated(Date.now())
  }

  return { lastUpdated, markUpdated }
}
