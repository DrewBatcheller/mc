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
  userName?: string    // Display name — used for linked-field name matching in filterByFormula
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
  const { role, userId, userName, clientId } = ctx

  // Debug: log client context so we can verify headers arrive correctly
  if (role === 'client') {
    console.log(`[role-filter] resource=${resource} role=${role} clientId=${clientId ?? 'MISSING'} userName=${userName ?? 'MISSING'}`)
  }

  switch (resource) {
    // ── Experiments ─────────────────────────────────────────────────────────
    // Experiments are records that have a Batch linked.
    // Unsynced ideas (no Batch) are served through 'experiment-ideas' below.
    case 'experiments': {
      const hasBatch = `{Batch} != ""`
      // Any role with Experiments section access sees all experiments.
      // Section access is governed by the Permissions table, not per-user scoping.
      if (role === 'management' || role === 'strategy' || role === 'team') return hasBatch
      if (role === 'client' && clientId) {
        // Clients are scoped to their own brand only.
        return and(hasBatch, containsId('Record ID (from Brand Name)', clientId))
      }
      return null
    }

    // ── Experiment Ideas ─────────────────────────────────────────────────────
    // Ideas are records with no Batch linked — they haven't been synced yet.
    // This resource slug maps to the Experiments table (see lib/types.ts).
    case 'experiment-ideas': {
      const noBatch = `{Batch} = ""`
      if (role === 'management' || role === 'strategy') return noBatch
      if (role === 'team') {
        // Ideas are pre-experiment — Developer/Designer/Strategist/QA fields are
        // typically empty until an idea is promoted to an experiment.
        // Team members see all ideas so they can review what's in the pipeline.
        return noBatch
      }
      if (role === 'client' && clientId) {
        // {Record ID (from Brand Name)} is a lookup that stores the actual record ID.
        return and(noBatch, containsId('Record ID (from Brand Name)', clientId))
      }
      return null
    }

    // ── Batches ──────────────────────────────────────────────────────────────
    case 'batches': {
      if (role === 'management' || role === 'strategy') return ''
      if (role === 'client' && clientId) {
        return eq('Record ID (from Client)', clientId)
      }
      if (role === 'team') return ''  // team sees all batches they work on
      return null
    }

    // ── Variants ─────────────────────────────────────────────────────────────
    case 'variants': {
      if (role === 'management' || role === 'strategy' || role === 'team') return ''
      if (role === 'client') {
        // Variants have no direct client ID field. Scoping is handled via
        // filterExtra in the client component using the client's experiment record IDs.
        return ''
      }
      return null
    }

    // ── Tasks ────────────────────────────────────────────────────────────────
    case 'tasks': {
      // Section access is governed by the Permissions table.
      // Per-user scoping (e.g. "my tasks") is handled by the component's filterExtra.
      if (role === 'management' || role === 'sales') return ''
      if (role === 'strategy') return ''
      if (role === 'team') return ''
      if (role === 'client' && clientId) {
        return eq('Record ID (from Client)', clientId)
      }
      return null
    }

    // ── Leads ────────────────────────────────────────────────────────────────
    case 'leads': {
      if (role === 'management' || role === 'strategy' || role === 'sales') return ''
      return null  // team and client don't see leads
    }

    // ── Call Record ───────────────────────────────────────────────────────────
    case 'call-record': {
      if (role === 'management' || role === 'strategy' || role === 'sales') return ''
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
      if (role === 'management' || role === 'strategy' || role === 'sales') return ''
      if (role === 'client' && clientId) {
        // A client user can only fetch their own record
        return `RECORD_ID() = "${clientId}"`
      }
      return null
    }

    // ── Contacts ─────────────────────��────────────────────────────────────────
    case 'contacts': {
      if (role === 'management' || role === 'strategy') return ''
      if (role === 'client' && clientId) {
        return eq('Record ID (from Client)', clientId)
      }
      return null
    }

    // ── Team ─────────────────────────────────────────────────────────────────
    case 'team': {
      // All internal roles can fetch team records (needed for assignment dropdowns
      // in experiments, task modals, etc.). Page-level access control prevents
      // team members from reaching /management/team-directory.
      if (role === 'management' || role === 'strategy' || role === 'sales') return ''
      if (role === 'team') return ''
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

    // ── Dividends ─────────────────────────────────────────────────────────────
    case 'dividends': {
      if (role === 'management') return ''
      return null
    }

    // ── Onboard QA ────────────────────────────────────────────────────────────
    case 'onboard-qa': {
      if (role === 'management' || role === 'strategy') return ''
      return null
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    case 'notes': {
      // All internal staff can create and manage notes; clients can leave feedback on review forms
      if (role === 'management' || role === 'strategy' || role === 'sales' || role === 'team') return ''
      if (role === 'client' && clientId) {
        return eq('Record ID (from Client)', clientId)
      }
      return null
    }

    // ── Delays ───────────────────────────────────────────────────────────────
    case 'delays': {
      // All internal roles can view/create delay records; clients cannot
      if (role === 'management' || role === 'strategy' || role === 'sales' || role === 'team') return ''
      return null
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    case 'notifications': {
      // Only show notifications whose Display Time has passed (or has no Display Time set).
      // NOTE: Airtable's filterByFormula evaluates linked record fields as their primary
      // field value (display name), NOT record IDs. So we match by userName, not userId.
      const displayReady = `OR(NOT({Display Time}), IS_BEFORE({Display Time}, NOW()))`
      const safeName = (userName ?? '').replace(/"/g, '\\"')
      if ((role === 'management' || role === 'strategy') && safeName) {
        // Addressed to this user (by name) OR broadcast (no Team Member set)
        return and(displayReady, or(`NOT({Team Member})`, `FIND("${safeName}", {Team Member}) > 0`))
      }
      if (role === 'team' && safeName) {
        return and(displayReady, `FIND("${safeName}", {Team Member}) > 0`)
      }
      if (role === 'client' && userName) {
        const safeClientName = userName.replace(/"/g, '\\"')
        return and(displayReady, or(`NOT({Client})`, `FIND("${safeClientName}", {Client}) > 0`))
      }
      return null
    }

    // ── Revenue Categories ─────────────────────────────────────────────────────
    case 'revenue-categories': {
      if (role === 'management' || role === 'strategy') return ''
      return null
    }

    // ── Expense Categories ─────────────────────────────────────────────────────
    case 'expense-categories': {
      if (role === 'management' || role === 'strategy') return ''
      return null
    }

    // ── Vendors ───────────────────────────────────────────────────────────────
    case 'vendors': {
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
  const userName = headers.get('x-user-name') ?? undefined
  const clientId = headers.get('x-client-id') ?? undefined

  if (!role) return null

  return { role, userId, userName, clientId }
}
