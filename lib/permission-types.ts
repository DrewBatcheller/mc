/**
 * Permission types derived from Airtable Permissions table.
 * These are fetched dynamically at runtime, not hardcoded.
 */

export interface UserPermissions {
  finances: boolean
  sales: boolean
  experiments: boolean
  clients: boolean
  clientDashboard: boolean
  management: boolean
  team: boolean
  affiliates: boolean
}

export interface PermissionsRecord {
  view: string  // The "View" column - role name (Management, Strategy, Sales, Team, Client)
  permissions: UserPermissions
  recordId: string  // Airtable record ID for reference
}

// Section definition - what sections exist and their routes
export interface SectionDefinition {
  id: string  // Key in permissions object (e.g. 'finances', 'sales')
  icon: string  // Icon name for UI
  label: string  // Display name
  routes: string[]  // Accessible route prefixes (e.g. ['/finances', '/finances/pnl'])
}

export interface DynamicNavItem {
  icon: string
  label: string
  href?: string
  subItems?: Array<{ label: string; href: string }>
}
