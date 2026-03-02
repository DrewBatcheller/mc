import { Server as SocketIOServer, Socket } from 'socket.io'
import { extractQueryContext } from '@/lib/role-filter'
import type { UserRole } from '@/lib/types'

/**
 * Permission mapping: which permissions affect which resources
 * When a resource is mutated, we broadcast to all users with permission for that module
 */
const RESOURCE_PERMISSIONS: Record<string, string[]> = {
  'revenue': ['finances'],
  'expenses': ['finances'],
  'pnl': ['finances'],
  'accounts': ['sales'],
  'contacts': ['sales'],
  'clients': ['sales', 'strategy', 'management'],
  'team-members': ['team', 'management'],
  'experiments': ['experiments', 'strategy', 'management'],
  'documents': ['team', 'management'],
  'affiliates': ['affiliates', 'sales', 'management'],
}

interface ConnectedUser {
  userId: string
  role: UserRole
  socketId: string
  clientId?: string
  permissions: string[]
}

// Map to track all connected users and their permissions
const connectedUsers = new Map<string, ConnectedUser>()
let io: SocketIOServer | null = null

/**
 * Initialize Socket.io server instance
 * This should be called once in your API route or server initialization
 */
export function getSocketIOServer(): SocketIOServer {
  if (io) return io
  
  throw new Error('Socket.io server not initialized. Call initializeSocketIO first.')
}

/**
 * Initialize Socket.io with a Node.js HTTP server
 * Usage: Call this in your API route handler that accepts HTTP upgrades
 */
export function initializeSocketIO(httpServer: any): SocketIOServer {
  if (io) return io

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/api/socket/io',
  })

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`)

    // Handle user authentication on connect
    socket.on('authenticate', (auth: { role: UserRole; userId: string; clientId?: string }) => {
      const { role, userId, clientId } = auth
      
      // Map role to permissions
      const permissions = getRolePermissions(role)
      
      const user: ConnectedUser = {
        userId,
        role,
        socketId: socket.id,
        clientId,
        permissions,
      }

      connectedUsers.set(socket.id, user)
      console.log(`[Socket.io] User authenticated: ${userId} (${role}) - permissions: ${permissions.join(', ')}`)
    })

    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id)
      if (user) {
        connectedUsers.delete(socket.id)
        console.log(`[Socket.io] User disconnected: ${user.userId}`)
      }
    })
  })

  return io
}

/**
 * Broadcast a mutation event to all users with affected permissions
 * Called from API routes after Airtable mutation succeeds
 * 
 * If the mutated resource is "Permissions", also broadcasts a permissionChanged event
 */
export async function broadcastMutation(
  resource: string,
  action: 'create' | 'update' | 'delete',
  recordId: string,
  updatedData?: any
): Promise<void> {
  if (!io) {
    console.warn('[Socket.io] Server not initialized, skipping broadcast')
    return
  }

  // Get permissions affected by this resource
  const affectedPermissions = RESOURCE_PERMISSIONS[resource] || []
  
  if (affectedPermissions.length === 0) {
    console.warn(`[Socket.io] No permission mapping for resource: ${resource}`)
    return
  }

  // Special handling for Permissions table mutations
  if (resource === 'permissions') {
    // Broadcast permission change to the affected user
    const userId = updatedData?.fields?.['User (from User)']?.[0] || updatedData?.userId
    if (userId) {
      await broadcastPermissionChange(userId)
    }
  }

  // Find all sockets with affected permissions
  const targetSockets: string[] = []
  connectedUsers.forEach((user, socketId) => {
    const hasPermission = user.permissions.some(p => affectedPermissions.includes(p))
    if (hasPermission) {
      targetSockets.push(socketId)
    }
  })

  if (targetSockets.length === 0) {
    console.log(`[Socket.io] No users with permissions for ${resource} mutation`)
    return
  }

  // Broadcast event
  const event = {
    type: 'mutation',
    resource,
    action,
    recordId,
    timestamp: Date.now(),
    data: updatedData,
  }

  console.log(`[Socket.io] Broadcasting ${action} on ${resource}:${recordId} to ${targetSockets.length} users`)
  
  targetSockets.forEach(socketId => {
    io?.to(socketId).emit('data-mutation', event)
  })
}

/**
 * Broadcast permission change to specific user
 */
export async function broadcastPermissionChange(userId: string): Promise<void> {
  if (!io) return

  const targetSockets: string[] = []
  connectedUsers.forEach((user, socketId) => {
    if (user.userId === userId) {
      targetSockets.push(socketId)
    }
  })

  if (targetSockets.length === 0) return

  const event = {
    type: 'permission-changed',
    timestamp: Date.now(),
  }

  console.log(`[Socket.io] Broadcasting permission change to user ${userId}`)
  targetSockets.forEach(socketId => {
    io?.to(socketId).emit('permission-changed', event)
  })
}

/**
 * Map role to permission strings
 */
function getRolePermissions(role: UserRole): string[] {
  const rolePermissionMap: Record<UserRole, string[]> = {
    management: ['finances', 'sales', 'experiments', 'team', 'affiliates', 'documents'],
    strategy: ['sales', 'experiments', 'team', 'affiliates'],
    team: ['experiments', 'team'],
    sales: ['sales', 'team', 'affiliates'],
    client: ['client-dashboard'],
  }

  return rolePermissionMap[role] || []
}

/**
 * Get connected user count (for debugging)
 */
export function getConnectedUserCount(): number {
  return connectedUsers.size
}

/**
 * Get all connected users (for debugging)
 */
export function getConnectedUsers(): ConnectedUser[] {
  return Array.from(connectedUsers.values())
}
