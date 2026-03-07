/**
 * Airtable field → app type transformers.
 * Each function takes raw Airtable fields and returns a clean typed object.
 * This is the single source of truth for field mapping.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Pick first element if Airtable returns an array for a linked field */
export function pickFirst<T>(val: T | T[] | undefined): T | undefined {
  if (Array.isArray(val)) return val[0]
  return val
}

/** Join array to string, or return the string as-is */
export function joinArr(val: string | string[] | undefined, sep = ', '): string {
  if (!val) return ''
  if (Array.isArray(val)) return val.join(sep)
  return val
}

/** Parse a dollar string like "$1,234.56" → number */
export function parseCurrency(val: string | number | undefined): number {
  if (typeof val === 'number') return val
  if (!val) return 0
  return parseFloat(String(val).replace(/[$,]/g, '')) || 0
}

/** Format YYYY-MM-DD to readable "Jan 15, 2026" */
export function formatDate(val: string | undefined): string {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return val }
}

/** Format number as USD currency string */
export function formatUSD(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

// ─── Client transform ─────────────────────────────────────────────────────────
export interface AppClient {
  id: string
  brand: string
  status: 'Active' | 'Inactive'
  notes: string
  sentiment: number | null
  totalPaid: number
  monthlyPrice: number
  planType: string
  email: string
  website: string
  developer: string
  designer: string
  strategist: string
  qa: string
  devHours: number | null
  closedDate: string | null
  churnDate: string | null
  churnReason: string | null
  totalTests: number
  successfulTests: number
  winRate: number
  ltv: number
  isTop10: boolean
  slackChannelId: string
  avatar: string | null
}

export function transformClient(id: string, f: Record<string, unknown>): AppClient {
  return {
    id,
    brand: String(f['Brand Name'] ?? ''),
    status: f['Client Status'] === 'Active' ? 'Active' : 'Inactive',
    notes: String(f['Notes'] ?? ''),
    sentiment: f['Sentiment'] != null ? Number(f['Sentiment']) : null,
    totalPaid: parseCurrency(f['TotalPaid'] as string),
    monthlyPrice: parseCurrency(f['Monthly Price'] as string),
    planType: String(f['Plan Type'] ?? ''),
    email: String(f['Email'] ?? ''),
    website: String(f['Website'] ?? ''),
    developer: joinArr(f['Full Name (from Developer)'] as string[]),
    designer: joinArr(f['Full Name (from Designer)'] as string[]),
    strategist: joinArr(f['Full Name (from Strategist)'] as string[]),
    qa: joinArr(f['Full Name (from QA)'] as string[]),
    devHours: f['Development Hours Assigned'] != null ? Number(f['Development Hours Assigned']) : null,
    closedDate: f['Initial Closed Date'] ? String(f['Initial Closed Date']) : null,
    churnDate: f['Churn Date'] ? String(f['Churn Date']) : null,
    churnReason: f['Churn Reason'] ? String(f['Churn Reason']) : null,
    totalTests: Number(f['Total Tests Run'] ?? 0),
    successfulTests: Number(f['Successful Tests'] ?? 0),
    winRate: parseCurrency(f['Test Win Rate (%)'] as string),
    ltv: parseCurrency(f['LTV'] as string),
    isTop10: Boolean(f['Is Top 10']),
    slackChannelId: String(f['Slack Channel ID'] ?? ''),
    avatar: f['Avatar'] ? (f['Avatar'] as Array<{ url: string }>)?.[0]?.url ?? null : null,
  }
}

// ─── Experiment transform ─────────────────────────────────────────────────────
export interface AppExperiment {
  id: string
  name: string
  client: string
  clientId: string
  batchId: string
  status: string
  launchDate: string | null
  endDate: string | null
  strategist: string
  developer: string
  qa: string
  designer: string
  hypothesis: string
  rationale: string
  placement: string
  placementUrl: string
  variantsWeight: string
  primaryGoals: string[]
  devices: string
  geos: string
  revenueAdded: number
  revenueAddedFormatted: string
  goalMetric1: string
  metric1Increase: string
  goalMetric2: string
  metric2Increase: string
  confidenceLevel: string
  nextSteps: string
  whatHappened: string
  deployed: boolean
  figmaUrl: string
  postTestLoom: string
}

export function transformExperiment(id: string, f: Record<string, unknown>): AppExperiment {
  const goals = f['Category Primary Goals']
    ? (Array.isArray(f['Category Primary Goals'])
        ? f['Category Primary Goals']
        : String(f['Category Primary Goals']).split(',').map((s: string) => s.trim()))
    : []

  return {
    id,
    name: String(f['Test Description'] ?? ''),
    client: joinArr(f['Brand Name'] as string[] ?? f['Brand Name'] as string[]),
    clientId: joinArr((f['Client'] as string[]) ?? []),
    batchId: joinArr((f['Batch Record ID'] as string[]) ?? (f['Batch'] as string[]) ?? []),
    status: String(f['Test Status'] ?? ''),
    launchDate: (f['Launch Date Override'] || f['Launch Date']) ? String(f['Launch Date Override'] || f['Launch Date']) : null,
    endDate: (f['End Date Override'] || f['End Date']) ? String(f['End Date Override'] || f['End Date']) : null,
    strategist: joinArr(f['Full Name (from Strategist)'] as string[]),
    developer: joinArr(f['Full Name (from Developer)'] as string[]),
    qa: joinArr(f['Full Name (from QA)'] as string[]),
    designer: joinArr(f['Full Name (from Designer)'] as string[]),
    hypothesis: String(f['Hypothesis'] ?? ''),
    rationale: String(f['Rationale'] ?? ''),
    placement: String(f['Placement'] ?? ''),
    placementUrl: String(f['Placement URL'] ?? ''),
    variantsWeight: String(f['Variants Weight'] ?? '50/50'),
    primaryGoals: goals as string[],
    devices: String(f['Devices'] ?? 'All Devices'),
    geos: joinArr(f['GEOs'] as string[] | string),
    revenueAdded: parseCurrency(f['Revenue Added (MRR) (Regular Format)'] as string),
    revenueAddedFormatted: String(f['Revenue Added (MRR)'] ?? '$0'),
    goalMetric1: String(f['Goal Metric 1'] ?? ''),
    metric1Increase: String(f['Metric #1 Increase'] ?? ''),
    goalMetric2: String(f['Goal Metric 2'] ?? ''),
    metric2Increase: String(f['Metric #2 Increase'] ?? ''),
    confidenceLevel: String(f['Confidence Level'] ?? ''),
    nextSteps: String(f['Next Steps (Action)'] ?? ''),
    whatHappened: String(f['Describe what happened & what we learned'] ?? ''),
    deployed: Boolean(f['Deployed']),
    figmaUrl: String(f['FIGMA Url'] ?? ''),
    postTestLoom: String(f['Post-Test Analysis (Loom)'] ?? ''),
  }
}

// ─── Batch transform ──────────────────────────────────────────────────────────
export interface AppBatch {
  id: string
  key: string
  client: string
  clientId: string
  launchDate: string | null
  status: string
  revenueAdded: number
  experimentCount: number
  testIdeasDue: string | null
  designDue: string | null
  devDue: string | null
  qaDue: string | null
  ptaDue: string | null
  linkedTests: string[]
}

export function transformBatch(id: string, f: Record<string, unknown>): AppBatch {
  const linkedTests = f['Linked Test Names']
    ? (Array.isArray(f['Linked Test Names']) ? f['Linked Test Names'] : String(f['Linked Test Names']).split(','))
    : []
  return {
    id,
    key: String(f['Batch Key'] ?? ''),
    client: joinArr(f['Client'] as string[] ?? f['Brand Name'] as string[]),
    clientId: joinArr((f['Client'] as string[]) ?? []),
    launchDate: f['Launch Date'] ? String(f['Launch Date']) : null,
    status: String(f['All Tests Status'] ?? f['Last Test Status'] ?? ''),
    revenueAdded: parseCurrency(f['Revenue Added (MRR)'] as string),
    experimentCount: (f['Experiments Attached'] as string[] ?? []).length,
    testIdeasDue: f['Test Ideas Due Date'] ? String(f['Test Ideas Due Date']) : null,
    designDue: f['Design Due Date'] ? String(f['Design Due Date']) : null,
    devDue: f['Dev Due Date'] ? String(f['Dev Due Date']) : null,
    qaDue: f['QA Due Date'] ? String(f['QA Due Date']) : null,
    ptaDue: f['PTA Due Date'] ? String(f['PTA Due Date']) : null,
    linkedTests: linkedTests as string[],
  }
}

// ─── Variant transform ────────────────────────────────────────────────────────
export interface AppVariant {
  id: string
  name: string
  experimentId: string
  status: string
  variantId: string
  previewUrl: string
  trafficPct: number
  visitors: number
  conversions: number
  revenue: number
  revenueImpPct: number
  crPct: number
  crImpPct: number
  rpv: number
  rpvImpPct: number
  aov: number
}

export function transformVariant(id: string, f: Record<string, unknown>): AppVariant {
  return {
    id,
    name: String(f['Variant Name'] ?? ''),
    experimentId: joinArr((f['Experiments'] as string[]) ?? []),
    status: String(f['Status'] ?? ''),
    variantId: String(f['Variant ID'] ?? ''),
    previewUrl: String(f['Preview URL'] ?? ''),
    trafficPct: Number(f['Traffic %'] ?? 50),
    visitors: Number(f['Visitors'] ?? 0),
    conversions: Number(f['Conversions'] ?? 0),
    revenue: parseCurrency(f['Revenue'] as string),
    revenueImpPct: Number(f['Revenue Improvement %'] ?? 0),
    crPct: Number(f['CR %'] ?? 0),
    crImpPct: Number(f['CR Improvement %'] ?? 0),
    rpv: Number(f['RPV'] ?? 0),
    rpvImpPct: Number(f['RPV Improvement %'] ?? 0),
    aov: Number(f['AOV'] ?? 0),
  }
}

// ─── Experiment Idea transform ─────────────────────────────────────────────────
export interface AppIdea {
  id: string
  name: string
  client: string
  clientId: string
  hypothesis: string
  rationale: string
  placement: string
  placementUrl: string
  primaryGoals: string[]
  devices: string
  geos: string
  figmaUrl: string
  designBrief: string
  devBrief: string
}

export function transformIdea(id: string, f: Record<string, unknown>): AppIdea {
  const goals = f['Primary Goals']
    ? (Array.isArray(f['Primary Goals'])
        ? f['Primary Goals']
        : String(f['Primary Goals']).split(',').map((s: string) => s.trim()))
    : []
  return {
    id,
    name: String(f['Test Description'] ?? ''),
    client: joinArr(f['Client'] as string[]),
    clientId: joinArr((f['Client'] as string[]) ?? []),
    hypothesis: String(f['Hypothesis'] ?? ''),
    rationale: String(f['Rationale'] ?? ''),
    placement: String(f['Placement'] ?? ''),
    placementUrl: String(f['Placement URL'] ?? ''),
    primaryGoals: goals as string[],
    devices: String(f['Devices'] ?? 'All Devices'),
    geos: joinArr(f['GEOs'] as string[] | string),
    figmaUrl: String(f['FIGMA URL'] ?? ''),
    designBrief: String(f['Design Brief'] ?? ''),
    devBrief: String(f['Development Brief'] ?? ''),
  }
}

// ─── Task transform ───────────────────────────────────────────────────────────
export interface AppTask {
  id: string
  name: string
  clientFacingName: string
  client: string
  clientId: string
  department: string
  startDate: string | null
  dueDate: string | null
  status: string
  assignedTo: string
  batchId: string
  linkedTests: string[]
}

export function transformTask(id: string, f: Record<string, unknown>): AppTask {
  return {
    id,
    name: String(f['Team Facing Name'] ?? ''),
    clientFacingName: String(f['Client Facing Name'] ?? ''),
    client: joinArr(f['Brand Name'] as string[] ?? f['Client'] as string[]),
    clientId: joinArr((f['Client'] as string[]) ?? []),
    department: String(f['Department'] ?? ''),
    startDate: f['Start Date'] ? String(f['Start Date']) : null,
    dueDate: f['Due Date'] ? String(f['Due Date']) : null,
    status: String(f['Status'] ?? ''),
    assignedTo: joinArr(f['Assigned to'] as string[]),
    batchId: joinArr((f['Batch'] as string[]) ?? []),
    linkedTests: Array.isArray(f['Linked Test Names'])
      ? f['Linked Test Names'] as string[]
      : [],
  }
}

// ─── Lead transform ───────────────────────────────────────────────────────────
export interface AppLead {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  company: string
  phone: string
  stage: string
  status: string
  timezone: string
  dealValue: number
  source: string
  medium: string
  created: string | null
  lastContact: string | null
  jobTitle: string
  website: string
  clientId: string | null
}

export function transformLead(id: string, f: Record<string, unknown>): AppLead {
  return {
    id,
    email: String(f['Email'] ?? ''),
    name: String(f['Full Name'] ?? `${f['First Name'] ?? ''} ${f['Last Name'] ?? ''}`.trim()),
    firstName: String(f['First Name'] ?? ''),
    lastName: String(f['Last Name'] ?? ''),
    company: String(f['Company'] ?? ''),
    phone: String(f['Phone Number'] ?? ''),
    stage: String(f['Stage'] ?? 'Open'),
    status: String(f['Lead Status'] ?? 'Fresh'),
    timezone: String(f['Timezone'] ?? ''),
    dealValue: parseCurrency(f['Deal Value'] as string),
    source: String(f['UTM Source'] ?? ''),
    medium: String(f['UTM Medium'] ?? ''),
    created: f['Date Created'] ? String(f['Date Created']) : null,
    lastContact: f['Last Contact'] ? String(f['Last Contact']) : null,
    jobTitle: String(f['Job Title'] ?? ''),
    website: String(f['Company'] ?? ''),
    clientId: f['Link to Client'] ? joinArr(f['Link to Client'] as string[]) : null,
  }
}

// ─── Team member transform ────────────────────────────────────────────────────
export interface AppTeamMember {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  status: string
  slackId: string
  avatar: string | null
}

export function transformTeamMember(id: string, f: Record<string, unknown>): AppTeamMember {
  return {
    id,
    name: String(f['Full Name'] ?? ''),
    firstName: String(f['First Name'] ?? ''),
    lastName: String(f['Last Name'] ?? ''),
    email: String(f['Email'] ?? ''),
    department: String(f['Department'] ?? ''),
    role: String(f['Role'] ?? ''),
    status: f['Employment Status'] === 'Active' ? 'Active' : 'Inactive',
    slackId: String(f['Slack Member ID'] ?? ''),
    avatar: f['Profile Photo'] ? (f['Profile Photo'] as Array<{ url: string }>)?.[0]?.url ?? null : null,
  }
}

// ─── Revenue transform ────────────────────────────────────────────────────────
export interface AppRevenue {
  id: string
  client: string
  clientId: string
  date: string | null
  amountUsd: number
  feesUsd: number
  finalAmountUsd: number
  amountCad: number
  feesCad: number
  category: string
  monthYear: string
  isRecurring: boolean
}

export function transformRevenue(id: string, f: Record<string, unknown>): AppRevenue {
  return {
    id,
    client: joinArr(f['Brand Name'] as string[] ?? f['Client'] as string[]),
    clientId: joinArr((f['Client'] as string[]) ?? []),
    date: f['Date'] ? String(f['Date']) : null,
    amountUsd: parseCurrency(f['Amount USD'] as string),
    feesUsd: parseCurrency(f['Fees USD'] as string),
    finalAmountUsd: parseCurrency(f['Final Amount USD'] as string),
    amountCad: parseCurrency(f['Amount CAD'] as string),
    feesCad: parseCurrency(f['Fees CAD'] as string),
    category: String(f['Category'] ?? ''),
    monthYear: String(f['Month & Year'] ?? ''),
    isRecurring: Boolean(f['Monthly Recurring Revenue']),
  }
}

// ─── Expense transform ────────────────────────────────────────────────────────
export interface AppExpense {
  id: string
  expense: number
  date: string | null
  vendor: string
  category: string
  monthYear: string
  recurring: boolean
  reimbursed: boolean
}

export function transformExpense(id: string, f: Record<string, unknown>): AppExpense {
  return {
    id,
    expense: parseCurrency(f['Expense'] as string),
    date: f['Date'] ? String(f['Date']) : null,
    vendor: String(f['Vendor'] ?? f['Statement Name'] ?? ''),
    category: String(f['Category'] ?? ''),
    monthYear: String(f['Month & Year'] ?? ''),
    recurring: Boolean(f['Recurring?']),
    reimbursed: Boolean(f['Reimbursed']),
  }
}

// ─── Contact transform ────────────────────────────────────────────────────────
export interface AppContact {
  id: string
  name: string
  email: string
  client: string
  clientId: string
  userType: string
  slackId: string
  website: string
}

export function transformContact(id: string, f: Record<string, unknown>): AppContact {
  return {
    id,
    name: String(f['Full Name'] ?? ''),
    email: String(f['User Email'] ?? ''),
    client: joinArr(f['Brand Name'] as string[]),
    clientId: joinArr((f['Brand Name'] as string[]) ?? []),
    userType: String(f['User Type'] ?? ''),
    slackId: String(f['Slack Member ID'] ?? ''),
    website: String(f['Company Website'] ?? ''),
  }
}

// ─── P&L transform ────────────────────────────────────────────────────────────
export interface AppPnL {
  id: string
  month: string
  year: string
  totalRevenue: number
  totalExpenses: number
  grossProfit: number
  operatingMargin: number
  netProfit: number
}

export function transformPnL(id: string, f: Record<string, unknown>): AppPnL {
  return {
    id,
    month: String(f['Month'] ?? ''),
    year: String(f['Year'] ?? ''),
    totalRevenue: parseCurrency(f['Total Revenue'] as string),
    totalExpenses: parseCurrency(f['Total Expenses'] as string),
    grossProfit: parseCurrency(f['Gross Profit'] as string),
    operatingMargin: parseCurrency(f['Operating Margin'] as string),
    netProfit: parseCurrency(f['Net Profit'] as string),
  }
}

// ─── Reserve transform ────────────────────────────────────────────────────────
export interface AppReserve {
  id: string
  allocation: string
  amount: number
  category: string
  description: string
  date: string | null
}

export function transformReserve(id: string, f: Record<string, unknown>): AppReserve {
  return {
    id,
    allocation: String(f['Allocation'] ?? ''),
    amount: parseCurrency(f['Allocated Amount'] as string),
    category: String(f['Category'] ?? ''),
    description: String(f['Description'] ?? ''),
    date: f['Date'] ? String(f['Date']) : null,
  }
}
