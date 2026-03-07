'use client'

/**
 * Forms Directory — management-only page listing all hosted forms.
 *
 * Gated by the `forms` permission. Forms are grouped by workflow phase
 * (Onboarding → Ideation → Design → Development/QA → PTA) and displayed
 * in chronological pipeline order.
 *
 * Each live form card has a launch icon that opens a dialog with three options:
 * 1. Select from recent records
 * 2. Enter a record ID manually
 * 3. View in preview mode (sample data, non-functional)
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import { useAirtable } from '@/hooks/use-airtable'
import { useUser } from '@/contexts/UserContext'
import {
  FORM_DEFINITIONS,
  PHASE_ORDER,
  PHASE_META,
  type FormDefinition,
  type FormEntityType,
  type FormPhase,
} from '@/lib/form-registry'
import {
  Copy, Check, Search, Expand, Eye, ExternalLink, X,
  UserCircle, Users, Target, FlaskConical, Figma,
  KanbanSquare, Lightbulb, BarChart2, Zap,
  LayoutDashboard, Clock, AlertTriangle, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  UserCircle, Users, Target, FlaskConical, Figma,
  KanbanSquare, Lightbulb, BarChart2, Zap,
  LayoutDashboard,
}

// ─── Entity type config ──────────────────────────────────────────────────────

const ENTITY_COLORS: Record<FormEntityType, string> = {
  lead: 'bg-violet-50 text-violet-700 border-violet-200',
  client: 'bg-sky-50 text-sky-700 border-sky-200',
  batch: 'bg-amber-50 text-amber-700 border-amber-200',
  experiment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const ENTITY_LABELS: Record<FormEntityType, string> = {
  lead: 'Lead',
  client: 'Client',
  batch: 'Batch',
  experiment: 'Experiment',
}

/** Maps entity types to the Airtable resource slug and display field for record selection */
const ENTITY_RESOURCE: Record<FormEntityType, { resource: string; displayField: string; secondaryField?: string }> = {
  lead:       { resource: 'leads',       displayField: 'Full Name', secondaryField: 'Email' },
  client:     { resource: 'clients',     displayField: 'Brand Name' },
  batch:      { resource: 'batches',     displayField: 'Batch Key' },
  experiment: { resource: 'experiments', displayField: 'Test Description' },
}

// ─── Status badges ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<FormDefinition['status'], string> = {
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  building: 'bg-amber-50 text-amber-700 border-amber-200',
  planned: 'bg-neutral-50 text-neutral-500 border-neutral-200',
}

// ─── Phase section colors ────────────────────────────────────────────────────

const PHASE_COLORS: Record<FormPhase, { border: string; bg: string; text: string; dot: string }> = {
  onboarding:  { border: 'border-l-violet-400', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  ideation:    { border: 'border-l-sky-400',    bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400' },
  design:      { border: 'border-l-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  development: { border: 'border-l-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  pta:         { border: 'border-l-rose-400',   bg: 'bg-rose-50',   text: 'text-rose-700',   dot: 'bg-rose-400' },
}

// ─── Forbidden state ─────────────────────────────────────────────────────────

function ForbiddenState() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-120px)]">
      <div className="text-center max-w-sm">
        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">Access Denied</h2>
        <p className="text-sm text-neutral-500 mt-2">
          You don&apos;t have permission to view the Forms Directory.
        </p>
      </div>
    </div>
  )
}

// ─── Launch Dialog ───────────────────────────────────────────────────────────

function LaunchDialog({ form, onClose }: { form: FormDefinition; onClose: () => void }) {
  const [manualId, setManualId] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { resource, displayField, secondaryField } = ENTITY_RESOURCE[form.entityType]

  // Fetch records for the entity type (larger set for searching)
  const fetchFields = secondaryField ? [displayField, secondaryField] : [displayField]
  const { data: records, isLoading } = useAirtable<Record<string, unknown>>(resource, {
    fields: fetchFields,
    maxRecords: 200,
    sort: [{ field: displayField, direction: 'asc' }],
    enabled: true,
  })

  // All records mapped to { id, name, secondary }
  // Keep records that have either a name or a secondary value (e.g. email-only leads)
  const allRecords = useMemo(() => {
    if (!records) return []
    return records.map(r => {
      const fields = r.fields as Record<string, unknown>
      return {
        id: r.id,
        name: String(fields[displayField] ?? ''),
        secondary: secondaryField ? String(fields[secondaryField] ?? '') : '',
      }
    })
    .filter(r => r.name || r.secondary)
    .sort((a, b) => {
      // Records with a name come first, then records with only a secondary value
      const aHasName = !!a.name
      const bHasName = !!b.name
      if (aHasName && !bHasName) return -1
      if (!aHasName && bHasName) return 1
      // Within each group, sort alphabetically by name (or secondary if no name)
      const aLabel = a.name || a.secondary
      const bLabel = b.name || b.secondary
      return aLabel.localeCompare(bLabel)
    })
  }, [records, displayField, secondaryField])

  // Client-side search filter
  const filteredRecords = useMemo(() => {
    if (!recordSearch.trim()) return allRecords
    const q = recordSearch.toLowerCase()
    return allRecords.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.secondary.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    )
  }, [allRecords, recordSearch])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (overlayRef.current && e.target === overlayRef.current) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Focus the search input on mount
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const openForm = (id: string) => {
    window.open(`/forms/${form.slug}?id=${encodeURIComponent(id)}`, '_blank')
    onClose()
  }

  const openPreview = () => {
    window.open(`/forms/${form.slug}?id=preview`, '_blank')
    onClose()
  }

  const handleManualOpen = () => {
    if (manualId.trim()) openForm(manualId.trim())
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[14px] font-semibold text-neutral-800">Open {form.name}</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Search for a record or enter an ID</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex flex-col min-h-0 flex-1">
          {/* Record search + scrollable list */}
          <div className="flex flex-col min-h-0 flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5 block shrink-0">
              Select {ENTITY_LABELS[form.entityType]}
            </label>
            {/* Search bar */}
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                ref={searchRef}
                type="text"
                value={recordSearch}
                onChange={e => setRecordSearch(e.target.value)}
                placeholder={`Search ${ENTITY_LABELS[form.entityType].toLowerCase()}s...`}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 bg-white text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-colors"
              />
            </div>
            {/* Scrollable results */}
            <div className="rounded-xl border border-neutral-200 overflow-hidden flex flex-col min-h-0 flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-neutral-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading {ENTITY_LABELS[form.entityType].toLowerCase()}s...
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-neutral-400">
                  {recordSearch ? `No ${ENTITY_LABELS[form.entityType].toLowerCase()}s matching "${recordSearch}"` : 'No records found'}
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 overflow-y-auto max-h-[280px]">
                  {filteredRecords.map(record => (
                    <button
                      key={record.id}
                      onClick={() => openForm(record.id)}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-sky-50/50 transition-colors text-left group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] text-neutral-700 truncate block group-hover:text-sky-700">
                          {record.name || <span className="text-neutral-400 italic">No name</span>}
                        </span>
                        {record.secondary && (
                          <span className="text-[11px] text-neutral-400 truncate block">{record.secondary}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-300 shrink-0 group-hover:text-sky-500">{record.id}</span>
                    </button>
                  ))}
                  {allRecords.length >= 200 && !recordSearch && (
                    <div className="px-4 py-2 text-[11px] text-neutral-400 text-center bg-neutral-50">
                      Showing first 200 records — use search to narrow results
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Manual ID input (collapsible alternative) */}
          <div className="shrink-0">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5 block">
              Or enter {form.entityLabel} directly
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualId}
                onChange={e => setManualId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualOpen()}
                placeholder="rec..."
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-[13px] text-neutral-800 font-mono placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-colors"
              />
              <button
                onClick={handleManualOpen}
                disabled={!manualId.trim()}
                className="px-4 py-2 bg-sky-500 text-white text-[12px] font-semibold rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </button>
            </div>
          </div>

          {/* Preview divider */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300">or</span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          {/* Preview button */}
          <button
            onClick={openPreview}
            className="w-full py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-[13px] font-medium text-neutral-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Eye className="h-4 w-4" />
            Preview with sample data
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Form Card ───────────────────────────────────────────────────────────────

function FormCard({ form }: { form: FormDefinition }) {
  const [copied, setCopied] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const Icon = ICON_MAP[form.icon] ?? LayoutDashboard

  const formUrl = `/forms/${form.slug}?id=`

  const handleCopyLink = async () => {
    const fullUrl = `${window.location.origin}${formUrl}`
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-md transition-shadow">
        {/* Card header */}
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-sky-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-neutral-800 leading-snug">{form.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                    ENTITY_COLORS[form.entityType]
                  )}>
                    {ENTITY_LABELS[form.entityType]}
                  </span>
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                    STATUS_STYLES[form.status]
                  )}>
                    {form.status}
                  </span>
                  {form.hasDelayTracking && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                      <Clock className="h-3 w-3" />
                      Delay
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Launch icon — only for live forms */}
            {form.status === 'live' && (
              <button
                onClick={() => setDialogOpen(true)}
                className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                title="Open form"
              >
                <Expand className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="px-5 pb-3">
          <p className="text-[12px] text-neutral-500 leading-relaxed line-clamp-2">{form.description}</p>
        </div>

        {/* Slug display */}
        <div className="px-5 pb-4">
          <code className="text-[11px] text-neutral-400 font-mono bg-neutral-50 px-2 py-1 rounded border border-neutral-100 block truncate">
            /forms/{form.slug}?id=&lt;{form.entityLabel}&gt;
          </code>
        </div>

        {/* Actions */}
        <div className="border-t border-neutral-100 px-5 py-3 flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
              copied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Launch dialog */}
      {dialogOpen && (
        <LaunchDialog form={form} onClose={() => setDialogOpen(false)} />
      )}
    </>
  )
}

// ─── Phase Section ───────────────────────────────────────────────────────────

function PhaseSection({ phase, forms }: { phase: FormPhase; forms: FormDefinition[] }) {
  const meta = PHASE_META[phase]
  const colors = PHASE_COLORS[phase]

  return (
    <section className="mb-10">
      {/* Phase header */}
      <div className={cn('border-l-[3px] pl-4 mb-4', colors.border)}>
        <div className="flex items-center gap-2.5">
          <div className={cn('h-2 w-2 rounded-full', colors.dot)} />
          <h2 className="text-[15px] font-bold text-neutral-800">{meta.label}</h2>
          <span className="text-[11px] text-neutral-400 font-medium">
            {forms.length} form{forms.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-[12px] text-neutral-500 mt-0.5 ml-[18px]">{meta.description}</p>
      </div>

      {/* Form cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms.map(form => (
          <FormCard key={form.slug} form={form} />
        ))}
      </div>
    </section>
  )
}

// ─── Filter Tabs ─────────────────────────────────────────────────────────────

const ENTITY_FILTER_OPTIONS: Array<{ value: FormEntityType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'lead', label: 'Lead' },
  { value: 'client', label: 'Client' },
  { value: 'batch', label: 'Batch' },
  { value: 'experiment', label: 'Experiment' },
]

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FormsDirectoryPage() {
  const { hasPermission } = usePermissions()
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<FormEntityType | 'all'>('all')

  // Filter forms, then group by phase (preserving the workflow order)
  const groupedForms = useMemo(() => {
    const filtered = FORM_DEFINITIONS.filter(form => {
      if (entityFilter !== 'all' && form.entityType !== entityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          form.name.toLowerCase().includes(q) ||
          form.slug.toLowerCase().includes(q) ||
          form.description.toLowerCase().includes(q)
        )
      }
      return true
    })

    // Group into phases (only include phases that have matching forms)
    const groups: Array<{ phase: FormPhase; forms: FormDefinition[] }> = []
    for (const phase of PHASE_ORDER) {
      const phaseForms = filtered.filter(f => f.phase === phase).sort((a, b) => a.order - b.order)
      if (phaseForms.length > 0) {
        groups.push({ phase, forms: phaseForms })
      }
    }
    return groups
  }, [search, entityFilter])

  const totalCount = groupedForms.reduce((sum, g) => sum + g.forms.length, 0)

  // Permission gate
  if (!hasPermission('forms')) {
    return <ForbiddenState />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Forms Directory</h1>
          <p className="text-sm text-neutral-500 mt-1">
            All hosted forms in workflow order. Copy the link and append the Airtable record ID.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 bg-white text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-colors"
            />
          </div>

          {/* Entity type filter */}
          <div className="flex items-center gap-1.5 bg-neutral-50 rounded-lg border border-neutral-200 p-1">
            {ENTITY_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEntityFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
                  entityFilter === opt.value
                    ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-[12px] text-neutral-400 mb-6">
          {totalCount} form{totalCount !== 1 ? 's' : ''} across {groupedForms.length} phase{groupedForms.length !== 1 ? 's' : ''}
        </p>

        {/* Phase-grouped sections */}
        {groupedForms.length > 0 ? (
          groupedForms.map(({ phase, forms }) => (
            <PhaseSection key={phase} phase={phase} forms={forms} />
          ))
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-neutral-400">No forms match your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
