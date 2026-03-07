/**
 * POST /api/upload-experiment-image
 *
 * Uploads an image to an Airtable attachment field on an Experiments record.
 * Uses the Airtable Content API:
 *   POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldName}/uploadAttachment
 *   Body: JSON { contentType, filename, file: "<base64>" }
 *
 * After upload, PATCHes the record to keep only the new attachment (replacing any previous image).
 *
 * Expects multipart/form-data with:
 *   - file:      File   (the image)
 *   - recordId:  string (Airtable record ID, e.g. "recXXXXXX")
 *   - fieldName: string ("Control Image" | "Variant Image" | "PTA Result Image")
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractQueryContext } from '@/lib/role-filter'

export async function POST(request: NextRequest) {
  const ctx = extractQueryContext(request.headers)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  const recordId = formData.get('recordId') as string | null
  const fieldName = formData.get('fieldName') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!recordId) return NextResponse.json({ error: 'No record ID provided' }, { status: 400 })
  if (!fieldName) return NextResponse.json({ error: 'No field name provided' }, { status: 400 })

  const baseId = process.env.AIRTABLE_BASE_ID
  const apiKey = process.env.AIRTABLE_API_KEY

  if (!baseId || !apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const contentType = file.type || 'application/octet-stream'
  const filename = file.name || 'image.jpg'

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
      console.error('[upload-experiment-image] Content API failed:', uploadRes.status, err, {
        recordId,
        fieldName,
      })
      return NextResponse.json(
        { error: `Upload failed (${uploadRes.status})`, detail: err },
        { status: uploadRes.status }
      )
    }

    const result = await uploadRes.json()

    const attachmentId: string = result?.id ?? result?.attachment?.id ?? ''
    const url: string = result?.url ?? result?.attachment?.url ?? ''

    // PATCH the record to set the field to only the new attachment.
    // Without this step, the Content API appends — leaving old images behind.
    if (attachmentId) {
      await fetch(
        `https://api.airtable.com/v0/${baseId}/Experiments/${recordId}`,
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

    return NextResponse.json({ url, raw: result })
  } catch (err) {
    console.error('[upload-experiment-image]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
