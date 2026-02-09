import { NextResponse } from "next/server"
import { updateRecord, TABLES } from "@/lib/v2/airtable"
import type { LeadFields } from "@/lib/v2/types"

async function handleUpdate(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { fields } = await request.json()
    const leadId = params.id

    // Update the lead record
    const updated = await updateRecord<LeadFields>(TABLES.LEADS, leadId, fields)

    return NextResponse.json({ success: true, records: [updated] })
  } catch (error) {
    console.error("[API] Error updating lead:", error)
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  return handleUpdate(request, context)
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  return handleUpdate(request, context)
}
