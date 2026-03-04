/**
 * POST /api/upload-avatar
 *
 * Uploads an image to the user's Airtable avatar/profile photo field.
 * Uses the Airtable Content API:
 *   POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldName}/uploadAttachment
 *   Body: JSON { contentType, filename, file: "<base64>" }
 *
 * Expects multipart/form-data with:
 *   - file: File (the image)
 * Auth headers: x-user-role, x-user-id, x-client-id (for clients)
 *
 * Both Team and Clients tables use the "Avatar" attachment field.
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractQueryContext } from '@/lib/role-filter'

export async function POST(request: NextRequest) {
  const ctx = extractQueryContext(request.headers)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const isClient = ctx.role === 'client'
  const fieldName = 'Avatar'

  const recordId = isClient
    ? request.headers.get('x-client-id')
    : request.headers.get('x-user-id')

  if (!recordId) return NextResponse.json({ error: 'Missing record ID in auth headers' }, { status: 400 })

  const baseId = process.env.AIRTABLE_BASE_ID
  const apiKey = process.env.AIRTABLE_API_KEY

  if (!baseId || !apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const contentType = file.type || 'application/octet-stream'
  const filename = file.name || 'avatar.jpg'

  try {
    // Base64-encode the file — this is what the Airtable Content API expects
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const uploadUrl =
      `https://content.airtable.com/v0/${baseId}/${recordId}` +
      `/${encodeURIComponent(fieldName)}/uploadAttachment`

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contentType, filename, file: base64 }),
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}))
      console.error('[upload-avatar] Content API failed:', uploadRes.status, err, {
        recordId,
        fieldName,
        isClient,
      })
      return NextResponse.json(
        { error: `Upload failed (${uploadRes.status})`, detail: err },
        { status: uploadRes.status }
      )
    }

    const result = await uploadRes.json()

    // Extract the new attachment's ID so we can replace (not append) on the record
    const attachmentId: string =
      result?.id ??
      result?.attachment?.id ??
      ''

    const url: string =
      result?.url ??
      result?.attachment?.url ??
      ''

    // PATCH the record to set Avatar = [only the new attachment].
    // Without this step the Content API just appends, leaving old images on the record.
    if (attachmentId) {
      const tableName = isClient ? 'Clients' : 'Team'
      await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields: { [fieldName]: [{ id: attachmentId }] } }),
        }
      )
    }

    return NextResponse.json({
      url,
      thumbnailUrl: result?.thumbnails?.large?.url ?? url,
    })
  } catch (err) {
    console.error('[upload-avatar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
