import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/v2/session"

export async function GET(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user: session })
}
