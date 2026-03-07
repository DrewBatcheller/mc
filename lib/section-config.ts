/**
 * Section definitions - what sections exist in the app and their routes.
 * This is NOT fetched from Airtable. It's the app's structure.
 * Permissions control which sections are visible/accessible for each user.
 */

import type { SectionDefinition } from './permission-types'

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  finances: {
    id: 'finances',
    icon: 'DollarSign',
    label: 'Finances',
    routes: ['/finances', '/finances/overview', '/finances/monthly-drilldown', '/finances/pnl', '/finances/dividends', '/finances/reserves', '/finances/revenue', '/finances/expenses'],
  },
  sales: {
    id: 'sales',
    icon: 'Target',
    label: 'Sales',
    routes: ['/sales', '/sales/overview', '/sales/leads', '/sales/kanban', '/sales/tasks'],
  },
  experiments: {
    id: 'experiments',
    icon: 'FlaskConical',
    label: 'Experiments',
    routes: ['/experiments', '/experiments/dashboard', '/experiments/client-tracker', '/experiments/ideas', '/experiments/live-tests', '/experiments/results', '/experiments/timeline'],
  },
  clientDashboard: {
    id: 'clientDashboard',
    icon: 'KanbanSquare',
    label: 'Client Dashboard',
    routes: ['/clients/dashboard', '/clients/test-ideas', '/clients/experiments-overview', '/clients/live-tests', '/clients/results'],
    isFlat: true,  // Special flag for flat sidebar rendering
  },
  management: {
    id: 'management',
    icon: 'UserCircle',
    label: 'Management',
    // Visible to users with 'management' OR 'clients' Airtable permission
    permissionKeys: ['management', 'clients'],
    routes: ['/management', '/management/team-directory', '/management/team-dashboard', '/management/client-directory', '/management/client-dashboard', '/management/forms'],
  },
  team: {
    id: 'team',
    icon: 'Users',
    label: 'Team',
    routes: ['/team', '/team/directory', '/team/schedule'],
  },
  affiliates: {
    id: 'affiliates',
    icon: 'Handshake',
    label: 'Affiliates',
    routes: ['/affiliates'],
  },
}

/**
 * Get section definition by ID
 */
export function getSectionDefinition(sectionId: string): SectionDefinition | undefined {
  return SECTION_DEFINITIONS[sectionId]
}

/**
 * Check if a route is accessible based on permissions.
 * Uses permissionKeys (falls back to [section.id]) to determine access.
 */
export function canAccessRoute(route: string, permissions: Record<string, boolean>): boolean {
  for (const section of Object.values(SECTION_DEFINITIONS)) {
    const keys = section.permissionKeys ?? [section.id]
    if (!keys.some(k => permissions[k])) continue

    for (const routePrefix of section.routes) {
      if (route.startsWith(routePrefix)) {
        return true
      }
    }
  }

  return false
}

/**
 * Get all accessible sections for a user.
 * Uses permissionKeys to allow a section to respond to multiple permission flags.
 * De-duplicates so a section only appears once even if multiple permissionKeys match.
 */
export function getAccessibleSections(permissions: Record<string, boolean>): SectionDefinition[] {
  const seen = new Set<string>()
  const result: SectionDefinition[] = []

  for (const section of Object.values(SECTION_DEFINITIONS)) {
    if (seen.has(section.id)) continue
    const keys = section.permissionKeys ?? [section.id]
    if (keys.some(k => permissions[k])) {
      result.push(section)
      seen.add(section.id)
    }
  }

  return result
}
