import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { TeamFields } from "@/lib/v2/types"

export async function GET() {
  try {
    const records = await fetchTable<TeamFields>(TABLES.TEAM, {
      sort: [{ field: "Full Name", direction: "asc" }],
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching team:", error)
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 })
  }
}
