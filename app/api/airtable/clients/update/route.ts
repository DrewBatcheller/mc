import { NextResponse } from "next/server"
import Airtable from "airtable"
import type { ClientFields } from "@/lib/v2/types"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
)

async function uploadBase64Attachment(
  dataUri: string,
  filename: string,
  recordId: string
) {
  try {
    // Extract base64 data and content type from data URI
    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) return null

    const [, contentType, base64Data] = matches

    // Use Airtable's Upload Attachment API
    // Endpoint: POST /v0/{baseId}/{recordId}/{attachmentFieldIdOrName}/uploadAttachment
    const response = await fetch(
      `https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/Avatar/uploadAttachment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: base64Data,
          contentType,
          filename,
        }),
      }
    )

    if (!response.ok) {
      console.error("[API] Airtable upload failed:", response.status, await response.text())
      return null
    }

    const result = await response.json()
    
    // Extract the attachment object from the response
    // The API returns the full record structure, but we only need the attachment data
    if (result.fields && result.fields.Avatar && Array.isArray(result.fields.Avatar)) {
      const uploadedAttachment = result.fields.Avatar[0]
      // Return only the fields needed for record update: id and url
      return {
        id: uploadedAttachment.id,
        url: uploadedAttachment.url,
      }
    }
    
    return null
  } catch (error) {
    console.error("[API] Error uploading attachment:", error)
    return null
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, fields } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Record ID required" }, { status: 400 })
    }

    const cleanedFields: Record<string, any> = {}

    // Map form fields to Airtable field names
    for (const [key, value] of Object.entries(fields)) {
      if (key === "Status") {
        // Map Status to Client Status
        cleanedFields["Client Status"] = value
      } else if (key === "Avatar") {
        // Handle base64 Avatar attachments via Upload Attachment API
        // Only keep the newly uploaded avatar (replace any existing ones)
        if (value && Array.isArray(value)) {
          const processedAttachments = []

          for (const attachment of value) {
            if (attachment?.url?.startsWith("data:")) {
              // Upload base64 data via Airtable Upload Attachment API
              const uploadedAttachment = await uploadBase64Attachment(
                attachment.url,
                attachment.filename || "avatar.jpg",
                id
              )

              if (uploadedAttachment) {
                processedAttachments.push(uploadedAttachment)
              }
            } else if (attachment?.url && !attachment?.url?.startsWith("blob:")) {
              // Only keep non-blob URLs (existing URLs from server)
              processedAttachments.push(attachment)
            }
          }

          // Always set Avatar to only contain the new upload(s), clearing old ones
          if (processedAttachments.length > 0) {
            cleanedFields.Avatar = processedAttachments
          } else {
            // If no attachments, clear the field
            cleanedFields.Avatar = []
          }
        }
      } else if (value !== null && value !== undefined && value !== "") {
        cleanedFields[key] = value
      }
    }

    const updated = await base("Clients").update(id, cleanedFields)

    return NextResponse.json({
      id: updated.id,
      fields: updated.fields as ClientFields,
    })
  } catch (error) {
    console.error("[API] Error updating client:", error)
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    )
  }
}
