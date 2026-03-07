/**
 * Redis Pub/Sub subscriber — dedicated ioredis connection.
 *
 * A subscribed Redis connection cannot run regular commands (GET, SET, etc.),
 * so this is intentionally a separate client from lib/redis.ts.
 *
 * How it fits in:
 *   lib/broadcaster.ts  →  redis.publish('realtime:mutations', payload)
 *                              ↓  (Redis delivers to all subscribers)
 *   lib/redis-sub.ts    →  receives message → broadcaster.emit('mutation', event)
 *                              ↓
 *   SSE clients         →  receive push notification → SWR revalidate
 *
 * This means broadcasts published from ANY server instance (any worker process,
 * any PM2 cluster node, any container) reach ALL connected SSE clients —
 * which is what makes the system truly deploy-ready.
 *
 * This module bootstraps its subscription at import time.
 * Import it once — in app/api/realtime/events/route.ts is ideal.
 */

import Redis from 'ioredis'
import { broadcaster } from '@/lib/broadcaster'

const REDIS_URL = process.env.REDIS_URL
const CHANNEL   = 'realtime:mutations'

if (REDIS_URL) {
  const sub = new Redis(REDIS_URL, {
    // Never give up reconnecting — SSE connections are long-lived and we must
    // keep the subscriber alive for the process lifetime.
    maxRetriesPerRequest: null as unknown as number,
    enableReadyCheck: true,
    lazyConnect: false,
  })

  sub.on('connect', () => {
    console.log(`[redis-sub] Connected — subscribing to "${CHANNEL}"`)
    sub.subscribe(CHANNEL, (err) => {
      if (err) console.error('[redis-sub] Subscribe error:', err)
      else     console.log(`[redis-sub] Subscribed to "${CHANNEL}"`)
    })
  })

  sub.on('message', (_channel: string, message: string) => {
    try {
      const event = JSON.parse(message)
      broadcaster.emit('mutation', event)
    } catch {
      console.error('[redis-sub] Failed to parse message:', message)
    }
  })

  sub.on('error', (err) => {
    console.error('[redis-sub] Error:', err)
  })
} else {
  // No Redis — broadcaster is used directly (same-process only)
}
