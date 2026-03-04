/**
 * GET  /api/airtable/[resource]/[id]   — fetch single record
 * PATCH /api/airtable/[resource]/[id]  — update record fields
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRecord, updateRecord, deleteRecord, AirtableError } from '@/lib/airtable'
import { extractQueryContext } from '@/lib/role-filter'
import { TABLE_NAMES } from '@/lib/types'
import type { ResourceSlug } from '@/lib/types'
import { invalidatePattern } from '@/lib/cache'
import { broadcastMutation } from '@/lib/websocket-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const { resource, id } = await params
    const ctx = extractQueryContext(request.headers)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tableName = TABLE_NAMES[resource as ResourceSlug]
    if (!tableName) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

    const record = await getRecord(tableName, id)
    return NextResponse.json({ record })
  } catch (err) {
    if (err instanceof AirtableError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const { resource, id } = await params
    const ctx = extractQueryContext(request.headers)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // All roles can update their own notifications and notes
    // All other resources require management, strategy, or sales
    if (resource !== 'notifications' && resource !== 'notes' && (ctx.role === 'client' || ctx.role === 'team')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tableName = TABLE_NAMES[resource as ResourceSlug]
    if (!tableName) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

    const body = await request.json()
    const record = await updateRecord(tableName, id, body.fields ?? body)

    await invalidatePattern(`${resource}:*`)
    
    // Broadcast mutation to all connected users with permission
    await broadcastMutation(resource, 'update', id, record)
    
    return NextResponse.json({ record })
  } catch (err) {
    if (err instanceof AirtableError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[PATCH /api/airtable] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const { resource, id } = await params
    const ctx = extractQueryContext(request.headers)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Clients can never delete; team members can only delete notes
    if (ctx.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (ctx.role === 'team' && resource !== 'notes') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tableName = TABLE_NAMES[resource as ResourceSlug]
    if (!tableName) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

    await deleteRecord(tableName, id)

    await invalidatePattern(`${resource}:*`)
    await broadcastMutation(resource, 'delete', id, null)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AirtableError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[DELETE /api/airtable] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
