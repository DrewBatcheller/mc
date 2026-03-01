/**
 * POST /api/auth/logout
 * Server-side logout stub — actual session clearing is done client-side via localStorage.
 * This endpoint exists to be the canonical logout mechanism for future server sessions.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  // Phase 1: nothing to clear server-side (no cookies/sessions yet)
  // Phase 2+: clear HttpOnly session cookie here
  return NextResponse.json({ ok: true })
}
