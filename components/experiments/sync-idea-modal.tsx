"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { X, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import type { Idea } from "./ideas-table"

interface SyncIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  idea: Idea
}

interface TeamMember {
  id: string
  name: string
  role: string
  department: string
}

interface Batch {
  id: string
  label: string
  launchDate: string // YYYY-MM-DD
}

// Keywords to match each team role to a Department / Role value (case-insensitive)
const DEPT_KEYWORDS: Record<string, string[]> = {
  Strategist: ['strategy', 'strat'],
  Designer:   ['design', 'creative'],
  Developer:  ['development', 'dev', 'engineer'],
  QA:         ['qa', 'quality'],
}

function matchesDept(member: TeamMember, roleName: string): boolean {
  const keywords = DEPT_KEYWORDS[roleName] ?? []
  const haystack = `${member.role} ${member.department}`.toLowerCase()
  return keywords.some(kw => haystack.includes(kw))
}

// Return a Date that is `n` working days (Mon–Fri) after `from`
function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from)
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return d
}

function toDateInput(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ── MemberSelect ──────────────────────────────────────────────────────────────
function MemberSelect({
  label, required, value, onChange, members,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (id: string) => void
  members: TeamMember[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = members.find(m => m.id === value)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="space-y-1.5 relative" ref={ref}>
      <label className="text-[13px] font-medium text-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-left text-[13px] flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Select…"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-[13px] text-muted-foreground hover:bg-accent transition-colors"
          >
            — None —
          </button>
          {members.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-muted-foreground text-center">No members found</div>
          ) : members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors border-t border-border/50"
            >
              <span className="font-medium">{m.name}</span>
              {m.role && <span className="ml-1.5 text-muted-foreground text-[11px]">{m.role}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function SyncIdeaModal({ isOpen, onClose, onSuccess, idea }: SyncIdeaModalProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [selectedBatchId, setSelectedBatchId] = useState("")
  const [strategistId,    setStrategistId]    = useState("")
  const [designerId,      setDesignerId]      = useState("")
  const [developerId,     setDeveloperId]     = useState("")
  const [qaId,            setQaId]            = useState("")
  const [videoUrl,        setVideoUrl]        = useState("")
  const [batchOpen,       setBatchOpen]       = useState(false)

  // New-batch creation state
  const [newBatchMode,    setNewBatchMode]    = useState(false)
  const [newBatchDate,    setNewBatchDate]    = useState("")
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)

  const batchRef = useRef<HTMLDivElement>(null)
  const defaultsApplied = useRef(false)

  const authHeaders = useMemo((): HeadersInit => ({
    'Content-Type': 'application/json',
    'x-user-role':  user?.role ?? '',
    'x-user-id':    user?.id ?? '',
    'x-user-name':  user?.name ?? '',
    ...(user?.clientId ? { 'x-client-id': user.clientId } : {}),
  }), [user])

  // ── Data fetches — all hooks declared before effects that depend on them ──────

  // Batches — future only, scoped to this client
  const batchFilterParts: string[] = ['IS_AFTER({Launch Date}, TODAY())']
  if (idea.clientId) {
    batchFilterParts.push(`FIND("${idea.clientId}", CONCATENATE({Record ID (from Client)})) > 0`)
  }
  const batchFilterExtra = batchFilterParts.length === 1
    ? batchFilterParts[0]
    : `AND(${batchFilterParts.join(', ')})`

  const { data: rawBatches, mutate: mutateBatches } = useAirtable('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date'],
    filterExtra: batchFilterExtra,
    sort: [{ field: 'Launch Date', direction: 'desc' }],
    enabled: isOpen,
  })

  // Team members — active only
  const { data: rawTeam } = useAirtable('team', {
    fields: ['Full Name', 'Role', 'Department'],
    filterExtra: '{Employment Status} = "Active"',
    sort: [{ field: 'Full Name', direction: 'asc' }],
    enabled: isOpen,
  })

  // Client record — default team member assignments
  const { data: rawClient } = useAirtable('clients', {
    fields: ['Developer', 'Designer', 'Strategist', 'QA'],
    filterExtra: idea.clientId ? `RECORD_ID() = "${idea.clientId}"` : undefined,
    enabled: isOpen && !!idea.clientId,
    maxRecords: 1,
  })

  // ── Derived memos ─────────────────────────────────────────────────────────────

  const batches = useMemo<Batch[]>(() => {
    if (!rawBatches) return []
    return rawBatches.map(rec => {
      const f = rec.fields as Record<string, unknown>
      const batchKey = String(f['Batch Key'] ?? '')
      const brandArr = f['Brand Name']
      const brand = Array.isArray(brandArr) ? String(brandArr[0] ?? '') : String(brandArr ?? '')
      const launch = f['Launch Date'] ? String(f['Launch Date']).split('T')[0] : ''
      const label = batchKey || (brand && launch ? `${brand} — ${launch}` : brand || launch || rec.id)
      return { id: rec.id, label, launchDate: launch }
    })
  }, [rawBatches])

  // Rule 1: 13 working days from today; Rule 2: 28 calendar days from latest future batch
  const minNewBatchDate = useMemo(() => {
    const today = new Date()
    const minFromToday = addWorkingDays(today, 13)
    let minFromBatches = new Date(0)
    if (batches.length > 0 && batches[0].launchDate) {
      const latest = new Date(batches[0].launchDate + 'T00:00:00')
      minFromBatches = new Date(latest)
      minFromBatches.setDate(minFromBatches.getDate() + 28)
    }
    return toDateInput(minFromBatches > minFromToday ? minFromBatches : minFromToday)
  }, [batches])

  const allTeamMembers = useMemo<TeamMember[]>(() => {
    if (!rawTeam) return []
    return rawTeam.map(rec => {
      const f = rec.fields as Record<string, unknown>
      return {
        id:         rec.id,
        name:       String(f['Full Name'] ?? ''),
        role:       String(f['Role'] ?? ''),
        department: String(f['Department'] ?? ''),
      }
    })
  }, [rawTeam])

  const strategists = useMemo(() => allTeamMembers.filter(m => matchesDept(m, 'Strategist')), [allTeamMembers])
  const designers   = useMemo(() => allTeamMembers.filter(m => matchesDept(m, 'Designer')),   [allTeamMembers])
  const developers  = useMemo(() => allTeamMembers.filter(m => matchesDept(m, 'Developer')),  [allTeamMembers])
  const qaMembers   = useMemo(() => allTeamMembers.filter(m => matchesDept(m, 'QA')),         [allTeamMembers])

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Escape closes modal
  useEffect(() => {
    if (!isOpen) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isCreatingBatch) onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [isOpen, isSubmitting, isCreatingBatch, onClose])

  // Click-outside closes batch dropdown
  useEffect(() => {
    if (!batchOpen) return
    const handle = (e: MouseEvent) => {
      if (batchRef.current && !batchRef.current.contains(e.target as Node)) setBatchOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [batchOpen])

  // Reset form state when modal closes
  useEffect(() => {
    if (isOpen) return
    setSelectedBatchId("")
    setStrategistId("")
    setDesignerId("")
    setDeveloperId("")
    setQaId("")
    setVideoUrl("")
    setNewBatchMode(false)
    setNewBatchDate("")
    defaultsApplied.current = false
  }, [isOpen])

  // Pre-populate team selectors from client defaults (once per modal open)
  useEffect(() => {
    if (!isOpen || defaultsApplied.current) return
    if (!rawClient || rawClient.length === 0) return

    const f = rawClient[0].fields as Record<string, unknown>
    const getFirst = (key: string): string => {
      const val = f[key]
      return Array.isArray(val) ? String(val[0] ?? '') : ''
    }

    setStrategistId(getFirst('Strategist'))
    setDesignerId(getFirst('Designer'))
    setDeveloperId(getFirst('Developer'))
    setQaId(getFirst('QA'))
    defaultsApplied.current = true
  }, [isOpen, rawClient])

  const selectedBatch = batches.find(b => b.id === selectedBatchId)

  // ── Create new batch ──────────────────────────────────────────────────────────
  const handleCreateBatch = async () => {
    if (!newBatchDate || newBatchDate < minNewBatchDate) return
    setIsCreatingBatch(true)
    try {
      const fields: Record<string, unknown> = { 'Launch Date': newBatchDate }
      if (idea.clientId) fields['Brand Name'] = [idea.clientId]

      const res = await fetch('/api/airtable/batches', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create batch')
      }
      const { record } = await res.json()
      await mutateBatches()
      setSelectedBatchId(record.id)
      setNewBatchMode(false)
      setNewBatchDate("")
      toast({ title: 'Batch created', description: `New batch scheduled for ${newBatchDate}.` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create batch'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setIsCreatingBatch(false)
    }
  }

  // ── Sync ──────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedBatchId) {
      toast({ title: 'Batch required', description: 'Please select a batch to sync this idea to.', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      const fields: Record<string, unknown> = {
        'Is Experiment': true,
        'Batch': [selectedBatchId],
      }
      if (strategistId) fields['Strategist'] = [strategistId]
      if (designerId)   fields['Designer']   = [designerId]
      if (developerId)  fields['Developer']  = [developerId]
      if (qaId)         fields['QA']         = [qaId]
      if (videoUrl)     fields['Walkthrough Video URL'] = videoUrl

      const res = await fetch(`/api/airtable/experiments/${idea.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to sync idea')
      }
      toast({ title: 'Synced!', description: `"${idea.name}" has been added to the batch.` })
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sync idea'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    // Backdrop — click anywhere outside the modal to close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      {/* Modal content — stop propagation so inner clicks don't bubble to backdrop */}
      <div
        className="bg-background rounded-xl border border-border max-w-md w-full mx-4 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sync Idea to Batch</h2>
            <p className="text-[13px] text-muted-foreground mt-1 line-clamp-1">
              {idea.name}
              {idea.client && <span className="text-muted-foreground/60"> · {idea.client}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">

          {/* Batch selector */}
          <div className="space-y-1.5 relative" ref={batchRef}>
            <label className="text-[13px] font-medium text-foreground">
              Batch <span className="text-red-500">*</span>
            </label>

            {!newBatchMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setBatchOpen(o => !o)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-left text-[13px] flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <span className={selectedBatch ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {selectedBatch ? selectedBatch.label : "Select a batch…"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>

                {batchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                    {batches.length === 0 ? (
                      <div className="px-3 py-4 text-[13px] text-muted-foreground text-center">No upcoming batches</div>
                    ) : batches.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSelectedBatchId(b.id); setBatchOpen(false) }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-[13px] hover:bg-accent transition-colors border-b border-border/50 last:border-0",
                          b.id === selectedBatchId ? "bg-accent/50 font-medium text-foreground" : "text-foreground"
                        )}
                      >
                        {b.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setBatchOpen(false)
                        setNewBatchMode(true)
                        setNewBatchDate(minNewBatchDate)
                      }}
                      className="w-full text-left px-3 py-2.5 text-[13px] text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors border-t border-border flex items-center gap-1.5 font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create new batch…
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Inline new-batch form */
              <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">New Batch</span>
                  <button
                    type="button"
                    onClick={() => { setNewBatchMode(false); setNewBatchDate("") }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to list
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-foreground">Launch Date</label>
                  <input
                    type="date"
                    value={newBatchDate}
                    min={minNewBatchDate}
                    onChange={e => setNewBatchDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Earliest: {minNewBatchDate}
                    {batches.length > 0 ? ' (13 working days from today; 28 days after latest batch)' : ' (13 working days from today)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateBatch}
                  disabled={!newBatchDate || newBatchDate < minNewBatchDate || isCreatingBatch}
                  className="w-full h-8 rounded-lg bg-teal-700 text-white text-[12px] font-medium hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingBatch ? 'Creating…' : 'Create Batch'}
                </button>
              </div>
            )}
          </div>

          {/* Team members — each list pre-filtered by department */}
          <div className="grid grid-cols-2 gap-4">
            <MemberSelect label="Strategist" value={strategistId} onChange={setStrategistId} members={strategists} />
            <MemberSelect label="Designer"   value={designerId}   onChange={setDesignerId}   members={designers} />
            <MemberSelect label="Developer"  value={developerId}  onChange={setDeveloperId}  members={developers} />
            <MemberSelect label="QA"         value={qaId}         onChange={setQaId}         members={qaMembers} />
          </div>

          {/* Walkthrough URL */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Walkthrough Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://loom.com/share/…"
              disabled={isSubmitting}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-9 rounded-lg border border-border bg-card text-foreground text-[13px] font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedBatchId}
            className="flex-1 h-9 rounded-lg bg-teal-700 text-white text-[13px] font-medium hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Syncing…' : 'Sync to Batch'}
          </button>
        </div>
      </div>
    </div>
  )
}
