/**
 * Native Redis client (ioredis) — used for both caching and Pub/Sub publishing.
 *
 * Returns null when REDIS_URL is not configured so the app degrades gracefully
 * to Upstash (caching only) or in-memory operation.
 *
 * A SEPARATE subscriber connection is in lib/redis-sub.ts.
 * Redis subscribers cannot share a connection with regular commands.
 */

import Redis from 'ioredis'

let client: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (client) return client

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  })

  client.on('connect', () => console.log('[redis] Connected'))
  client.on('error',   (err) => console.error('[redis] Error:', err))

  return client
}
