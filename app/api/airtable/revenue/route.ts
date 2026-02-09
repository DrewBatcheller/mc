import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { RevenueFields } from "@/lib/v2/types"

export async function GET() {
  try {
    const records = await fetchTable<RevenueFields>(TABLES.REVENUE, {
      sort: [{ field: "Date", direction: "desc" }],
    })
    return NextResponse.json({ records })
  } catch (error) {
    console.error("[v0] Revenue fetch error:", error)
    return NextResponse.json({ records: [] }, { status: 200 })
  }
}
