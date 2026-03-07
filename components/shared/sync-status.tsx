'use client'

import { useRealtimeSync } from '@/hooks/use-realtime-sync'
import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

interface SyncStatusProps {
  variant?: 'compact' | 'full'
  showTimestamp?: boolean
}

/**
 * SyncStatus Component
 * Displays current real-time synchronization status
 * 
 * States:
 * - Connected (green): Socket.io active and connected
 * - Syncing (blue): Recent mutation/revalidation in progress
 * - Offline (red): No Socket.io connection
 * - Conflict (yellow): Potential data collision detected
 */
export function SyncStatus({ variant = 'compact', showTimestamp = false }: SyncStatusProps) {
  const { isConnected, lastMutation } = useRealtimeSync()
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline' | 'conflict'>('offline')
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  useEffect(() => {
    if (!isConnected) {
      setSyncStatus('offline')
    } else if (lastMutation && Date.now() - lastMutation.timestamp < 3000) {
      setSyncStatus('syncing')
      // Reset to connected after 3 seconds
      const timer = setTimeout(() => setSyncStatus('connected'), 3000)
      return () => clearTimeout(timer)
    } else {
      setSyncStatus('connected')
    }
  }, [isConnected, lastMutation])

  useEffect(() => {
    if (lastMutation) {
      setLastSyncTime(Date.now())
    }
  }, [lastMutation])

  const statusColors = {
    connected: 'bg-green-100 text-green-700',
    syncing: 'bg-blue-100 text-blue-700',
    offline: 'bg-red-100 text-red-700',
    conflict: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabels = {
    connected: 'Synced',
    syncing: 'Syncing...',
    offline: 'Offline',
    conflict: 'Conflict',
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[syncStatus]}`}>
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span>{statusLabels[syncStatus]}</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${
          syncStatus === 'connected' ? 'bg-green-500' :
          syncStatus === 'syncing' ? 'bg-blue-500' :
          syncStatus === 'offline' ? 'bg-red-500' :
          'bg-yellow-500'
        }`} />
        <div>
          <p className="text-sm font-medium text-foreground">{statusLabels[syncStatus]}</p>
          {showTimestamp && lastSyncTime && (
            <p className="text-xs text-muted-foreground">
              Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
            </p>
          )}
          {syncStatus === 'offline' && (
            <p className="text-xs text-muted-foreground">
              Changes will sync when connection is restored
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
