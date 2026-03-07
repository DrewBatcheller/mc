'use client'

/**
 * useRealtimeSync — SSE-based broadcast cache invalidation.
 *
 * Connects to /api/realtime/events and listens for mutation events pushed by
 * the server after any Airtable CRUD operation.  On each event it calls SWR's
 * global mutate() to invalidate every cached key that matches the affected
 * resource, causing subscribed components to silently re-fetch fresh data.
 *
 * Mount once app-wide (see components/realtime/RealtimeSyncMount.tsx).
 * Optionally scope the onMutation callback to a specific resource.
 *
 * Usage:
 *   useRealtimeSync()                          // global invalidation only
 *   useRealtimeSync({                          // + scoped callback
 *     resource: 'experiments',
 *     onMutation: (e) => console.log(e),
 *   })
 */

import { useEffect, useRef } from 'react'
import { mutate } from 'swr'

// ─── Event types ──────────────────────────────────────────────────────────────

interface MutationEvent {
  type: 'mutation'
  resource: string
  action: 'create' | 'update' | 'delete'
  recordId: string
  timestamp: number
}

interface PermissionEvent {
  type: 'permission-changed'
  timestamp: number
}

type RealtimeEvent = MutationEvent | PermissionEvent

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRealtimeSync(options?: {
  /** If provided, onMutation is only called for events on this resource */
  resource?: string
  onMutation?: (event: MutationEvent) => void
  onPermissionChange?: (event: PermissionEvent) => void
}) {
  const isConnectedRef      = useRef(false)
  const lastMutationRef     = useRef<MutationEvent | null>(null)
  const esRef               = useRef<EventSource | null>(null)
  const reconnectDelayRef   = useRef(2_000)
  const reconnectTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let isMounted = true

    function connect() {
      if (!isMounted) return

      const es = new EventSource('/api/realtime/events')
      esRef.current = es

      es.onopen = () => {
        if (!isMounted) return
        isConnectedRef.current  = true
        reconnectDelayRef.current = 2_000 // reset back-off on successful connect
        console.log('[RealtimeSync] SSE connected')
      }

      es.onmessage = (e: MessageEvent<string>) => {
        if (!isMounted) return

        let event: RealtimeEvent
        try {
          event = JSON.parse(e.data) as RealtimeEvent
        } catch {
          return
        }

        // Ignore the initial "connected" acknowledgement
        if ((event as { type: string }).type === 'connected') return

        if (event.type === 'mutation') {
          const { resource } = event

          // Track last mutation for consumers (e.g. SyncStatus component)
          lastMutationRef.current = event

          // ── Invalidate all SWR keys that belong to this resource ──────────
          // SWR keys are [url, headers] tuples; match on the URL segment.
          mutate(
            (key) =>
              Array.isArray(key) &&
              typeof key[0] === 'string' &&
              key[0].includes(`/api/airtable/${resource}`)
          )

          // ── Scoped callback (optional) ────────────────────────────────────
          if (!options?.resource || options.resource === resource) {
            options?.onMutation?.(event)
          }
        }

        if (event.type === 'permission-changed') {
          options?.onPermissionChange?.(event)
        }
      }

      es.onerror = () => {
        if (!isMounted) return
        isConnectedRef.current = false
        es.close()
        esRef.current = null

        // Exponential back-off reconnection (max 30 s)
        const delay = reconnectDelayRef.current
        reconnectDelayRef.current = Math.min(delay * 1.5, 30_000)
        console.log(`[RealtimeSync] Disconnected — reconnecting in ${delay}ms`)
        reconnectTimerRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      esRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Stable connection for component lifetime — callbacks captured via ref

  return {
    isConnected: isConnectedRef.current,
    lastMutation: lastMutationRef.current,
  }
}
