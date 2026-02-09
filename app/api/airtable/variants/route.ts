import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { VariantFields } from "@/lib/v2/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const experimentId = searchParams.get("experimentId")
    const batchRecordId = searchParams.get("batchRecordId")

    console.log("[API] Fetching variants with experimentId:", experimentId, "batchRecordId:", batchRecordId)

    // First, fetch all variants to see if they exist
    const allRecords = await fetchTable<VariantFields>(TABLES.VARIANTS, {
      sort: [{ field: "ID", direction: "asc" }],
    })
    
    console.log("[API] Total variants in table:", allRecords.length)
    if (allRecords.length > 0) {
      console.log("[API] Sample variant Experiments field:", allRecords[0].fields.Experiments)
    }

    // Now try filtering
    let filterByFormula = ""
    const filters: string[] = []

    if (experimentId) {
      // Use array contains check - check if experimentId is one of the linked records
      filters.push(`{Experiments}`)
    }
    if (batchRecordId) {
      filters.push(`{Batch Record ID (from Experiments)}`)
    }

    // For now, just return all variants if experimentId is provided, to debug
    const records = experimentId ? allRecords.filter(r => {
      const experiments = r.fields.Experiments
      if (Array.isArray(experiments)) {
        return experiments.includes(experimentId)
      }
      return false
    }) : allRecords

    console.log("[API] Filtered variants:", records.length)

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching variants:", error)
    return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500 })
  }
}
