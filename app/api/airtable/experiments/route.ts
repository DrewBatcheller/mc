import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import { getSessionFromRequest } from "@/lib/v2/session"
import type { ExperimentFields } from "@/lib/v2/types"

export async function GET(request: Request) {
  try {
    // Try to get session from request (server-side forms)
    let session = getSessionFromRequest(request)
    
    // Try to get session from X-User-Id header (client-side with cookie fallback)
    if (!session) {
      const userId = request.headers.get("x-user-id")
      const userRole = request.headers.get("x-user-role")
      const clientRecordId = request.headers.get("x-client-record-id")
      
      if (userId && userRole) {
        session = {
          id: userId,
          name: request.headers.get("x-user-name") || "",
          email: request.headers.get("x-user-email") || "",
          role: (userRole as any) || "team",
          clientRecordId: clientRecordId || undefined,
        }
      }
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const status = searchParams.get("status")
    const batchId = searchParams.get("batchId")

    let filterByFormula = ""
    const filters: string[] = []

    // If user is a client, ONLY allow fetching their own experiments
    if (session.role === "client") {
      if (!session.clientRecordId) {
        return NextResponse.json({ error: "Client record ID not found" }, { status: 400 })
      }
      // Force filter by their own client ID
      filters.push(`FIND("${session.clientRecordId}", ARRAYJOIN({Record ID (from Brand Name)}))`)
    } else {
      // Non-client users can use clientId filter if provided
      if (clientId) {
        filters.push(`FIND("${clientId}", ARRAYJOIN({Record ID (from Brand Name)}))`)
      }
    }

    if (status) {
      filters.push(`{Test Status} = "${status}"`)
    }
    if (batchId) {
      filters.push(`FIND("${batchId}", ARRAYJOIN({Batch Record ID}))`)
    }

    if (filters.length > 0) {
      filterByFormula = filters.length === 1 ? filters[0] : `AND(${filters.join(",")})`
    }

    const records = await fetchTable<ExperimentFields>(TABLES.EXPERIMENTS, {
      filterByFormula,
      sort: [{ field: "Launch Date", direction: "desc" }],
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching experiments:", error)
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 })
  }
}
