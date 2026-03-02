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
  clients: {
    id: 'clients',
    icon: 'Users',
    label: 'Clients',
    routes: ['/clients', '/clients/directory', '/clients/dashboard'],
  },
  clientDashboard: {
    id: 'clientDashboard',
    icon: 'KanbanSquare',
    label: 'Client Dashboard',
    routes: ['/clients/client-dashboard', '/clients/client-ideas', '/clients/experiments-overview', '/clients/client-live-tests', '/clients/client-results'],
    isFlat: true,  // Special flag for flat sidebar rendering
  },
  management: {
    id: 'management',
    icon: 'UserCircle',
    label: 'Management',
    routes: ['/management', '/management/team-directory', '/management/team-dashboard'],
  },
  team: {
    id: 'team',
    icon: 'Users',
    label: 'Team',
    routes: ['/team', '/team/dashboard', '/team/directory', '/team/team-dashboard'],
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
 * Check if a route is accessible based on permissions
 * Returns true if the route starts with any of the user's accessible prefixes
 */
export function canAccessRoute(route: string, permissions: Record<string, boolean>): boolean {
  for (const [sectionId, allowed] of Object.entries(permissions)) {
    if (!allowed) continue
    
    const section = getSectionDefinition(sectionId)
    if (!section) continue
    
    for (const routePrefix of section.routes) {
      if (route.startsWith(routePrefix)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Get all accessible sections for a user
 */
export function getAccessibleSections(permissions: Record<string, boolean>): SectionDefinition[] {
  return Object.entries(permissions)
    .filter(([_, allowed]) => allowed)
    .map(([sectionId, _]) => getSectionDefinition(sectionId))
    .filter((section): section is SectionDefinition => section !== undefined)
}
