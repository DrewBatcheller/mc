import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import { getSessionFromRequest } from "@/lib/v2/session"
import type { TaskFields } from "@/lib/v2/types"

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
    const department = searchParams.get("department")
    const status = searchParams.get("status")

    const filters: string[] = []

    // If user is a client, only return tasks for their own client
    if (session.role === "client") {
      if (!session.clientRecordId) {
        return NextResponse.json({ error: "Client record ID not found" }, { status: 400 })
      }
      filters.push(`FIND("${session.clientRecordId}", ARRAYJOIN({Client}))`)
    } else {
      // Management/team can see all or filter by clientId if provided
      if (clientId) {
        filters.push(`FIND("${clientId}", ARRAYJOIN({Client}))`)
      }
    }

    if (department) {
      filters.push(`{Department} = "${department}"`)
    }
    if (status) {
      filters.push(`{Status} = "${status}"`)
    }

    let filterByFormula = ""
    if (filters.length > 0) {
      filterByFormula = filters.length === 1 ? filters[0] : `AND(${filters.join(",")})`
    }

    const records = await fetchTable<TaskFields>(TABLES.TASKS, {
      filterByFormula,
      sort: [{ field: "Due Date", direction: "asc" }],
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("[API] Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
