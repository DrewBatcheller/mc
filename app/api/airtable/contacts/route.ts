import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { ContactFields } from "@/lib/v2/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const contactIds = searchParams.get("contactIds")

    // If we have specific contact IDs from the client, use those
    if (contactIds) {
      const ids = contactIds.split(",").filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ records: [] })
      }
      
      // Fetch all contacts and filter to the ones we need
      const allContacts = await fetchTable<ContactFields>(TABLES.CONTACTS, {
        sort: [{ field: "Full Name", direction: "asc" }],
      })
      const filtered = allContacts.filter((c) => ids.includes(c.id))
      return NextResponse.json({ records: filtered })
    }

    // Fallback: filter by clientId using Brand Name field
    if (clientId) {
      const records = await fetchTable<ContactFields>(TABLES.CONTACTS, {
        filterByFormula: `{Brand Name} = "${clientId}"`,
        sort: [{ field: "Full Name", direction: "asc" }],
      })
      return NextResponse.json({ records })
    }

    return NextResponse.json({ records: [] })
  } catch (error) {
    console.error("[API] Error fetching contacts:", error)
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 })
  }
}
