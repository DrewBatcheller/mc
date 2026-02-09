import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { CallRecordFields } from "@/lib/v2/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    let filterByFormula = ""
    if (clientId) {
      filterByFormula = `FIND("${clientId}", ARRAYJOIN({Client}))`
    }

    const records = await fetchTable<CallRecordFields>(TABLES.CALL_RECORDS, {
      filterByFormula,
      sort: [{ field: "Event Start Time", direction: "desc" }],
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching call records:", error)
    return NextResponse.json({ error: "Failed to fetch call records" }, { status: 500 })
  }
}
