import type { UserRole } from './types'

// ─── Section Permissions ──────────────────────────────────────────────────────
// Derived directly from the Permissions table CSV
// Columns: Finances, Sales, Experiments, Clients, Client Dashboard, Management, Team, Affiliates
interface SectionPermissions {
  finances: boolean
  sales: boolean
  experiments: boolean
  clients: boolean
  clientDashboard: boolean
  management: boolean
  team: boolean
  affiliates: boolean
  forms: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, SectionPermissions> = {
  management: {
    finances: true,
    sales: true,
    experiments: true,
    clients: true,
    clientDashboard: true,
    management: true,
    team: false,
    affiliates: true,
    forms: true,
  },
  strategy: {
    finances: false,
    sales: true,
    experiments: true,
    clients: true,
    clientDashboard: true,
    management: true,
    team: false,
    affiliates: true,
    forms: false,
  },
  sales: {
    finances: false,
    sales: true,
    experiments: false,
    clients: false,
    clientDashboard: false,
    management: false,
    team: true,
    affiliates: false,
    forms: false,
  },
  team: {
    finances: false,
    sales: false,
    experiments: true,
    clients: false,
    clientDashboard: false,
    management: false,
    team: true,
    affiliates: false,
    forms: false,
  },
  client: {
    finances: false,
    sales: false,
    experiments: false,
    clients: false,
    clientDashboard: true,
    management: false,
    team: false,
    affiliates: false,
    forms: false,
  },
}

// ─── Nav Items per Role ───────────────────────────────────────────────────────

export interface NavSubItem {
  label: string
  href: string
}

export interface NavSection {
  icon: string  // lucide icon name
  label: string
  href?: string
  subItems?: NavSubItem[]
}

export const NAV_CONFIG: Record<UserRole, NavSection[]> = {
  management: [
    { icon: 'LayoutDashboard', label: 'Dashboard', href: '/' },
    {
      icon: 'DollarSign',
      label: 'Finances',
      subItems: [
        { label: 'Finance Overview', href: '/finances/overview' },
        { label: 'Monthly Drilldown', href: '/finances/monthly-drilldown' },
        { label: 'P&L', href: '/finances/pnl' },
        { label: 'Revenue', href: '/finances/revenue' },
        { label: 'Expenses', href: '/finances/expenses' },
        { label: 'Dividends', href: '/finances/dividends' },
        { label: 'Reserves', href: '/finances/reserves' },
      ],
    },
    {
      icon: 'Target',
      label: 'Sales',
      subItems: [
        { label: 'Overview', href: '/sales/overview' },
        { label: 'Leads', href: '/sales/leads' },
        { label: 'Kanban', href: '/sales/kanban' },
        { label: 'Tasks', href: '/sales/tasks' },
      ],
    },
    {
      icon: 'FlaskConical',
      label: 'Experiments',
      subItems: [
        { label: 'Dashboard', href: '/experiments/dashboard' },
        { label: 'Client Tracker', href: '/experiments/client-tracker' },
        { label: 'Ideas', href: '/experiments/ideas' },
        { label: 'Live Tests', href: '/experiments/live-tests' },
        { label: 'Results', href: '/experiments/results' },
        { label: 'Timeline', href: '/experiments/timeline' },
      ],
    },
    {
      icon: 'Users',
      label: 'Clients',
      subItems: [
        { label: 'Directory', href: '/clients/directory' },
        { label: 'Dashboard', href: '/clients/dashboard' },
      ],
    },
    {
      icon: 'KanbanSquare',
      label: 'Client Dashboard',
      subItems: [
        { label: 'Dashboard', href: '/clients/client-dashboard' },
        { label: 'Test Ideas', href: '/clients/client-ideas' },
        { label: 'Experiments Overview', href: '/clients/experiments-overview' },
        { label: 'Live Tests', href: '/clients/client-live-tests' },
        { label: 'Results', href: '/clients/client-results' },
      ],
    },
    {
      icon: 'UserCircle',
      label: 'Management',
      subItems: [
        { label: 'Team Directory', href: '/management/team-directory' },
        { label: 'Team Dashboard', href: '/management/team-dashboard' },
        { label: 'Schedule', href: '/management/schedule' },
        { label: 'Forms Directory', href: '/management/forms' },
      ],
    },
    { icon: 'Handshake', label: 'Affiliates', href: '/affiliates' },
  ],

  strategy: [
    {
      icon: 'Target',
      label: 'Sales',
      subItems: [
        { label: 'Overview', href: '/sales/overview' },
        { label: 'Leads', href: '/sales/leads' },
        { label: 'Kanban', href: '/sales/kanban' },
        { label: 'Tasks', href: '/sales/tasks' },
      ],
    },
    {
      icon: 'FlaskConical',
      label: 'Experiments',
      subItems: [
        { label: 'Dashboard', href: '/experiments/dashboard' },
        { label: 'Client Tracker', href: '/experiments/client-tracker' },
        { label: 'Ideas', href: '/experiments/ideas' },
        { label: 'Live Tests', href: '/experiments/live-tests' },
        { label: 'Results', href: '/experiments/results' },
        { label: 'Timeline', href: '/experiments/timeline' },
      ],
    },
    {
      icon: 'Users',
      label: 'Clients',
      subItems: [
        { label: 'Directory', href: '/clients/directory' },
        { label: 'Dashboard', href: '/clients/dashboard' },
      ],
    },
    {
      icon: 'KanbanSquare',
      label: 'Client Dashboard',
      subItems: [
        { label: 'Dashboard', href: '/clients/client-dashboard' },
        { label: 'Test Ideas', href: '/clients/client-ideas' },
        { label: 'Experiments Overview', href: '/clients/experiments-overview' },
        { label: 'Live Tests', href: '/clients/client-live-tests' },
        { label: 'Results', href: '/clients/client-results' },
      ],
    },
    {
      icon: 'UserCircle',
      label: 'Management',
      subItems: [
        { label: 'Team Directory', href: '/management/team-directory' },
        { label: 'Team Dashboard', href: '/management/team-dashboard' },
        { label: 'Schedule', href: '/management/schedule' },
      ],
    },
    { icon: 'Handshake', label: 'Affiliates', href: '/affiliates' },
  ],

  sales: [
    {
      icon: 'Target',
      label: 'Sales',
      subItems: [
        { label: 'Overview', href: '/sales/overview' },
        { label: 'Leads', href: '/sales/leads' },
        { label: 'Kanban', href: '/sales/kanban' },
        { label: 'Tasks', href: '/sales/tasks' },
      ],
    },
    {
      icon: 'UserCircle',
      label: 'Team',
      subItems: [
        { label: 'My Dashboard', href: '/team' },
        { label: 'Directory', href: '/team/directory' },
      ],
    },
  ],

  team: [
    {
      icon: 'FlaskConical',
      label: 'Experiments',
      subItems: [
        { label: 'Dashboard', href: '/experiments/dashboard' },
        { label: 'Ideas', href: '/experiments/ideas' },
        { label: 'Live Tests', href: '/experiments/live-tests' },
        { label: 'Results', href: '/experiments/results' },
      ],
    },
    {
      icon: 'UserCircle',
      label: 'Team',
      subItems: [
        { label: 'My Dashboard', href: '/team' },
        { label: 'Schedule', href: '/team/schedule' },
        { label: 'Directory', href: '/team/directory' },
      ],
    },
  ],

  client: [
    {
      icon: 'KanbanSquare',
      label: 'My Dashboard',
      subItems: [
        { label: 'Overview', href: '/clients/client-dashboard' },
        { label: 'Test Ideas', href: '/clients/client-ideas' },
        { label: 'Experiments', href: '/clients/experiments-overview' },
        { label: 'Live Tests', href: '/clients/client-live-tests' },
        { label: 'Results', href: '/clients/client-results' },
      ],
    },
  ],
}

// ─── Default landing page per role ────────────────────────────────────────────
export const DEFAULT_ROUTE: Record<UserRole, string> = {
  management: '/',
  strategy: '/experiments/dashboard',
  sales: '/sales/overview',
  team: '/team',
  client: '/clients/client-dashboard',
}

// ─── Route access rules ───────────────────────────────────────────────────────
// Routes accessible to each role (prefix match)
export const ACCESSIBLE_PREFIXES: Record<UserRole, string[]> = {
  management: ['/'],  // management can access everything
  strategy: [
    '/sales',
    '/experiments',
    '/clients',
    '/affiliates',
    '/management',
    '/forms',
  ],
  sales: ['/sales', '/team', '/forms'],
  team: ['/experiments', '/team', '/forms'],
  client: ['/clients/client-dashboard', '/clients/client-ideas', '/clients/experiments-overview', '/clients/client-live-tests', '/clients/client-results', '/forms'],
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role === 'management') return true
  const prefixes = ACCESSIBLE_PREFIXES[role]
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}
