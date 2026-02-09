import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import { getSessionFromRequest } from "@/lib/v2/session"
import type { ClientFields } from "@/lib/v2/types"

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
    const status = searchParams.get("status")

    let filterByFormula = ""
    const filters: string[] = []

    // If user is a client, only return their own record
    if (session.role === "client") {
      if (!session.clientRecordId) {
        return NextResponse.json({ error: "Client record ID not found" }, { status: 400 })
      }
      // Force filter to only their own client record
      filters.push(`{Record ID} = "${session.clientRecordId}"`)
    } else {
      // Management/team can see all or filter by status
      if (status) {
        filters.push(`{Client Status} = "${status}"`)
      }
    }

    if (filters.length > 0) {
      filterByFormula = filters.join(" AND ")
    }

    const records = await fetchTable<ClientFields>(TABLES.CLIENTS, {
      filterByFormula,
      sort: [{ field: "Brand Name", direction: "asc" }],
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching clients:", error)
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
  }
}
