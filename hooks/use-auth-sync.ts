'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useRealtimeSync } from './use-realtime-sync'
import { invalidateByPermission } from '@/lib/cache'

/**
 * Hook to monitor and sync authentication state
 * - Periodically re-validates auth token (before expiry)
 * - Handles permission changes from other connections
 * - Clears cache when permissions change
 * 
 * Usage: Call once in a top-level app layout component
 */
export function useAuthSync() {
  const { user, refreshUser } = useUser()
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastRoleRef = useRef<string | null>(null)

  // Listen for permission changes via WebSocket
  useRealtimeSync({
    onPermissionChange: async () => {
      console.log('[AuthSync] Permission change detected, refreshing user')
      
      // Refresh user data from server
      refreshUser()
      
      // Clear all caches since permissions changed
      const permissions = user?.role ? ['finances', 'sales', 'experiments', 'team'] : []
      for (const permission of permissions) {
        await invalidateByPermission(permission)
      }
    },
  })

  // Periodically check if token needs refresh
  useEffect(() => {
    if (!user) return

    // Check if role changed locally (e.g., in another tab)
    if (lastRoleRef.current && lastRoleRef.current !== user.role) {
      console.log('[AuthSync] Role changed, clearing caches')
      lastRoleRef.current = user.role
      // Trigger cache invalidation
      refreshUser()
    } else if (!lastRoleRef.current) {
      lastRoleRef.current = user.role
    }

    // Set up interval to re-validate auth before token expiry
    // This is a safety check for long-lived sessions
    tokenCheckIntervalRef.current = setInterval(
      () => {
        console.log('[AuthSync] Token validation check')
        // In a real JWT scenario, you'd check token expiry and refresh here
        // For now, just re-validate permissions are still valid
        refreshUser()
      },
      1000 * 60 * 15 // Check every 15 minutes
    )

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current)
      }
    }
  }, [user, refreshUser])

  // Listen for visibility changes - refresh when tab comes into focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('[AuthSync] Tab became visible, refreshing user')
        refreshUser()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, refreshUser])

  return {
    user,
    isAuthenticated: !!user,
  }
}
