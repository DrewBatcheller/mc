/**
 * useAirtableMutation — create/update Airtable records with auth headers.
 *
 * Usage:
 *   const { mutate, isLoading, error } = useAirtableMutation('leads')
 *   await mutate({ fields: { Email: '...', Stage: 'Open' } })           // POST (create)
 *   await mutate({ fields: { Stage: 'Closed' } }, recordId)             // PATCH (update)
 */

'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'

interface MutationOptions {
  onSuccess?: (data: unknown) => void
  onError?: (error: Error) => void
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

    const url = recordId
      ? `/api/airtable/${resource}/${recordId}`
      : `/api/airtable/${resource}`

    const method = recordId ? 'PATCH' : 'POST'

    try {
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
      options.onError?.(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [resource, getHeaders, options])

  return { mutate, isLoading, error }
}
