/**
 * Real-time broadcast system.
 *
 * Two modes depending on environment:
 *
 *   WITH Redis (REDIS_URL set):
 *     publish() → redis.publish('realtime:mutations', payload)
 *              → Redis delivers to lib/redis-sub.ts on every server instance
 *              → redis-sub re-emits on the local broadcaster EventEmitter
 *              → SSE clients on that instance receive the event
 *     Result: cross-process, cross-instance broadcast ✓
 *
 *   WITHOUT Redis:
 *     publish() → broadcaster.emit('mutation', event) directly
 *     Result: same-process broadcast only (fine for single-server dev/Vercel demo)
 *
 * SSE clients always subscribe to the `broadcaster` EventEmitter.
 * The routing logic above is entirely contained in publish().
 */

import { EventEmitter } from 'events'
import { getRedisClient } from '@/lib/redis'

export interface BroadcastEvent {
  type: 'mutation' | 'permission-changed'
  resource?: string
  action?: 'create' | 'update' | 'delete'
  recordId?: string
  timestamp: number
}

const CHANNEL = 'realtime:mutations'

/**
 * Local EventEmitter — all SSE connections subscribe to this.
 * With Redis it's fed by lib/redis-sub.ts; without Redis it's fed directly by publish().
 */
const broadcaster = new EventEmitter()
broadcaster.setMaxListeners(500)

export { broadcaster }

/**
 * Publish a broadcast event.
 * Automatically uses Redis when REDIS_URL is configured; falls back to local emit.
 */
export async function publish(event: BroadcastEvent): Promise<void> {
  const redis = getRedisClient()

  if (redis) {
    // Publish to Redis channel.
    // lib/redis-sub.ts picks this up and re-emits on the local broadcaster,
    // so SSE clients on this instance (and every other instance) all receive it.
    await redis.publish(CHANNEL, JSON.stringify(event))
  } else {
    // No Redis — emit directly.  Works within a single process only.
    broadcaster.emit('mutation', event)
  }
}
