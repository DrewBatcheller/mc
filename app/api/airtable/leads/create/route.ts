import { createRecord } from "@/lib/v2/airtable"
import type { LeadFields } from "@/lib/v2/types"
import type { AirtableRecord } from "@/lib/v2/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fields } = body

    // Add defaults
    const fieldsWithDefaults: Partial<LeadFields> = {
      ...fields,
      "Date Created": new Date().toISOString(),
      Stage: fields.Stage || "Open",
      "Lead Status": fields["Lead Status"] || "Lead",
    }

    // Handle Phone Number field - convert to number or remove if empty
    if (fieldsWithDefaults["Phone Number"]) {
      const phoneStr = String(fieldsWithDefaults["Phone Number"]).replace(/\D/g, "")
      if (phoneStr) {
        fieldsWithDefaults["Phone Number"] = Number(phoneStr)
      } else {
        delete fieldsWithDefaults["Phone Number"]
      }
    } else {
      delete fieldsWithDefaults["Phone Number"]
    }

    const result = await createRecord("Leads", fieldsWithDefaults)

    return Response.json(result)
  } catch (error) {
    console.error("[v0] Error creating lead:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create lead" },
      { status: 500 }
    )
  }
}
