import { NextResponse } from "next/server"
import { fetchTable, TABLES } from "@/lib/v2/airtable"
import type { TeamFields, ClientFields } from "@/lib/v2/types"
import { encodeSession, SESSION_COOKIE_NAME } from "@/lib/v2/session"
import type { SessionUser } from "@/lib/v2/session"

// Management emails (hardcoded list -- extend as needed)
const MANAGEMENT_EMAILS = [
  "jayden@moreconversions.com",
  "james@moreconversions.com",
]

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 1. Check Team table first
    const teamMembers = await fetchTable<TeamFields>(TABLES.TEAM, {
      filterByFormula: `LOWER({Email}) = "${normalizedEmail}"`,
    })

    if (teamMembers.length > 0) {
      const member = teamMembers[0]

      // Verify password if the member has one set
      if (member.fields.Password) {
        if (!password || password !== member.fields.Password) {
          return NextResponse.json({ error: "Invalid password" }, { status: 401 })
        }
      }

      const isManagement = MANAGEMENT_EMAILS.includes(normalizedEmail)
      const avatar = member.fields["Profile Photo"]?.[0]?.thumbnails?.large?.url
        || member.fields["Profile Photo"]?.[0]?.url
        || ""

      const sessionUser: SessionUser = {
        id: member.id,
        name: (member.fields["Full Name"] || "").trim(),
        email: normalizedEmail,
        role: isManagement ? "management" : "team",
        teamRecordId: member.id,
        avatar,
        department: member.fields.Department || "",
      }

      const token = encodeSession(sessionUser)
      const response = NextResponse.json({ user: sessionUser, sessionToken: token })
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      })
      return response
    }

    // 2. Check Clients table (clients log in with client email + password)
    const clientRecords = await fetchTable<ClientFields>(TABLES.CLIENTS, {
      filterByFormula: `LOWER({Email}) = "${normalizedEmail}"`,
    })

    if (clientRecords.length > 0) {
      const client = clientRecords[0]

      if (client.fields.Password) {
        if (!password || password !== client.fields.Password) {
          return NextResponse.json({ error: "Invalid password" }, { status: 401 })
        }
      }

      const sessionUser: SessionUser = {
        id: client.id,
        name: (client.fields["Brand Name"] || "").trim(),
        email: normalizedEmail,
        role: "client",
        clientRecordId: client.id,
        clientName: (client.fields["Brand Name"] || "").trim(),
      }

      const clientToken = encodeSession(sessionUser)
      const response = NextResponse.json({ user: sessionUser, sessionToken: clientToken })
      response.cookies.set(SESSION_COOKIE_NAME, clientToken, {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      })
      return response
    }

    return NextResponse.json({ error: "No account found with that email" }, { status: 401 })
  } catch (error) {
    console.error("[Auth] Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
