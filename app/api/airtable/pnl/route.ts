import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { PLFields } from "@/lib/v2/types"

export async function GET() {
  try {
    const records = await fetchTable<PLFields>(TABLES.PL, {
      sort: [{ field: "Month & Year", direction: "desc" }],
    })
    return NextResponse.json({ records })
  } catch (error) {
    console.error("[v0] P&L fetch error:", error)
    return NextResponse.json({ records: [] }, { status: 200 })
  }
}
