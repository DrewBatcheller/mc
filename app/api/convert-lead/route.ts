/**
 * POST /api/convert-lead
 *
 * Atomically converts a Lead into a Client:
 *   1. Creates a new Client record with the provided onboarding details
 *   2. PATCHes the Lead:  Lead Status → "Client", Stage → "Closed",
 *                         Link to Client → [new client record ID]
 *
 * Also persists any contact edits made on the form back to the Lead.
 *
 * Called from /onboarding/convert — an externally-linkable page used by
 * internal (management/sales) staff, so this route performs its own
 * lightweight input validation rather than relying on role headers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRecord, updateRecord, AirtableError } from '@/lib/airtable'
import { TABLE_NAMES } from '@/lib/types'
import { broadcastMutation } from '@/lib/websocket-server'
import { invalidatePattern } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      leadId,         // required — Airtable record ID of the Lead

      // Lead contact fields (may have been edited on the form)
      leadName,
      leadEmail,
      leadPhone,
      leadWebsite,
      leadTimezone,

      // Client record fields
      brandName,
      planType,
      monthlyPrice,   // number
      devEnabled,     // boolean
      devHours,       // number (flat total, not per-month)
      notes,
      password,

      // Team member Airtable record IDs
      strategistId,
      designerId,
      developerId,
      qaId,
    } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    /* ── Step 1: Create the Client record ──────────────────────────────────── */

    const clientFields: Record<string, unknown> = {
      'Brand Name':          brandName || leadName || '',
      'Email':               leadEmail || '',
      'Website':             leadWebsite || '',
      'Client Status':       'Active',
      'Plan Type':           planType || '',
      'Initial Closed Date': new Date().toISOString().split('T')[0],
    }

    const price = parseFloat(String(monthlyPrice ?? '').replace(/[$,]/g, ''))
    if (!isNaN(price) && price > 0) {
      clientFields['Monthly Price'] = price
    }

    const hours = parseInt(String(devHours ?? ''), 10)
    if (devEnabled && !isNaN(hours) && hours > 0) {
      clientFields['Development Hours Assigned'] = hours
    }

    if (notes)    clientFields['Notes']              = notes
    if (password) clientFields['Dashboard Password'] = password

    // Linked team member records — arrays of Airtable record IDs
    if (strategistId) clientFields['Strategist'] = [strategistId]
    if (designerId)   clientFields['Designer']   = [designerId]
    if (developerId)  clientFields['Developer']  = [developerId]
    if (qaId)         clientFields['QA']         = [qaId]

    const newClient = await createRecord(TABLE_NAMES['clients'], clientFields)

    /* ── Step 2: PATCH the Lead ─────────────────────────────────────────────── */

    const leadFields: Record<string, unknown> = {
      'Lead Status':    'Client',
      'Stage':          'Closed',
      'Link to Client': [newClient.id],
    }

    // Persist any contact edits made on the form
    if (leadName)     leadFields['Full Name']             = leadName
    if (leadEmail)    leadFields['Email']                 = leadEmail
    if (leadPhone)    leadFields['Phone Number']          = leadPhone
    if (leadWebsite)  leadFields['Website']               = leadWebsite
    if (leadTimezone) leadFields['Timezone']              = leadTimezone

    await updateRecord(TABLE_NAMES['leads'], leadId, leadFields)

    /* ── Invalidate caches + broadcast ─────────────────────────────────────── */

    await Promise.all([
      invalidatePattern('clients:*'),
      invalidatePattern('leads:*'),
    ])

    await Promise.all([
      broadcastMutation('clients', 'create', newClient.id, newClient),
      broadcastMutation('leads',   'update', leadId,       null),
    ])

    return NextResponse.json({ clientId: newClient.id, success: true }, { status: 201 })

  } catch (err) {
    if (err instanceof AirtableError) {
      console.error('[POST /api/convert-lead] Airtable error:', err.status, err.message)
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 ? err.status : 502 }
      )
    }
    console.error('[POST /api/convert-lead] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
