/**
 * GET  /api/airtable/[resource]/[id]   — fetch single record
 * PATCH /api/airtable/[resource]/[id]  — update record fields
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRecord, updateRecord, AirtableError } from '@/lib/airtable'
import { extractQueryContext } from '@/lib/role-filter'
import { TABLE_NAMES } from '@/lib/types'
import type { ResourceSlug } from '@/lib/types'
import { invalidatePattern } from '@/lib/cache'

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

    // Clients can't mutate via API
    if (ctx.role === 'client' || ctx.role === 'team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tableName = TABLE_NAMES[resource as ResourceSlug]
    if (!tableName) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

    const body = await request.json()
    const record = await updateRecord(tableName, id, body.fields ?? body)

    await invalidatePattern(`${resource}:*`)
    return NextResponse.json({ record })
  } catch (err) {
    if (err instanceof AirtableError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[PATCH /api/airtable] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
