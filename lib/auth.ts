/**
 * Auth utilities — localStorage-based session (Phase 1).
 * login() hits /api/auth/login which validates against Airtable.
 * Session is stored client-side in localStorage as JSON.
 *
 * NOTE: This is intentionally not production-secure. Will be replaced with
 * HttpOnly cookie sessions + server middleware in a future phase.
 */

import type { AuthUser, AuthSession, UserRole } from './types'

const SESSION_KEY = 'mc_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 8  // 8 hours

// Default fallback routes per role (used after login if permissions fail to load)
const DEFAULT_ROUTE: Record<UserRole, string> = {
  management: '/',
  strategy: '/experiments/dashboard',
  sales: '/sales/overview',
  team: '/team/dashboard',
  client: '/clients/client-dashboard',
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser; redirectTo: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Login failed' }))
    throw new Error(body.error ?? 'Login failed')
  }

  const { user } = await res.json() as { user: AuthUser }

  const session: AuthSession = {
    user,
    timestamp: Date.now(),
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  // Keep legacy key for backward compatibility during transition
  localStorage.setItem('isAuthenticated', 'true')
  localStorage.setItem('userEmail', email)

  return {
    user,
    redirectTo: DEFAULT_ROUTE[user.role],
  }
}

// ─── Get Current User ─────────────────────────────────────────────────────────
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const session: AuthSession = JSON.parse(raw)

    // Expire old sessions
    if (Date.now() - session.timestamp > SESSION_TTL_MS) {
      logout()
      return null
    }

    return session.user
  } catch {
    return null
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('userEmail')
}

// ─── Role helpers ─────────────────────────────────────────────────────────────
export function isManagement(role: UserRole): boolean {
  return role === 'management'
}

export function isStrategy(role: UserRole): boolean {
  return role === 'strategy'
}

export function canViewFinances(role: UserRole): boolean {
  return role === 'management'
}

export function canViewAllClients(role: UserRole): boolean {
  return role === 'management' || role === 'strategy'
}

export function isClientUser(role: UserRole): boolean {
  return role === 'client'
}

export function isTeamMember(role: UserRole): boolean {
  return role === 'team'
}
