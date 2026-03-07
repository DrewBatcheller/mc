/**
 * Socket.io endpoint — DEPRECATED.
 *
 * Real-time sync has been migrated to SSE (Server-Sent Events) at
 * /api/realtime/events. This route is kept as a stub to avoid 404s
 * from any lingering client references.
 *
 * The previous implementation used the Pages Router `res.socket.server`
 * pattern which is incompatible with the App Router.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { error: 'Socket.io endpoint is deprecated. Use /api/realtime/events (SSE) instead.' },
    { status: 410 }
  )
}
