import type { UserPermissions } from './permission-types'

// ─── User Roles ──────────────────────────────────────────────────────────────
// Derived from Permissions table: Management, Strategy, Sales, Team, Client
export type UserRole = 'management' | 'strategy' | 'sales' | 'team' | 'client'

// ─── Authenticated User ───────────────────────────────────────────────────────
export interface AuthUser {
  id: string           // Airtable record ID (e.g. recK7qTpHFTSQAO2w)
  email: string
  name: string
  role: UserRole
  department?: string  // Team members: "Management", "Strategy", etc.
  clientId?: string    // Set when role === 'client'
  avatarInitials?: string
  permissions?: UserPermissions  // Fetched from Airtable Permissions table
}

// ─── Stored Session ───────────────────────────────────────────────────────────
export interface AuthSession {
  user: AuthUser
  timestamp: number    // ms since epoch — for expiry checks
}

// ─── Airtable Record ─────────────────────────────────────────────────────────
export interface AirtableRecord<T = Record<string, unknown>> {
  id: string
  fields: T
  createdTime?: string
}

export interface AirtableListResponse<T = Record<string, unknown>> {
  records: AirtableRecord<T>[]
  offset?: string      // pagination cursor
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  data: T
  cached?: boolean
}

export interface ApiError {
  error: string
  status: number
}

// ─── Role-filtered query context ──────────────────────────────────────────────
export interface QueryContext {
  role: UserRole
  userId: string
  clientId?: string
}

// ─── Airtable Table Names ─────────────────────────────────────────────────────
// Maps our resource slugs → Airtable table names
export const TABLE_NAMES = {
  team: 'Team',
  clients: 'Clients',
  contacts: 'Contacts',
  experiments: 'Experiments',
  'experiment-ideas': 'Experiment Ideas',
  batches: 'Batches',
  variants: 'Variants',
  tasks: 'Tasks',
  leads: 'Leads',
  'call-record': 'Call Record',
  revenue: 'Revenue',
  expenses: 'Expenses',
  'profit-loss': 'Profit & Loss',
  reserve: 'Reserve',
  partners: 'Partners',
  permissions: 'Permissions',
  'onboard-qa': 'Onboard QA',
  'revenue-categories': 'Revenue Categories',
  'expense-categories': 'Expense Categories',
  vendors: 'Vendors',
  notifications: 'Notifications',
  dividends: 'Dividends Paid',
  notes: 'Notes',
} as const

export type ResourceSlug = keyof typeof TABLE_NAMES
