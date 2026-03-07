/**
 * Cache wrapper — tiered Redis strategy:
 *
 *   1. Native Redis (ioredis)  — when REDIS_URL is set (self-hosted production)
 *      Full caching AND Pub/Sub broadcasting on one Redis instance.
 *
 *   2. Upstash Redis (REST)    — when UPSTASH_REDIS_REST_URL is set (Vercel demo)
 *      Caching only (REST API cannot do Pub/Sub).
 *
 *   3. No-op                   — neither env var set (local dev / fallback)
 *      App works identically without caching.
 */

import { getRedisClient } from '@/lib/redis'
import type Redis from 'ioredis'

// ─── Upstash client (lazy-loaded, REST-only) ──────────────────────────────────
let upstash: import('@upstash/redis').Redis | null = null

async function getUpstash() {
  if (upstash) return upstash

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const { Redis } = await import('@upstash/redis')
  upstash = new Redis({ url, token })
  return upstash
}

// ─── Default TTLs (seconds) ───────────────────────────────────────────────────
export const TTL = {
  short:  30,         // Fast-changing data (e.g. live test status)
  medium: 120,        // Standard data (experiments, leads)
  long:   300,        // Slow-changing data (clients, team members)
  auth:   60 * 30,    // Auth lookups — 30 min
} as const

// ─── Permission-to-Resource mapping ──────────────────────────────────────────
const PERMISSION_RESOURCE_MAP: Record<string, string[]> = {
  finances:    ['revenue', 'expenses', 'pnl'],
  sales:       ['accounts', 'contacts', 'clients', 'leads'],
  experiments: ['experiments', 'tests', 'variants'],
  team:        ['team-members', 'documents', 'projects'],
  affiliates:  ['affiliates', 'partnerships'],
}

// ─── Native Redis helpers ─────────────────────────────────────────────────────

async function nativeGet<T>(r: Redis, key: string): Promise<T | null> {
  const raw = await r.get(key)
  if (raw === null || raw === undefined) return null
  try { return JSON.parse(raw as string) as T } catch { return null }
}

async function nativeSet<T>(r: Redis, key: string, value: T, ttlSeconds: number): Promise<void> {
  await r.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

async function nativeDel(r: Redis, ...keys: string[]): Promise<void> {
  if (keys.length > 0) await r.del(...keys)
}

async function nativeScan(r: Redis, pattern: string): Promise<string[]> {
  const found: string[] = []
  let cursor = '0'
  do {
    const [next, keys] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', '100')
    cursor = next
    found.push(...keys)
  } while (cursor !== '0')
  return found
}

// ─── getOrSet ─────────────────────────────────────────────────────────────────

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = TTL.medium
): Promise<{ data: T; cached: boolean }> {

  // 1. Native Redis (self-hosted)
  const nr = getRedisClient()
  if (nr) {
    const cached = await nativeGet<T>(nr, key)
    if (cached !== null) return { data: cached, cached: true }

    const data = await fetcher()
    await nativeSet(nr, key, data, ttlSeconds)
    return { data, cached: false }
  }

  // 2. Upstash (Vercel demo)
  const ur = await getUpstash()
  if (ur) {
    const cached = await ur.get<T>(key)
    if (cached !== null && cached !== undefined) return { data: cached, cached: true }

    const data = await fetcher()
    await ur.set(key, data, { ex: ttlSeconds })
    return { data, cached: false }
  }

  // 3. No cache
  return { data: await fetcher(), cached: false }
}

// ─── invalidate ───────────────────────────────────────────────────────────────

export async function invalidate(key: string): Promise<void> {
  const nr = getRedisClient()
  if (nr) { await nativeDel(nr, key); return }

  const ur = await getUpstash()
  if (ur) await ur.del(key)
}

// ─── invalidatePattern ────────────────────────────────────────────────────────

export async function invalidatePattern(pattern: string): Promise<void> {
  const nr = getRedisClient()
  if (nr) {
    const keys = await nativeScan(nr, pattern)
    if (keys.length > 0) await nativeDel(nr, ...keys)
    return
  }

  const ur = await getUpstash()
  if (!ur) return

  let cursor = 0
  do {
    const [nextCursor, keys] = await ur.scan(cursor, { match: pattern, count: 100 })
    cursor = Number(nextCursor)
    if (keys.length > 0) await ur.del(...keys)
  } while (cursor !== 0)
}

// ─── invalidateByPermission ───────────────────────────────────────────────────

export async function invalidateByPermission(permission: string): Promise<void> {
  const resources = PERMISSION_RESOURCE_MAP[permission]
  if (!resources) {
    console.warn(`[cache] Unknown permission: ${permission}`)
    return
  }
  for (const r of resources) await invalidatePattern(`${r}:*`)
  console.log(`[cache] Invalidated ${resources.length} resource patterns for permission: ${permission}`)
}

// ─── invalidateByResource ─────────────────────────────────────────────────────

export async function invalidateByResource(resource: string): Promise<void> {
  await invalidatePattern(`${resource}:*`)
}

// ─── Cache key builder ────────────────────────────────────────────────────────

export function cacheKey(
  resource: string,
  role: string,
  entityId?: string,
  extras?: string
): string {
  const parts = [resource, role]
  if (entityId) parts.push(entityId)
  if (extras)   parts.push(extras)
  return parts.join(':')
}
