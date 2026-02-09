import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { LeadFields } from "@/lib/v2/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let filterByFormula = ""
    if (status) {
      filterByFormula = `{Lead Status} = "${status}"`
    }

    const records = await fetchTable<LeadFields>(TABLES.LEADS, {
      filterByFormula,
      sort: [{ field: "Date Created", direction: "desc" }],
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching leads:", error)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}
