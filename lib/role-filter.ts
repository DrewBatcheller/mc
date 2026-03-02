/**
 * Role-based Airtable formula builder.
 * Each resource × role combination produces a filterByFormula string
 * that is injected into Airtable API queries server-side.
 *
 * This means clients NEVER receive records they shouldn't see —
 * the database itself returns only authorized data.
 */

import type { UserRole } from './types'

// ─── Context required for filtering ──────────────────────────────────────────
export interface FilterContext {
  role: UserRole
  userId?: string      // Airtable record ID of the authenticated user
  clientId?: string    // Airtable record ID of the client (for client users, or selected client)
}

// ─── Formula helpers ──────────────────────────────────────────────────────────
function eq(field: string, value: string): string {
  return `{${field}} = "${value}"`
}

function containsId(field: string, recordId: string): string {
  // FIND() works for multi-link fields that serialize as comma-separated IDs
  return `FIND("${recordId}", {${field}}) > 0`
}

function and(...conditions: string[]): string {
  if (conditions.length === 1) return conditions[0]
  return `AND(${conditions.join(', ')})`
}

function or(...conditions: string[]): string {
  if (conditions.length === 1) return conditions[0]
  return `OR(${conditions.join(', ')})`
}

// ─── Resource-specific filter builders ───────────────────────────────────────

/**
 * Returns an Airtable filterByFormula for a given resource + role combo.
 * Returns '' (empty string) for "no filter needed" (management sees all).
 * Returns null to signal "access denied" (should 403).
 */
export function buildRoleFilter(
  resource: string,
  ctx: FilterContext
): string | null {
  const { role, userId, clientId } = ctx

  switch (resource) {
    // ── Experiments ─────────────────────────────────────────────────────────
    case 'experiments': {
      if (role === 'management') return ''  // no filter
      if (role === 'strategy') return ''    // strategy sees all experiments
      if (role === 'team' && userId) {
        // Team members see experiments where they are assigned
        return or(
          containsId('Developer', userId),
          containsId('Designer', userId),
          containsId('Strategist', userId),
          containsId('QA', userId)
        )
      }
      if (role === 'client' && clientId) {
        // Use the formula field that extracts record ID from Brand Name
        return eq('Record ID (from Brand Name)', clientId)
      }
      return null
    }

    // ── Experiment Ideas ─────────────────────────────────────────────────────
    case 'experiment-ideas': {
      if (role === 'management' || role === 'strategy') return ''
      if (role === 'team' && userId) {
        return containsId('Assigned To', userId)
      }
      if (role === 'client' && clientId) {
        // Use containsId for the linked Client field
        return containsId('Client', clientId)
      }
      return null
    }

    // ── Batches ──────────────────────────────────────────────────────────────
    case 'batches': {
      if (role === 'management' || role === 'strategy') return ''
      if (role === 'client' && clientId) {
        // Check both the linked record ID and the formula field for backward compatibility
        return `OR(FIND("${clientId}", CONCATENATE({Client})) > 0, {Record ID (from Client)} = "${clientId}")`
      }
      if (role === 'team') return ''  // team sees all batches they work on
      return null
    }

    // ── Variants ─────────────────────────────────────────────────────────────
    case 'variants': {
      if (role === 'management' || role === 'strategy' || role === 'team') return ''
      if (role === 'client' && clientId) {
        // Variants link to Experiments; filter by experiment's brand ID
        return containsId('Experiments', clientId)
      }
      return null
    }

    // ── Tasks ────────────────────────────────────────────────────────────────
    case 'tasks': {
      if (role === 'management') return ''
      if (role === 'strategy') return ''
      if (role === 'team' && userId) {
        return eq('Assigned To (Record ID)', userId)
      }
      if (role === 'client' && clientId) {
        return eq('Record ID (from Client)', clientId)
      }
      return null
    }

    // ── Leads ────────────────────────────────────────────────────────────────
    case 'leads': {
      if (role === 'management' || role === 'strategy') return ''
      return null  // team and client don't see leads
    }

    // ── Call Record ───────────────────────────────────────────────────────────
    case 'call-record': {
      if (role === 'management' || role === 'strategy') return ''
      return null
    }

    // ── Revenue ───────────────────────────────────────────────────────────────
    case 'revenue': {
      if (role === 'management') return ''
      return null
    }

    // ── Expenses ──────────────────────────────────────────────────────────────
    case 'expenses': {
      if (role === 'management') return ''
      return null
    }

    // ── Profit & Loss ─────────────────────────────────────────────────────────
    case 'profit-loss': {
      if (role === 'management') return ''
      return null
    }

    // ── Reserve ───────────────────────────────────────────────────────────────
    case 'reserve': {
      if (role === 'management') return ''
      return null
    }

    // ── Clients ───────────────────────────────────────────────────────────────
    case 'clients': {
      if (role === 'management' || role === 'strategy') return ''
      if (role === 'client' && clientId) {
        // A client user can only fetch their own record
        return `RECORD_ID() = "${clientId}"`
      }
      return null
    }

    // ── Contacts ──────────────────────────────────────────────────────────────
    case 'contacts': {
      if (role === 'management' || role === 'strategy') return ''
      if (role === 'client' && clientId) {
        return eq('Record ID (from Client)', clientId)
      }
      return null
    }

    // ── Team ──────────────────────────────────────────────────────────────────
    case 'team': {
      if (role === 'management' || role === 'strategy') return ''
      if (role === 'team' && userId) {
        return `RECORD_ID() = "${userId}"`
      }
      return null
    }

    // ── Partners / Affiliates ─────────────────────────────────────────────────
    case 'partners': {
      if (role === 'management' || role === 'strategy') return ''
      return null
    }

    // ── Permissions ───────────────────────────────────────────────────────────
    case 'permissions': {
      if (role === 'management') return ''
      return null
    }

    // ── Onboard QA ────────────────────────────────────────────────────────────
    case 'onboard-qa': {
      if (role === 'management' || role === 'strategy') return ''
      return null
    }

    default:
      return null
  }
}

// ─── Extract query context from request headers ───────────────────────────────
// API routes set these headers from the session user object
export function extractQueryContext(headers: Headers): FilterContext | null {
  const role = headers.get('x-user-role') as UserRole | null
  const userId = headers.get('x-user-id') ?? undefined
  const clientId = headers.get('x-client-id') ?? undefined

  if (!role) return null

  return { role, userId, clientId }
}
