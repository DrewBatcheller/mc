/**
 * GET /api/realtime/events
 *
 * Server-Sent Events stream for real-time cache invalidation.
 *
 * Clients connect here once (via useRealtimeSync) and receive a push
 * notification whenever any user performs a CRUD operation that would
 * desync their local SWR cache.
 *
 * Flow (with Redis):
 *   API route mutation → broadcastMutation() → redis.publish('realtime:mutations')
 *   → Redis delivers to lib/redis-sub.ts on every server instance
 *   → redis-sub re-emits on local broadcaster EventEmitter
 *   → this SSE handler → browser EventSource.onmessage
 *   → SWR global mutate() → component re-fetches
 *
 * Flow (without Redis):
 *   API route mutation → broadcastMutation() → broadcaster.emit() directly
 *   → same-process broadcast only
 *
 * A ':heartbeat' comment is sent every 25 s to prevent proxy/load-balancer
 * idle connection timeouts.
 *
 * Runtime note: MUST run on Node.js (not Edge) — broadcaster uses EventEmitter.
 */

import { type NextRequest } from 'next/server'
import { broadcaster, type BroadcastEvent } from '@/lib/broadcaster'

// Bootstrap the Redis Pub/Sub subscriber on first request.
// Module-level import ensures the subscriber is initialized once per process
// and stays alive for the process lifetime.
import '@/lib/redis-sub'

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // Track cleanup refs so they're accessible from both start() and cancel()
  let removeListener:   (() => void) | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  function cleanup(controller?: ReadableStreamDefaultController) {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    removeListener?.()
    if (controller) {
      try { controller.close() } catch { /* already closed */ }
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      // ── Initial connection acknowledgement ─────────────────────────────────
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      // ── Subscribe to mutation events ───────────────────────────────────────
      const handler = (event: BroadcastEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // The stream was closed before we could write; clean up.
          cleanup()
        }
      }

      broadcaster.on('mutation', handler)
      removeListener = () => { broadcaster.off('mutation', handler); removeListener = null }

      // ── Keep-alive heartbeat (SSE comment lines, ignored by clients) ───────
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':heartbeat\n\n'))
        } catch {
          cleanup()
        }
      }, 25_000)

      // ── Abort on client disconnect ─────────────────────────────────────────
      request.signal.addEventListener('abort', () => cleanup(controller))
    },

    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':       'text/event-stream',
      'Cache-Control':      'no-cache, no-transform',
      'Connection':         'keep-alive',
      'X-Accel-Buffering':  'no', // disable Nginx / Vercel proxy buffering
    },
  })
}
