import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { ExperimentIdeaFields } from "@/lib/v2/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    let filterByFormula = ""
    if (clientId) {
      filterByFormula = `FIND("${clientId}", ARRAYJOIN({Client}))`
    }

    const records = await fetchTable<ExperimentIdeaFields>(TABLES.EXPERIMENT_IDEAS, {
      filterByFormula,
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching experiment ideas:", error)
    return NextResponse.json({ error: "Failed to fetch experiment ideas" }, { status: 500 })
  }
}
