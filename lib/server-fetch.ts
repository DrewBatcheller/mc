/**
 * Server-side data fetching utilities.
 *
 * Use these in async Server Components (page.tsx, section components) to
 * fetch Airtable data directly — bypassing the browser fetch layer entirely.
 * Results still go through the cache layer (Redis if configured).
 *
 * These functions require the user context to be passed explicitly since
 * Server Components can't use React context. Pass the user from cookies/headers
 * or from the layout (when server sessions are added in Phase 2).
 *
 * For now (Phase 1), client components use useAirtable() hook instead.
 * These are ready to drop in when server-side rendering of data is needed.
 */

import { listRecords, findRecords } from './airtable'
import { buildRoleFilter } from './role-filter'
import { getOrSet, cacheKey, TTL } from './cache'
import { TABLE_NAMES } from './types'
import type { ResourceSlug, AirtableRecord } from './types'
import type { FilterContext } from './role-filter'
import type { ListOptions } from './airtable'

interface FetchOptions extends Omit<ListOptions, 'filterByFormula'> {
  extraFilter?: string
  ttl?: number
  noCache?: boolean
}

/**
 * Fetch records for a resource with role-based filtering.
 * Returns [] on access denied (null formula) rather than throwing.
 */
export async function fetchForRole<T = Record<string, unknown>>(
  resource: ResourceSlug,
  ctx: FilterContext,
  options: FetchOptions = {}
): Promise<AirtableRecord<T>[]> {
  const tableName = TABLE_NAMES[resource]
  if (!tableName) {
    throw new Error(`Unknown resource: ${resource}`)
  }

  const roleFormula = buildRoleFilter(resource, ctx)
  if (roleFormula === null) {
    // Access denied for this role — return empty instead of 403 in server context
    return []
  }

  let filterByFormula = roleFormula
  if (options.extraFilter && roleFormula) {
    filterByFormula = `AND(${roleFormula}, ${options.extraFilter})`
  } else if (options.extraFilter) {
    filterByFormula = options.extraFilter
  }

  const listOptions: ListOptions = {
    ...options,
    ...(filterByFormula ? { filterByFormula } : {}),
  }

  const key = cacheKey(
    resource,
    ctx.role,
    ctx.clientId ?? ctx.userId,
    filterByFormula?.slice(0, 50)
  )

  if (options.noCache) {
    const result = await listRecords<T>(tableName, listOptions)
    return result.records
  }

  const { data } = await getOrSet(
    key,
    async () => {
      const result = await listRecords<T>(tableName, listOptions)
      return result
    },
    options.ttl ?? TTL.medium
  )

  return data.records
}
