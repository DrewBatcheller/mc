// ==========================================
// Airtable Record Types for All Tables
// ==========================================

// Base Airtable record wrapper
export interface AirtableRecord<T> {
  id: string
  fields: T
  createdTime: string
}

export interface AirtableResponse<T> {
  records: AirtableRecord<T>[]
  offset?: string
}

// ==========================================
// Clients Table
// ==========================================
export interface ClientFields {
  "Brand Name": string
  Website?: string
  Status?: string
  "Contact Name"?: string
  "Contact Phone"?: string
  "Contact Email"?: string
  "Account Manager"?: string
  "Fathom Qualifying Call Summary URL"?: string
  "Fathom Sales Call Summary URL"?: string
  "Fathom Onboarding Call"?: string
  "Shopify Shop URL"?: string
  TotalPaid?: string
  "Experiment Ideas"?: string[] // linked record IDs
  Experiments?: string[] // linked record IDs
  Batches?: string[] // linked record IDs
  Revenue?: string[] // linked record IDs
  "Total Tests Run"?: number
  "Successful Tests"?: number
  "Test Win Rate"?: number
  "Test Win Rate (%)"?: number
  Tasks?: string[] // linked record IDs
  "Total Spent"?: string
  "Revenue Added (MRR) (K Format ) Rollup (from Experiments)"?: string
  "ROI %"?: string
  "ROI $"?: string
  "Convert Project ID"?: string
  "Convert Account ID"?: string
  "Call Record"?: string[] // linked record IDs
  "Record ID"?: string
  "Associated Lead"?: string
  LTV?: string
  "Is Top 10"?: boolean
  Contacts?: string[] // linked record IDs to Contacts table
  Avatar?: Array<{ url: string; thumbnails?: { small: { url: string }; large: { url: string } } }>
  Strategist?: string[] // linked record IDs
  Designer?: string[] // linked record IDs
  Developer?: string[] // linked record IDs
  QA?: string[] // linked record IDs
  "Full Name (from Strategist)"?: string[]
  "Full Name (from Designer)"?: string[]
  "Full Name (from Developer)"?: string[]
  "Full Name (from QA)"?: string[]
}

// ==========================================
// Contacts Table
// ==========================================
export interface ContactFields {
  "Full Name": string
  "User Email"?: string
  "Record ID"?: string
  "Brand Name"?: string[] // linked record IDs to Clients table
  "Brand Name (from Brand Name)"?: string[] // lookup field with client names
  "Call Record (from Brand Name)"?: string[]
  "User Type"?: string
  "User Slack Member ID"?: string
  "Company Slack Channel ID"?: string
  "Company Website"?: string
  "Create Contact TS ID"?: string
  "Receive Notifications"?: boolean
  Avatar?: Array<{ url: string; thumbnails?: { small: { url: string }; large: { url: string } } }>
}

// ==========================================
// Team Table
// ==========================================
export interface TeamFields {
  "Full Name": string
  "First Name"?: string
  "Last Name"?: string
  Collaborator?: string
  "Slack Member ID"?: string
  Select?: string // Employment type
  "Employment Status"?: string
  Department?: string
  Email?: string
  Password?: string
  "Profile Photo"?: Array<{ url: string; thumbnails?: { small: { url: string }; large: { url: string } } }>
  Notes?: string
  "Time Off (Start)"?: string
  "Time Off (End)"?: string
  "Time Off (Replacement)"?: string
  Expenses?: string[]
  Experiments?: string[]
  "Team Member Record ID"?: string
  "Dev Client Link"?: string[]
  "Design Client Link"?: string[]
  "Strategist Client Link"?: string[]
  "QA Client Link"?: string[]
  "Call Record"?: string[]
}

// ==========================================
// Experiments Table
// ==========================================
export interface ExperimentFields {
  "Test Description": string
  Batch?: string[] // linked record IDs
  "Batch Record ID"?: string[]
  "Brand Name"?: string[] // linked, shows name
  "Record ID (from Brand Name)"?: string[]
  "Test Status"?: string
  "PTA 1 Wk"?: string
  "PTA 2 Wk"?: string
  "Launch Date"?: string
  "End Date"?: string
  "Launch Date Override"?: string
  "End Date Override"?: string
  "Launch Date From Batch"?: string
  Strategist?: string
  Developer?: string
  QA?: string
  Designer?: string
  Hypothesis?: string
  Rationale?: string
  Placement?: string
  "Placement URL"?: string
  "Variants Weight"?: string
  "Category Primary Goals"?: string
  "Design Brief"?: string
  "Development Brief"?: string
  "Media/Links"?: string
  "GEOs Flags"?: string
  GEOs?: string
  Devices?: string
  "Walkthrough Video URL"?: string
  "Client Approval"?: string
  "FIGMA Url"?: string
  "QA Report"?: string
  "Dev QA Message Toggle"?: string
  "QA Passed"?: boolean | string
  "PTA 1 Wk Loom URL"?: string
  "Post-Test Analysis (Loom)"?: string
  "Describe what happened & what we learned"?: string
  "Next Steps (Action)"?: string
  "Revenue Added (MRR) (K Format )"?: string
  "Revenue Added (MRR) (M Format)"?: string
  "Revenue Added (MRR) (Regular Format)"?: string
  "Goal Metric 1"?: string
  "Metric #1 Increase"?: string
  "Goal Metric 2"?: string
  "Metric #2 Increase"?: string
  "Confidence Level"?: string
  "Segment Deploy Applied to"?: string
  "Image Type"?: string
  "Control Image"?: Array<{ url: string; thumbnails?: any }>
  "Variant Image"?: Array<{ url: string; thumbnails?: any }>
  "Post-Test Analysis (Image)"?: Array<{ url: string; thumbnails?: any }>
  Deployed?: boolean
  "Last Modified"?: string
  "Last Modified By"?: string
  "Variants (Link)"?: string[] // linked record IDs
  Variants?: string
  "Rejection Reason"?: string
  "Convert Experiment ID"?: string
  "Record ID"?: string
}

// ==========================================
// Batches Table
// ==========================================
export interface BatchFields {
  "Batch Key": string
  "Launch Design"?: string
  "Launch Development"?: string
  "Record ID"?: string
  "Brand Name"?: string // lookup
  Client?: string[] // linked record IDs
  "Record ID (from Client)"?: string[]
  "Launch Date"?: string
  "Experiments Attached"?: string[] // linked record IDs
  "Experiments Record ID"?: string
  Locked?: string
  "All Tests Status"?: string
  "Last Test Status"?: string
  "Linked Test Names"?: string
  "Revenue Added (MRR)"?: string
  "Days Delayed"?: number
  "Cumulative Revenue"?: number
  "Test Ideas Start Date"?: string
  "Roadmap Loom Due Date"?: string
  "Test Ideas Due Date"?: string
  "Design Start Date"?: string
  "Design Due Date"?: string
  "Dev Start Date"?: string
  "Dev Due Date"?: string
  "QA Start Date"?: string
  "QA Due Date"?: string
  "QA Due Date Nice"?: string
  "PTA 1 WK Start"?: string
  "PTA 1 WK Due"?: string
  "PTA (Scheduled Finish)"?: string
  "PTA Due Date"?: string
  "Designer (from Experiments Attached)"?: string
  "Developer (from Experiments Attached)"?: string
  "Strategist (from Experiments Attached)"?: string
  "QA (from Experiments Attached)"?: string
  maketasks?: string
}

// ==========================================
// Experiment Ideas Table
// ==========================================
export interface ExperimentIdeaFields {
  "Test Description": string
  Client?: string[] // linked record IDs
  Hypothesis?: string
  Rationale?: string
  "Walkthrough Video URL"?: string
  Placement?: string
  "Placement URL"?: string
  "Variants Weight"?: string
  "Primary Goals"?: string
  "Design Brief"?: string
  "Development Brief"?: string
  "Media/Links"?: string
  GEOs?: string
  Devices?: string
  "FIGMA Url"?: string
  "QA Report"?: string
  "QA Passed"?: boolean
  "PTA 1 Wk Loom URL"?: string
  "Post-Test Analysis (Loom)"?: string
  "Describe what happened & what we learned"?: string
  "Next Steps (Action)"?: string
  "Revenue Added (MRR) (K Format )"?: string
  "Goal Metric 1"?: string
  "Metric #1 Increase"?: string
  "Goal Metric 2"?: string
  "Metric #2 Increase"?: string
  "Confidence Level"?: string
  "Segment Deploy Applied to"?: string
  "Image Type"?: string
  "Control Image"?: Array<{ url: string; thumbnails?: any }>
  "Variant Image"?: Array<{ url: string; thumbnails?: any }>
  "Post-Test Analysis (Image)"?: Array<{ url: string; thumbnails?: any }>
  "Convert Experiment ID"?: string
  "Created By"?: string
  "Sync to Schedule"?: string
  Delete?: string
  "Reason For Reject"?: string
}

// ==========================================
// Tasks Table
// ==========================================
export interface TaskFields {
  "Team Facing Name": string
  "Client Facing Name"?: string
  Lead?: string[]
  Client?: string[] // linked record IDs
  "Call Record"?: string[]
  Department?: string
  "Start Date"?: string
  "Due Date"?: string
  Duration?: number
  Batch?: string[] // linked record IDs
  "Linked Test Names (from Batch)"?: string
  Status?: string
  "Designer (from Experiments Attached) (from Batch)"?: string
  "Developer (from Experiments Attached) (from Batch)"?: string
  "Strategist (from Experiments Attached) (from Batch)"?: string
  "QA (from Experiments Attached) (from Batch)"?: string
  "Assigned to"?: string
  "Manual sort"?: string
  "Brand Name (from Batch)"?: string
  "Open URL"?: string
}

// ==========================================
// Variants Table
// ==========================================
export interface VariantFields {
  ID?: number
  "Variant Name": string
  Status?: string
  Experiments?: string[] // linked record IDs
  "Test Description (from Experiments)"?: string
  "Batch (from Experiments)"?: string
  "Batch Record ID (from Experiments)"?: string
  "Variant ID"?: string
  "Preview URL"?: string
  "Traffic %"?: string
  Visitors?: number
  Conversions?: number
  Revenue?: string
  "Revenue Improvement %"?: string
  AOV?: string
  "CR %"?: string
  "CR Improvement %"?: string
  "CR Improvement Confidence"?: string
  RPV?: string
  "RPV Improvement %"?: string
  "RPV Improvement Confidence"?: string
  APPV?: string
  "APPV Improvement %"?: string
  "Open URL"?: string
}

// ==========================================
// Leads Table
// ==========================================
export interface LeadFields {
  Email?: string
  "First Name"?: string
  "Last Name"?: string
  "Full Name"?: string
  Website?: string
  "Company / Brand Name"?: string
  "Phone Number"?: number
  "Date Created"?: string
  "Job Title"?: string
  Status?: string
  Timezone?: string
  Stage?: string
  "Last Contact"?: string
  "Lead Scoring"?: number
  "UTM Source"?: string
  "UTM Medium"?: string
  "UTM Campaign"?: string
  "UTM Content"?: string
  "UTM Term"?: string
  "Convert Lead to Client"?: string
  "Lead Status"?: string
  Calculation?: string
  "Onboarding Form URL"?: string
  "Link to Client"?: string[]
}

// ==========================================
// Call Record Table
// ==========================================
export interface CallRecordFields {
  "Event Name"?: string
  Client?: string[] // linked record IDs
  Lead?: string
  "Team Members"?: string
  "Client Email"?: string
  "Client Full Name"?: string
  "Event URL"?: string
  "Event Subtype"?: string
  "Event Type"?: string
  "Created At"?: string
  "Updated At"?: string
  "Event Start Time"?: string
  "Join URL"?: string
  "Meeting URI"?: string
  "Tracking URI"?: string
  "Time Zone"?: string
  "Record ID"?: string
  "Fathom URL"?: string
  "Fathom Share URL"?: string
  "Recording Start Time"?: string
  "Recording End Time"?: string
  Tasks?: string[]
}

// ==========================================
// Revenue Table
// ==========================================
export interface RevenueFields {
  Entry?: string
  Client?: string
  Date?: string
  "Amount USD"?: string
  "Fees USD"?: string
  "Conversion Rate (USD>CAD)"?: string
  "Amount CAD"?: string
  "Fees CAD"?: string
  Category?: string
  "Month & Year"?: string
  "Profit & Loss"?: string
  Notes?: string
  "Monthly Recurring Revenue"?: string
  "Upsell Revenue"?: string
  "Is Top 10 (from Client)"?: string
}

// ==========================================
// Expenses Table
// ==========================================
export interface ExpenseFields {
  Expense?: string
  Date?: string
  "Statement Name"?: string
  Notes?: string
  Vendor?: string
  Category?: string
  "Category-Month Key"?: string
  "Month & Year"?: string
  "Profit & Loss"?: string
  "Invoice/Receipt"?: Array<{ url: string }>
  "Recurring?"?: string
  Reimbursed?: string
  "FT Employee"?: string
  "Op Expense"?: string
}

// ==========================================
// P&L (Profit & Loss) Table
// ==========================================
export interface PLFields {
  "Month & Year": string
  "Total Revenue": number
  "Total MRR": number
  "Total Upsell": number
  "Total Other": number
  "Total Expenses": number
  "Total COGS": number
  "Total Operating": number
  EBITDA: number
  Depreciation: number
  EBIT: number
  "Interest (Expense)": number
  EBT: number
  Taxes: number
  "Net Income": number
  "Operating Margin %": number
  "EBITDA Margin %": number
  "Gross Margin %": number
  "Net Margin %": number
}

// ==========================================
// Dividends Table
// ==========================================
export interface DividendFields {
  Label?: string
  "Dividends Total"?: number | string | number[]
  Connor?: number | string | number[]
  "Connor Paid"?: string
  Jayden?: number | string | number[]
  "Jayden Paid"?: string
  "Profit & Loss (Link)"?: string[]
  "Month & Year (from Profit & Loss (Link))"?: string
}

// ==========================================
// Reserve (Allocations) Table
// ==========================================
export interface ReserveFields {
  "Category & Date"?: string
  "Month & Year"?: string[]
  "Month & Year (from Month & Year)"?: string
  "Transaction Type"?: string
  Category?: string[]
  "Category (from Category)"?: string
  "% Allocation"?: string
  "Allocated Amount"?: number | string
  "Account Balance*"?: number | string
  "Actual Allocation*"?: number | string
  "Allocation Transferred"?: string
  "New Account Balance"?: number | string
  "Variance $"?: string
  Variance?: string
}

// ==========================================
// User Role Types
// ==========================================
export type UserRole = "management" | "team" | "client"

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  teamRecordId?: string
  clientRecordId?: string
  avatar?: string
  department?: string
}
