/**
 * GET  /api/airtable/[resource]   — role-filtered list
 * POST /api/airtable/[resource]   — create record (management only)
 *
 * This is the single unified endpoint for all Airtable reads.
 * Role-based filtering is applied server-side via Airtable formulas.
 * Results are cached in Redis when available.
 *
 * Request headers (set by the client using useAirtable hook):
 *   x-user-role:   UserRole
 *   x-user-id:     Airtable record ID of authenticated user
 *   x-client-id:   Airtable record ID of the client (if applicable)
 *
 * Query params:
 *   fields[]       — specific fields to return
 *   sort[0][field] — sort field
 *   sort[0][direction] — asc|desc
 *   filterExtra    — additional formula to AND with role filter
 *   maxRecords     — cap results
 *   pageSize       — records per page
 *   offset         — pagination cursor
 *   view           — Airtable view name
 *   noCache        — bypass cache
 */

import { NextRequest, NextResponse } from 'next/server'
import { listRecords, AirtableError, createRecord } from '@/lib/airtable'
import { buildRoleFilter, extractQueryContext } from '@/lib/role-filter'
import { getOrSet, cacheKey, invalidatePattern, TTL } from '@/lib/cache'
import { TABLE_NAMES } from '@/lib/types'
import type { ResourceSlug } from '@/lib/types'
import { broadcastMutation } from '@/lib/websocket-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params
    const searchParams = request.nextUrl.searchParams

    // ── Auth context from headers ────────────────────────────────────────────
    const ctx = extractQueryContext(request.headers)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Resolve table name ───────────────────────────────────────────────────
    const tableName = TABLE_NAMES[resource as ResourceSlug]
    if (!tableName) {
      return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })
    }

    // ── Build role filter ────────────────────────────────────────────────────
    const roleFormula = buildRoleFilter(resource, ctx)
    if (roleFormula === null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Build final filter formula ───────────────────────────────────────────
    const extraFilter = searchParams.get('filterExtra')
    let filterByFormula = roleFormula

    if (extraFilter && roleFormula) {
      filterByFormula = `AND(${roleFormula}, ${extraFilter})`
    } else if (extraFilter) {
      filterByFormula = extraFilter
    }

    // Debug logging
    if (filterByFormula) {
      console.log(`[/api/airtable] Resource: ${resource}, Filter formula:`, filterByFormula)
    }

    // ── Parse additional options from query params ────────────────────────────
    const options: Parameters<typeof listRecords>[1] = {}
    if (filterByFormula) options.filterByFormula = filterByFormula

    const maxRecords = searchParams.get('maxRecords')
    if (maxRecords) options.maxRecords = parseInt(maxRecords, 10)

    const pageSize = searchParams.get('pageSize')
    if (pageSize) options.pageSize = parseInt(pageSize, 10)

    const offset = searchParams.get('offset')
    if (offset) options.offset = offset

    const view = searchParams.get('view')
    if (view) options.view = view

    const fields = searchParams.getAll('fields[]')
    if (fields.length > 0) options.fields = fields

    const sortFields = searchParams.getAll('sort[0][field]')
    const sortDirs = searchParams.getAll('sort[0][direction]')
    if (sortFields.length > 0) {
      options.sort = sortFields.map((field, i) => ({
        field,
        direction: (sortDirs[i] as 'asc' | 'desc') ?? 'asc',
      }))
    }

    // ── Cache ────────────────────────────────────────────────────────────────
    const noCache = searchParams.get('noCache') === 'true'
    const key = cacheKey(
      resource,
      ctx.role,
      ctx.clientId ?? ctx.userId,
      filterByFormula?.slice(0, 50)  // partial formula for key uniqueness
    )

    if (noCache) {
      const result = await listRecords(tableName, options)
      return NextResponse.json({ records: result.records, offset: result.offset, cached: false })
    }

    const { data, cached } = await getOrSet(
      key,
      () => listRecords(tableName, options),
      TTL.medium
    )

    return NextResponse.json({ records: data.records, offset: data.offset, cached })

  } catch (err) {
    if (err instanceof AirtableError) {
      console.error(`[/api/airtable] Airtable error ${err.status}:`, err.message)
      return NextResponse.json({ error: err.message }, { status: err.status >= 400 ? err.status : 502 })
    }
    console.error('[/api/airtable] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — create record ─────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params

    const ctx = extractQueryContext(request.headers)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Allow clients to create experiment ideas
    // All other resources require management/strategy
    const canCreateIdeas = (ctx.role === 'management' || ctx.role === 'strategy' || ctx.role === 'client')
    const canCreateOthers = (ctx.role === 'management' || ctx.role === 'strategy')

    if (resource === 'experiment-ideas') {
      if (!canCreateIdeas) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (!canCreateOthers) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const tableName = TABLE_NAMES[resource as ResourceSlug]
    if (!tableName) {
      return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })
    }

    const body = await request.json()
    let fields = body.fields ?? body

    // For clients creating experiment ideas, enforce client data isolation
    if (resource === 'experiment-ideas' && ctx.role === 'client' && ctx.clientId) {
      // Client can only create ideas for their own client record
      fields['Client'] = [ctx.clientId]
    }

    const { createRecord: createRecordFn } = await import('@/lib/airtable')
    const record = await createRecordFn(tableName, fields)

    // Invalidate cache for this resource
    await invalidatePattern(`${resource}:*`)
    
    // Broadcast mutation to all connected users with permission
    await broadcastMutation(resource, 'create', record.id, record)

    return NextResponse.json({ record }, { status: 201 })

  } catch (err) {
    if (err instanceof AirtableError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[/api/airtable POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
