import { NextApiRequest, NextApiResponse } from 'next'
import { initializeSocketIO } from '@/lib/websocket-server'

export const dynamic = 'force-dynamic'

/**
 * Socket.io HTTP upgrade handler
 * This endpoint handles the WebSocket protocol upgrade from HTTP
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    console.log('[Socket.io] Initializing Socket.io server...')
    res.socket.server.io = initializeSocketIO(res.socket.server)
  }

  res.end()
}
