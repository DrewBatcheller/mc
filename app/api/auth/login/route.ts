/**
 * POST /api/auth/login
 *
 * Validates email + password against Airtable Team and Clients tables.
 * Returns an AuthUser object on success WITHOUT waiting for permissions.
 * Permissions are fetched separately by the client after login succeeds.
 *
 * Role logic:
 *   Team table match:
 *     Department = "Management"  → role: "management"
 *     Department = "Strategy"    → role: "strategy"
 *     Department = "Sales"       → role: "sales"
 *     else                       → role: "team"
 *   Clients table match          → role: "client"
 */

import { NextResponse } from 'next/server'
import { findOneRecord } from '@/lib/airtable'
import type { AuthUser, UserRole } from '@/lib/types'

interface TeamRecord {
  'Full Name': string
  'First Name': string
  Email: string
  Password: string
  Department: string
  'Team Member Record ID': string
}

interface ClientRecord {
  'Brand Name': string
  Email: string
  Password: string
  'Record ID': string
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── 1. Check Team table ──────────────────────────────────────────────────
    const teamRecord = await findOneRecord<TeamRecord>(
      'Team',
      `AND(LOWER({Email}) = "${normalizedEmail}", {Password} = "${password}")`
    )

    if (teamRecord) {
      const dept = (teamRecord.fields['Department'] ?? '').toLowerCase()

      let role: UserRole
      if (dept === 'management') {
        role = 'management'
      } else if (dept === 'strategy') {
        role = 'strategy'
      } else if (dept === 'sales') {
        role = 'sales'
      } else {
        role = 'team'
      }

      const fullName = teamRecord.fields['Full Name'] ?? teamRecord.fields['First Name'] ?? email
      const initials = fullName
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()

      // Return immediately - permissions will be fetched by client after auth
      const user: AuthUser = {
        id: teamRecord.id,
        email: normalizedEmail,
        name: fullName,
        role,
        department: teamRecord.fields['Department'],
        avatarInitials: initials,
      }

      return NextResponse.json({ user })
    }

    // ── 2. Check Clients table ───────────────────────────────────────────────
    const clientRecord = await findOneRecord<ClientRecord>(
      'Clients',
      `AND(LOWER({Email}) = "${normalizedEmail}", {Password} = "${password}")`
    )

    if (clientRecord) {
      const brandName = clientRecord.fields['Brand Name'] ?? email

      // Return immediately - permissions will be fetched by client after auth
      const user: AuthUser = {
        id: clientRecord.id,
        email: normalizedEmail,
        name: brandName,
        role: 'client',
        clientId: clientRecord.id,
        avatarInitials: brandName.slice(0, 2).toUpperCase(),
      }

      return NextResponse.json({ user })
    }

    // ── 3. No match ──────────────────────────────────────────────────────────
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch (err) {
    console.error('[/api/auth/login] Error:', err)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
