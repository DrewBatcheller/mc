/**
 * useAirtableMutation — create/update Airtable records with auth headers.
 * 
 * Supports optimistic updates with automatic rollback on error.
 * When you provide onMutate, the cache is updated immediately with optimistic data.
 * On success, the actual server response is used. On error, cache is rolled back.
 *
 * Usage:
 *   const { mutate, isLoading, error } = useAirtableMutation('leads')
 *   
 *   // Without optimistic updates
 *   await mutate({ fields: { Email: '...', Stage: 'Open' } })
 *   
 *   // With optimistic updates and SWR
 *   const { data, mutate: revalidate } = useSWR('leads', fetcher)
 *   const { mutate: submitMutation } = useAirtableMutation('leads', {
 *     onMutate: async (body) => {
 *       // Save previous data for rollback
 *       const previousData = data
 *       
 *       // Optimistically update cache
 *       const optimisticData = { ...data, ...body.fields }
 *       mutate(optimisticData, false)
 *       
 *       return { previousData }
 *     },
 *     onSuccess: (data) => {
 *       // Actual server response received, update with real data
 *       mutate(data, false)
 *     },
 *     onError: (error, context) => {
 *       // Rollback to previous data on error
 *       if (context?.previousData) {
 *         mutate(context.previousData, false)
 *       }
 *     }
 *   })
 */

'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'

interface MutationContext {
  [key: string]: any
}

interface MutationOptions {
  onMutate?: (body: Record<string, unknown>, recordId?: string) => Promise<MutationContext> | MutationContext
  onSuccess?: (data: unknown) => void
  onError?: (error: Error, context?: MutationContext) => void
}

export function useAirtableMutation(resource: string, options: MutationOptions = {}) {
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getHeaders = useCallback((): HeadersInit => {
    if (!user) return { 'Content-Type': 'application/json' }
    return {
      'Content-Type': 'application/json',
      'x-user-role': user.role,
      'x-user-id': user.id,
      ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
    }
  }, [user])

  const mutate = useCallback(async (body: Record<string, unknown>, recordId?: string) => {
    setIsLoading(true)
    setError(null)

    let mutationContext: MutationContext | undefined

    try {
      // Call onMutate hook to allow optimistic updates
      if (options.onMutate) {
        mutationContext = await options.onMutate(body, recordId)
      }

      const url = recordId
        ? `/api/airtable/${resource}/${recordId}`
        : `/api/airtable/${resource}`

      const method = recordId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(errBody.error ?? `Request failed: ${res.status}`)
      }

      const data = await res.json()
      options.onSuccess?.(data)
      return data
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      options.onError?.(e, mutationContext)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [resource, getHeaders, options])

  return { mutate, isLoading, error }
}
