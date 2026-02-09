import { NextResponse } from "next/server"
import { updateRecord, TABLES } from "@/lib/v2/airtable"
import type { ExperimentFields } from "@/lib/v2/types"

async function handleUpdate(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { fields } = await request.json()
    const experimentId = params.id

    // Update the experiment record
    const updated = await updateRecord<ExperimentFields>(TABLES.EXPERIMENTS, experimentId, fields)

    return NextResponse.json({ success: true, record: updated })
  } catch (error) {
    console.error("[API] Error updating experiment:", error)
    return NextResponse.json(
      { error: "Failed to update experiment" },
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
