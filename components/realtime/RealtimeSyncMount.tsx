'use client'

/**
 * RealtimeSyncMount
 *
 * Zero-render component that establishes the SSE connection for real-time
 * broadcast cache invalidation.  Mount exactly once, inside the dashboard
 * layout (but inside ProtectedRoute so the user is authenticated first).
 *
 * When any user performs a CRUD operation, this component receives the push
 * notification and calls SWR's global mutate() to invalidate the affected
 * resource so every subscribed component re-fetches automatically.
 */

import { useRealtimeSync } from '@/hooks/use-realtime-sync'

export function RealtimeSyncMount() {
  useRealtimeSync()
  return null
}
