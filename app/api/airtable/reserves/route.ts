import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { ReserveFields } from "@/lib/v2/types"

export async function GET() {
  try {
    const records = await fetchTable<ReserveFields>(TABLES.RESERVES, {
      sort: [{ field: "Month & Year", direction: "desc" }],
    })
    return NextResponse.json({ records })
  } catch (error) {
    console.error("[v0] Reserves fetch error:", error)
    return NextResponse.json({ records: [] }, { status: 200 })
  }
}
