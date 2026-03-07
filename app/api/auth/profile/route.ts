/**
 * PATCH /api/auth/profile
 *
 * Allows authenticated clients and team members to update
 * only their own permitted profile fields in Airtable.
 * Broadcasts mutations via WebSocket and invalidates caches.
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateRecord, AirtableError } from '@/lib/airtable'
import { extractQueryContext } from '@/lib/role-filter'
import { TABLE_NAMES } from '@/lib/types'
import { invalidatePattern } from '@/lib/cache'
import { broadcastMutation } from '@/lib/websocket-server'

// Fields clients are allowed to update on the Clients table
const CLIENT_ALLOWED_FIELDS = new Set(['Brand Name', 'Email', 'Website', 'Password'])

// Fields team members are allowed to update on the Team table
const TEAM_ALLOWED_FIELDS = new Set(['Full Name', 'First Name', 'Last Name', 'Email'])

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extractQueryContext(request.headers)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const fields: Record<string, unknown> = body.fields ?? body

    if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No fields provided' }, { status: 400 })
    }

    if (ctx.role === 'client' && ctx.clientId) {
      const invalid = Object.keys(fields).filter(k => !CLIENT_ALLOWED_FIELDS.has(k))
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Field(s) not editable: ${invalid.join(', ')}` },
          { status: 403 }
        )
      }
      const record = await updateRecord(TABLE_NAMES['clients'], ctx.clientId, fields)
      await invalidatePattern('clients:*')
      await broadcastMutation('clients', 'update', ctx.clientId, record)
      return NextResponse.json({ record })
    }

    // All team roles can update their own Team record
    if (ctx.userId) {
      const invalid = Object.keys(fields).filter(k => !TEAM_ALLOWED_FIELDS.has(k))
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Field(s) not editable: ${invalid.join(', ')}` },
          { status: 403 }
        )
      }
      const record = await updateRecord(TABLE_NAMES['team'], ctx.userId, fields)
      await invalidatePattern('team:*')
      // 'team-members' is the broadcast resource key for team data in websocket-server.ts
      await broadcastMutation('team-members', 'update', ctx.userId, record)
      return NextResponse.json({ record })
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (err) {
    if (err instanceof AirtableError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[PATCH /api/auth/profile] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
