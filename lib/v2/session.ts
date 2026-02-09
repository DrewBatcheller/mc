// Session is stored as a base64-encoded JSON cookie (mc_session)
// Read from the cookie header directly for compatibility with next-lite runtime

export interface SessionUser {
  id: string
  name: string
  email: string
  role: "management" | "team" | "client"
  teamRecordId?: string
  clientRecordId?: string
  clientName?: string
  avatar?: string
  department?: string
}

export const SESSION_COOKIE_NAME = "mc_session"

export function encodeSession(user: SessionUser): string {
  return btoa(JSON.stringify(user))
}

export function decodeSession(raw: string): SessionUser | null {
  try {
    return JSON.parse(atob(raw)) as SessionUser
  } catch {
    return null
  }
}

// Server-side: read from request cookies header
export function getSessionFromRequest(request: Request): SessionUser | null {
  const cookieHeader = request.headers.get("cookie") || ""
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))
  if (!match) return null
  return decodeSession(decodeURIComponent(match[1]))
}
