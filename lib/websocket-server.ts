/**
 * SSE broadcaster adapter.
 *
 * Keeps the same export interface as the old Socket.io stub so the two API routes
 * (app/api/airtable/[resource]/route.ts and .../[id]/route.ts) need zero changes.
 *
 * Internally delegates to publish() in lib/broadcaster.ts, which routes the event
 * through Redis Pub/Sub when REDIS_URL is set, or emits locally otherwise.
 */

import { publish } from '@/lib/broadcaster'

export async function broadcastMutation(
  resource: string,
  action: 'create' | 'update' | 'delete',
  recordId: string,
  _updatedData?: unknown
): Promise<void> {
  await publish({
    type: 'mutation',
    resource,
    action,
    recordId,
    timestamp: Date.now(),
  })
}

export async function broadcastPermissionChange(_userId: string): Promise<void> {
  await publish({
    type: 'permission-changed',
    timestamp: Date.now(),
  })
}

// ─── Stubs for any residual imports ──────────────────────────────────────────

export function getSocketIOServer(): never {
  throw new Error('Socket.io replaced with SSE + Redis Pub/Sub. See /api/realtime/events.')
}
export function initializeSocketIO(): never {
  throw new Error('Socket.io replaced with SSE + Redis Pub/Sub. See /api/realtime/events.')
}
export function getConnectedUserCount(): number { return 0 }
export function getConnectedUsers(): unknown[]  { return [] }
