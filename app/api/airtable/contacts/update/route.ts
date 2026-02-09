import { NextResponse } from "next/server"
import Airtable from "airtable"
import type { ContactFields } from "@/lib/v2/types"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
)

export async function PATCH(request: Request) {
  try {
    const { id, fields } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Record ID required" }, { status: 400 })
    }

    const updated = await base("Contacts").update(id, fields)

    return NextResponse.json({
      id: updated.id,
      fields: updated.fields as ContactFields,
    })
  } catch (error) {
    console.error("[API] Error updating contact:", error)
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    )
  }
}
