/**
 * Cache wrapper — uses Upstash Redis when configured, no-ops otherwise.
 * This means the app works identically with or without Redis.
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable caching.
 */

let redis: import('@upstash/redis').Redis | null = null

async function getRedis() {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  const { Redis } = await import('@upstash/redis')
  redis = new Redis({ url, token })
  return redis
}

// ─── Default TTLs (seconds) ───────────────────────────────────────────────────
export const TTL = {
  short: 30,        // Fast-changing data (e.g. live test status)
  medium: 120,      // Standard data (experiments, leads)
  long: 300,        // Slow-changing data (clients, team members)
  auth: 60 * 30,    // Auth lookups — 30 min
} as const

// ─── Permission-to-Resource Mapping ───────────────────────────────────────────
// Used for permission-aware cache invalidation
const PERMISSION_RESOURCE_MAP: Record<string, string[]> = {
  'finances': ['revenue', 'expenses', 'pnl'],
  'sales': ['accounts', 'contacts', 'clients', 'leads'],
  'experiments': ['experiments', 'tests', 'variants'],
  'team': ['team-members', 'documents', 'projects'],
  'affiliates': ['affiliates', 'partnerships'],
}

// ─── getOrSet ─────────────────────────────────────────────────────────────────
// The main cache primitive. Checks cache first, falls back to fetcher, stores result.
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = TTL.medium
): Promise<{ data: T; cached: boolean }> {
  const r = await getRedis()

  if (r) {
    const cached = await r.get<T>(key)
    if (cached !== null && cached !== undefined) {
      return { data: cached, cached: true }
    }
  }

  const data = await fetcher()

  if (r) {
    await r.set(key, data, { ex: ttlSeconds })
  }

  return { data, cached: false }
}

// ─── invalidate ───────────────────────────────────────────────────────────────
// Delete a specific cache key.
export async function invalidate(key: string): Promise<void> {
  const r = await getRedis()
  if (r) await r.del(key)
}

// ─── invalidatePattern ────────────────────────────────────────────────────────
// Delete all keys matching a pattern (e.g. "experiments:*").
// Note: Upstash supports SCAN-based deletion.
export async function invalidatePattern(pattern: string): Promise<void> {
  const r = await getRedis()
  if (!r) return

  let cursor = 0
  do {
    const [nextCursor, keys] = await r.scan(cursor, { match: pattern, count: 100 })
    cursor = Number(nextCursor)
    if (keys.length > 0) {
      await r.del(...keys)
    }
  } while (cursor !== 0)
}

// ─── invalidateByPermission ───────────────────────────────────────────────────
// Invalidate all cache keys related to a permission group
// Usage: When user permissions change, call this to clear affected caches
export async function invalidateByPermission(permission: string): Promise<void> {
  const resources = PERMISSION_RESOURCE_MAP[permission]
  
  if (!resources) {
    console.warn(`[cache] Unknown permission: ${permission}`)
    return
  }

  // Invalidate all patterns for this permission's resources
  const patterns = resources.map(r => `${r}:*`)
  
  for (const pattern of patterns) {
    await invalidatePattern(pattern)
  }

  console.log(`[cache] Invalidated ${patterns.length} patterns for permission: ${permission}`)
}

// ─── invalidateByResource ────────────────────────────────────────────────────
// Invalidate all caches for a specific resource across all roles and users
export async function invalidateByResource(resource: string): Promise<void> {
  await invalidatePattern(`${resource}:*`)
}

// ─── Cache key builders ───────────────────────────────────────────────────────
// Consistent key format: resource:role:entityId:extras
export function cacheKey(
  resource: string,
  role: string,
  entityId?: string,
  extras?: string
): string {
  const parts = [resource, role]
  if (entityId) parts.push(entityId)
  if (extras) parts.push(extras)
  return parts.join(':')
}
