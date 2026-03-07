/**
 * Form Registry — typed definitions for all hosted forms.
 *
 * Used by the management Forms Directory page to render the form catalog.
 * Each entry describes a form's metadata without importing the actual component.
 *
 * Forms are listed in CHRONOLOGICAL WORKFLOW ORDER — the order a batch moves
 * through the pipeline: Onboarding → Ideation → Design → Development/QA → PTA.
 */

export type FormEntityType = 'lead' | 'client' | 'batch' | 'experiment'

export type FormPhase =
  | 'onboarding'
  | 'ideation'
  | 'design'
  | 'development'
  | 'pta'

export const PHASE_META: Record<FormPhase, { label: string; description: string }> = {
  onboarding:  { label: 'Onboarding',        description: 'Client setup, contacts, and tooling configuration' },
  ideation:    { label: 'Ideation',           description: 'Test idea submission and client approval' },
  design:      { label: 'Design',             description: 'Mockup submission, strategy review, and client approval' },
  development: { label: 'Development & QA',   description: 'Experiment setup in Convert.com and quality assurance' },
  pta:         { label: 'Post-Test Analysis',  description: 'Experiment results check-ins and final analysis' },
}

/** Ordered list of phases — matches the workflow pipeline. */
export const PHASE_ORDER: FormPhase[] = [
  'onboarding',
  'ideation',
  'design',
  'development',
  'pta',
]

export interface FormDefinition {
  slug: string                   // URL slug — /forms/{slug}?id=recXXX
  name: string                   // Display name
  description: string            // Short description of what the form does
  entityType: FormEntityType     // What kind of record ID goes in the ?id= param
  entityLabel: string            // Human-readable label for the entity, e.g. "Lead ID"
  hasDelayTracking: boolean      // Whether this form tracks overdue submissions
  delayDueDateField?: string     // Airtable field name for the due date (if delay tracking)
  icon: string                   // Lucide icon name
  status: 'live' | 'building' | 'planned'  // Build status
  phase: FormPhase               // Workflow phase this form belongs to
  order: number                  // Sort order within the workflow (1-based)
}

// ─── Form Definitions — Chronological Workflow Order ──────────────────────────

export const FORM_DEFINITIONS: FormDefinition[] = [
  // ── Onboarding ─────────────────────────────────────────────────────────────
  {
    slug: 'convert-lead',
    name: 'Convert Lead to Client',
    description: 'Convert a qualified lead into an active client with team assignment, plan type, and dashboard access.',
    entityType: 'lead',
    entityLabel: 'Lead ID',
    hasDelayTracking: false,
    icon: 'UserCircle',
    status: 'live',
    phase: 'onboarding',
    order: 1,
  },
  {
    slug: 'add-contact',
    name: 'Add Contacts to Client',
    description: 'Add, edit, or remove contacts for a client. Send via Slack link with the client record ID.',
    entityType: 'client',
    entityLabel: 'Client ID',
    hasDelayTracking: false,
    icon: 'Users',
    status: 'live',
    phase: 'onboarding',
    order: 2,
  },
  {
    slug: 'submit-project-id',
    name: 'Submit Convert.com Project ID',
    description: 'Developer submits the Convert.com Project ID (and optional Account ID) for a client.',
    entityType: 'client',
    entityLabel: 'Client ID',
    hasDelayTracking: false,
    icon: 'Target',
    status: 'live',
    phase: 'onboarding',
    order: 3,
  },

  // ── Ideation ───────────────────────────────────────────────────────────────
  {
    slug: 'submit-ideas',
    name: 'Submit Test Ideas to Batch',
    description: 'Strategist submits test ideas for a batch. Ideas are created as experiment records.',
    entityType: 'client',
    entityLabel: 'Client ID',
    hasDelayTracking: false,
    icon: 'Lightbulb',
    status: 'live',
    phase: 'ideation',
    order: 4,
  },
  {
    slug: 'client-review-ideas',
    name: 'Client Review & Approve Ideas',
    description: 'Client reviews submitted test ideas for their batch and approves or rejects each one.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: false,
    icon: 'KanbanSquare',
    status: 'live',
    phase: 'ideation',
    order: 5,
  },

  // ── Design ─────────────────────────────────────────────────────────────────
  {
    slug: 'submit-mockups',
    name: 'Submit Design Mockups (Figma)',
    description: 'Designer submits Figma URLs for each experiment in a batch, views review status and feedback, and notifies strategy when revisions are ready.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: true,
    delayDueDateField: 'Design Due Date',
    icon: 'Figma',
    status: 'live',
    phase: 'design',
    order: 6,
  },
  {
    slug: 'strategy-review-mockups',
    name: 'Strategy Review Design Mockups',
    description: 'Strategist reviews design mockups for a batch and approves or requests changes.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: false,
    icon: 'FlaskConical',
    status: 'live',
    phase: 'design',
    order: 7,
  },
  {
    slug: 'client-review-mockups',
    name: 'Client Review Design Mockups',
    description: 'Client reviews design mockups for their batch and approves or requests revisions.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: false,
    icon: 'KanbanSquare',
    status: 'live',
    phase: 'design',
    order: 8,
  },

  // ── Development & QA ───────────────────────────────────────────────────────
  {
    slug: 'submit-experiment-id',
    name: 'Submit Convert.com Experiment ID',
    description: 'Developer submits Convert.com Experiment IDs for each experiment in a batch.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: true,
    delayDueDateField: 'Dev Due Date',
    icon: 'Target',
    status: 'live',
    phase: 'development',
    order: 9,
  },
  {
    slug: 'qa-report',
    name: 'QA Report',
    description: 'QA reviews each experiment in a batch, submits walkthrough video URLs, and approves or rejects.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: true,
    delayDueDateField: 'QA Due Date',
    icon: 'FlaskConical',
    status: 'live',
    phase: 'development',
    order: 10,
  },

  // ── Post-Test Analysis ─────────────────────────────────────────────────────
  {
    slug: 'pta-1-week',
    name: 'PTA 1-Week Check-in',
    description: 'Team member records a Loom walkthrough for the batch and sends a Slack check-in to the client.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: true,
    delayDueDateField: 'PTA 1 WK Due',
    icon: 'BarChart2',
    status: 'live',
    phase: 'pta',
    order: 11,
  },
  {
    slug: 'pta-2-week',
    name: 'PTA 2-Week Analysis',
    description: 'Complete the post-test analysis for all experiments in a batch with variant comparison and sync.',
    entityType: 'batch',
    entityLabel: 'Batch ID',
    hasDelayTracking: true,
    delayDueDateField: 'PTA Due Date',
    icon: 'BarChart2',
    status: 'live',
    phase: 'pta',
    order: 12,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getFormDefinition(slug: string): FormDefinition | undefined {
  return FORM_DEFINITIONS.find(f => f.slug === slug)
}

export function getFormsByEntityType(entityType: FormEntityType): FormDefinition[] {
  return FORM_DEFINITIONS.filter(f => f.entityType === entityType)
}

export function getFormsByStatus(status: FormDefinition['status']): FormDefinition[] {
  return FORM_DEFINITIONS.filter(f => f.status === status)
}

export function getFormsByPhase(phase: FormPhase): FormDefinition[] {
  return FORM_DEFINITIONS.filter(f => f.phase === phase)
}
