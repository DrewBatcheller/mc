import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { DividendFields } from "@/lib/v2/types"

export async function GET() {
  try {
    const records = await fetchTable<DividendFields>(TABLES.DIVIDENDS, {
      sort: [{ field: "Label", direction: "asc" }],
    })
    return NextResponse.json({ records })
  } catch (error) {
    console.error("[v0] Dividends fetch error:", error)
    return NextResponse.json({ records: [] }, { status: 200 })
  }
}
