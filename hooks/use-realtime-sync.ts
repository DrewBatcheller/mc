'use client'

import { useEffect, useRef } from 'react'
import { useAirtable } from './use-airtable'
import type { UserRole } from '@/lib/types'

interface MutationEvent {
  type: 'mutation'
  resource: string
  action: 'create' | 'update' | 'delete'
  recordId: string
  timestamp: number
  data?: any
}

interface PermissionEvent {
  type: 'permission-changed'
  timestamp: number
}

type RealtimeEvent = MutationEvent | PermissionEvent

/**
 * Hook to subscribe to real-time data mutations via WebSocket
 * Automatically revalidates SWR cache when mutations occur
 * 
 * Usage:
 *   const { isConnected, lastMutation } = useRealtimeSync({
 *     resource: 'clients',
 *     onMutation: (event) => console.log('Client was updated!')
 *   })
 */
export function useRealtimeSync(options?: {
  resource?: string
  onMutation?: (event: MutationEvent) => void
  onPermissionChange?: (event: PermissionEvent) => void
}) {
  const socketRef = useRef<any>(null)
  const isConnectedRef = useRef(false)
  const lastMutationRef = useRef<MutationEvent | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelayMs = 2000

  useEffect(() => {
    let isMounted = true
    let connectTimeout: NodeJS.Timeout

    const connectSocket = async () => {
      try {
        // Dynamically import Socket.io client only on client-side
        const { io } = await import('socket.io-client')

        if (!isMounted) return

        const socket = io({
          path: '/api/socket/io',
          reconnection: true,
          reconnectionDelay: reconnectDelayMs,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: maxReconnectAttempts,
        })

        socketRef.current = socket

        socket.on('connect', () => {
          if (!isMounted) return
          console.log('[RealtimeSync] Connected to WebSocket')
          isConnectedRef.current = true
          reconnectAttemptsRef.current = 0

          // Authenticate with server
          socket.emit('authenticate', {
            role: (localStorage.getItem('userRole') || 'team') as UserRole,
            userId: localStorage.getItem('userId') || '',
            clientId: localStorage.getItem('clientId') || undefined,
          })
        })

        socket.on('disconnect', () => {
          if (!isMounted) return
          console.log('[RealtimeSync] Disconnected from WebSocket')
          isConnectedRef.current = false
        })

        socket.on('data-mutation', (event: MutationEvent) => {
          if (!isMounted) return

          console.log('[RealtimeSync] Received mutation:', event)
          lastMutationRef.current = event

          // If specific resource was requested, only trigger callback for that resource
          if (!options?.resource || event.resource === options.resource) {
            options?.onMutation?.(event)
          }
        })

        socket.on('permission-changed', (event: PermissionEvent) => {
          if (!isMounted) return
          console.log('[RealtimeSync] Permission changed')
          options?.onPermissionChange?.(event)
        })

        socket.on('error', (error: any) => {
          console.error('[RealtimeSync] Socket error:', error)
        })

      } catch (error) {
        console.error('[RealtimeSync] Failed to connect:', error)
        
        // Retry connection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts && isMounted) {
          reconnectAttemptsRef.current++
          const delay = reconnectDelayMs * Math.pow(1.5, reconnectAttemptsRef.current - 1)
          connectTimeout = setTimeout(connectSocket, delay)
        }
      }
    }

    connectSocket()

    return () => {
      isMounted = false
      clearTimeout(connectTimeout)
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [options?.resource, options?.onMutation, options?.onPermissionChange])

  return {
    isConnected: isConnectedRef.current,
    lastMutation: lastMutationRef.current,
    socket: socketRef.current,
  }
}
