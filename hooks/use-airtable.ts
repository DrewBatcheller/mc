/**
 * useAirtable — SWR-based hook for role-filtered Airtable data fetching.
 *
 * Automatically injects auth headers from UserContext.
 * Handles loading, error, and cache states.
 *
 * Usage:
 *   const { data, isLoading, error } = useAirtable('experiments')
 *   const { data } = useAirtable('clients', { maxRecords: 50 })
 */

import useSWR from 'swr'
import { useUser } from '@/contexts/UserContext'
import type { AirtableRecord } from '@/lib/types'

// ─── Options ──────────────────────────────────────────────────────────────────
export interface UseAirtableOptions {
  maxRecords?: number
  pageSize?: number
  filterExtra?: string
  fields?: string[]
  view?: string
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>
  noCache?: boolean
  /** Set to false to prevent fetching (conditional fetching) */
  enabled?: boolean
  /** SWR refresh interval in ms (0 = no auto-refresh) */
  refreshInterval?: number
  /** Revalidate on window focus (default: true) */
  revalidateOnFocus?: boolean
}

// ─── Return type ──────────────────────────────────────────────────────────────
export interface UseAirtableResult<T> {
  data: AirtableRecord<T>[] | undefined
  isLoading: boolean
  isValidating: boolean
  error: Error | null
  mutate: () => void
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────
class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function fetcher(url: string, headers: HeadersInit) {
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new FetchError(body.error ?? `Request failed: ${res.status}`, res.status)
  }
  return res.json()
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAirtable<T = Record<string, unknown>>(
  resource: string,
  options: UseAirtableOptions = {}
): UseAirtableResult<T> {
  const { user, isAuthenticated } = useUser()
  const { enabled = true, refreshInterval = 0, revalidateOnFocus = false, ...queryOptions } = options

  // Build URL with query params
  const shouldFetch = isAuthenticated && enabled && !!user

  const url = shouldFetch ? buildUrl(resource, queryOptions) : null

  // Auth headers for role-filtered queries
  const headers: HeadersInit = user
    ? {
        'x-user-role': user.role,
        'x-user-id': user.id,
        'x-user-name': user.name,
        ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
      }
    : {}

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    url ? [url, headers] : null,
    ([u, h]) => fetcher(u, h),
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,   // suppress duplicate fetches for 60s
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        // Don't retry on 4xx errors (bad filters, auth failures, etc.)
        const status = (err as FetchError).status
        if (status && status >= 400 && status < 500) return
        // Retry transient errors up to 3 times with exponential backoff
        if (retryCount >= 3) return
        setTimeout(() => revalidate({ retryCount }), 5000 * 2 ** retryCount)
      },
    }
  )

  return {
    data: data?.records,
    isLoading,
    isValidating,
    error: error ?? null,
    mutate,
  }
}

// ─── URL builder ──────────────────────────────────────────────────────────────
function buildUrl(resource: string, options: Omit<UseAirtableOptions, 'enabled' | 'refreshInterval' | 'revalidateOnFocus'>): string {
  const params = new URLSearchParams()

  if (options.maxRecords) params.set('maxRecords', String(options.maxRecords))
  if (options.pageSize) params.set('pageSize', String(options.pageSize))
  if (options.filterExtra) params.set('filterExtra', options.filterExtra)
  if (options.view) params.set('view', options.view)
  if (options.noCache) params.set('noCache', 'true')

  if (options.fields) {
    options.fields.forEach((f) => params.append('fields[]', f))
  }

  if (options.sort) {
    options.sort.forEach((s, i) => {
      params.append(`sort[${i}][field]`, s.field)
      if (s.direction) params.append(`sort[${i}][direction]`, s.direction)
    })
  }

  const qs = params.toString()
  return `/api/airtable/${resource}${qs ? `?${qs}` : ''}`
}
