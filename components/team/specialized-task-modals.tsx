"use client"

import { useState, useMemo, useRef } from "react"
import {
  X, Plus, AlertTriangle, Loader2,
  Globe, Target, Users, BarChart2, Send,
  Megaphone, ChevronDown, ChevronRight, CheckCircle2,
  Lightbulb, FileText, Eye, Monitor, Save, ExternalLink,
  Link2, Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"
import { NewIdeaModal } from "@/components/clients/new-idea-modal"
import { SelectField } from "@/components/shared/select-field"

// ─── Shared task type (structural subset of ScheduleTask) ─────────────────────

interface Task {
  title: string
  client: string
  department: string
  dueDate: string
  status: string
  assigned: string
  batchId?: string
  batchRecordId?: string
  clientRecordId?: string
  experimentIds?: string[]
  experiments?: { id: string; name: string }[]
}

// ─── Management Task Modal ───────────────────────────────────────────────────

export function ManagementTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden">
        <div className="h-1.5 bg-rose-500" />
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold mb-1 bg-rose-500/10 text-rose-700 border border-rose-500/20">
              Management
            </span>
            <h2 className="text-[15px] font-semibold text-foreground">{task.title}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Client</p>
              <p className="text-[13px] text-foreground">{task.client || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Due Date</p>
              <p className="text-[13px] text-foreground">
                {task.dueDate
                  ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</p>
              <p className="text-[13px] text-foreground">{task.status || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Assigned To</p>
              <p className="text-[13px] text-foreground">{task.assigned || "—"}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Launch Tests Modal ────────────────────────────────────────────────────────

export function LaunchTestsModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false)

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Confirm Launch</h2>
                <p className="text-[13px] text-muted-foreground">This action will launch tests in Convert</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors">
              Cancel
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors">
              Launch Tests
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Launch Tests</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{task.client}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {task.experiments?.map((exp) => (
            <div key={exp.id} className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-accent/20">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[13px] font-medium text-foreground">{exp.name}</span>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors">Cancel</button>
          <button onClick={() => setShowConfirm(true)} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors">
            Launch Tests
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Onboard QA viewer ────────────────────────────────────────────────────────

interface QARecord {
  storeUrl: string
  goals: string
  kpiTarget: string
  differentiators: string
  customers: string
  marketingChannels: string
  trafficFocus: string
  pastTests: string
  pricingOpen: string
  devAgency: string
  additionalNotes: string
  advertorials: string
  mediaAssets: string
}

interface QASection {
  icon: React.ComponentType<{ className?: string }>
  title: string
  color: string
  items: { label: string; value: string }[]
}

function QAViewer({ clientName, clientRecordId }: { clientName: string; clientRecordId?: string }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("overview")

  const { data: rawQA, isLoading } = useAirtable<Record<string, unknown>>("onboard-qa", {
    fields: [
      "What's your store URL?",
      "What are your goals working with us?",
      "By what percentage do you hope to improve your CVR and/or AOV?",
      "What do you believe sets your business apart from your competitors?",
      "Who are your customers and what are their demographics, interests, and behaviors?",
      "What are your main marketing channels? Please select all that apply:",
      "Where is most of your website traffic directed?",
      "Have you run any A/B tests in the past, if so what? And what was the result?",
      "Are you open to testing new pricing or free shipping thresholds?",
      "Are you working with a development agency?",
      "Are there any other factors we should be aware of that might affect the testing process?",
      "Please share links or screenshots of your most popular advertorials.",
      "Please share any Dropbox, Google Drive folders that contain media (images, video) that will help us with testing",
    ],
    // Try both singular and plural field name variants to handle different Airtable setups
    filterExtra: clientRecordId
      ? `OR(FIND("${clientRecordId}", CONCATENATE({Record ID (from Client)})) > 0, FIND("${clientRecordId}", CONCATENATE({Record ID (from Clients)})) > 0)`
      : clientName
      ? `OR(FIND("${clientName}", CONCATENATE({Clients})) > 0, FIND("${clientName}", CONCATENATE({Client})) > 0)`
      : undefined,
    enabled: !!(clientRecordId || clientName),
    maxRecords: 1,
  })

  const qa = useMemo<QARecord | null>(() => {
    if (!rawQA || rawQA.length === 0) return null
    const f = rawQA[0].fields as Record<string, unknown>
    return {
      storeUrl: (f["What's your store URL?"] as string) ?? "",
      goals: (f["What are your goals working with us?"] as string) ?? "",
      kpiTarget: (f["By what percentage do you hope to improve your CVR and/or AOV?"] as string) ?? "",
      differentiators: (f["What do you believe sets your business apart from your competitors?"] as string) ?? "",
      customers: (f["Who are your customers and what are their demographics, interests, and behaviors?"] as string) ?? "",
      marketingChannels: (f["What are your main marketing channels? Please select all that apply:"] as string) ?? "",
      trafficFocus: (f["Where is most of your website traffic directed?"] as string) ?? "",
      pastTests: (f["Have you run any A/B tests in the past, if so what? And what was the result?"] as string) ?? "",
      pricingOpen: (f["Are you open to testing new pricing or free shipping thresholds?"] as string) ?? "",
      devAgency: (f["Are you working with a development agency?"] as string) ?? "",
      additionalNotes: (f["Are there any other factors we should be aware of that might affect the testing process?"] as string) ?? "",
      advertorials: (f["Please share links or screenshots of your most popular advertorials."] as string) ?? "",
      mediaAssets: (f["Please share any Dropbox, Google Drive folders that contain media (images, video) that will help us with testing"] as string) ?? "",
    }
  }, [rawQA])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-[13px] text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading Q&A data…
      </div>
    )
  }

  if (!qa) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
        <p className="text-[13px] font-medium">No Q&A data found</p>
        <p className="text-[12px] mt-1">Client onboarding Q&A hasn't been completed yet.</p>
      </div>
    )
  }

  const sections: QASection[] = [
    {
      icon: Globe,
      title: "overview",
      color: "text-sky-600",
      items: [
        { label: "Store URL", value: qa.storeUrl },
        { label: "Goals with Us", value: qa.goals },
        { label: "CVR / AOV Target", value: qa.kpiTarget },
      ].filter(i => i.value),
    },
    {
      icon: Target,
      title: "differentiators",
      color: "text-violet-600",
      items: [
        { label: "What Sets Them Apart", value: qa.differentiators },
        { label: "Open to Pricing Tests", value: qa.pricingOpen },
        { label: "Working with Dev Agency", value: qa.devAgency },
      ].filter(i => i.value),
    },
    {
      icon: Users,
      title: "audience",
      color: "text-emerald-600",
      items: [
        { label: "Customer Demographics", value: qa.customers },
        { label: "Traffic Focus", value: qa.trafficFocus },
      ].filter(i => i.value),
    },
    {
      icon: Megaphone,
      title: "channels",
      color: "text-amber-600",
      items: [
        { label: "Marketing Channels", value: qa.marketingChannels },
        { label: "Advertorials", value: qa.advertorials },
        { label: "Media Assets", value: qa.mediaAssets },
      ].filter(i => i.value),
    },
    {
      icon: BarChart2,
      title: "history",
      color: "text-rose-600",
      items: [
        { label: "Past A/B Tests", value: qa.pastTests },
        { label: "Additional Notes", value: qa.additionalNotes },
      ].filter(i => i.value),
    },
  ].filter(s => s.items.length > 0)

  const sectionLabels: Record<string, string> = {
    overview: "Business Overview",
    differentiators: "Differentiators & Constraints",
    audience: "Audience & Traffic",
    channels: "Marketing & Media",
    history: "Testing History & Notes",
  }

  return (
    <div className="space-y-2">
      {/* Store URL quick access */}
      {qa.storeUrl && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <Globe className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <a
            href={qa.storeUrl.startsWith("http") ? qa.storeUrl : `https://${qa.storeUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 truncate"
          >
            {qa.storeUrl}
          </a>
        </div>
      )}

      {/* Accordion sections */}
      {sections.map(section => {
        const isOpen = expandedSection === section.title
        const Icon = section.icon
        return (
          <div key={section.title} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedSection(isOpen ? null : section.title)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5 shrink-0", section.color)} />
                <span className="text-[12px] font-semibold text-foreground">
                  {sectionLabels[section.title]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({section.items.length} {section.items.length === 1 ? "field" : "fields"})
                </span>
              </div>
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            {isOpen && (
              <div className="px-3 py-3 space-y-3">
                {section.items.map(item => {
                  const isUrl = /^https?:\/\//.test(item.value.trim())
                  return (
                    <div key={item.label}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {item.label}
                      </p>
                      {isUrl ? (
                        <a
                          href={item.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-sky-600 hover:text-sky-700 font-medium truncate block"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-[12px] text-foreground/80 leading-relaxed">{item.value}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Priority badge helper ────────────────────────────────────────────────────

function getPriorityStyle(priority: string): string {
  const p = String(priority).toLowerCase()
  if (p === 'high' || p === '1') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (p === 'medium' || p === '2') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (p === 'low' || p === '3') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (p) return 'bg-sky-50 text-sky-700 border-sky-200'
  return 'bg-accent text-muted-foreground border-border'
}

// ─── Submit Strategy Modal ────────────────────────────────────────────────────

interface IdeaListItem {
  id: string
  testDescription: string
  priority: string
  isPending?: boolean
}

export function SubmitStrategyModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false)
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [optimisticIdeas, setOptimisticIdeas] = useState<IdeaListItem[]>([])

  // Fetch existing test ideas for this client
  const { data: rawIdeas, isLoading: ideasLoading, mutate: mutateIdeas } = useAirtable<Record<string, unknown>>(
    'experiment-ideas',
    {
      fields: ['Test Description', 'Priority'],
      // Filter by record ID when available (lookup field), else by name
      filterExtra: task.clientRecordId
        ? `{Record ID (from Brand Name)} = "${task.clientRecordId}"`
        : task.client
        ? `FIND("${task.client}", CONCATENATE({Client})) > 0`
        : undefined,
      sort: [{ field: 'Test Description', direction: 'asc' }],
      enabled: !!(task.clientRecordId || task.client),
    }
  )

  const fetchedIdeas = useMemo<IdeaListItem[]>(() => {
    return (rawIdeas ?? []).map(r => ({
      id: r.id,
      testDescription: (r.fields['Test Description'] as string) ?? 'Untitled',
      priority: String(r.fields['Priority'] ?? ''),
    }))
  }, [rawIdeas])

  // Merge optimistic (just-added) ideas with fetched, deduplicating
  const allIdeas = useMemo<IdeaListItem[]>(() => {
    const fetchedIds = new Set(fetchedIdeas.map(i => i.id))
    const newOnes = optimisticIdeas.filter(i => !fetchedIds.has(i.id))
    return [...newOnes, ...fetchedIdeas]
  }, [fetchedIdeas, optimisticIdeas])

  const handleAddOptimistic = (idea: any) => {
    // idea comes from NewIdeaModal's onAddOptimistic — it's the raw fields object
    const newItem: IdeaListItem = {
      id: `opt-${Date.now()}`,
      testDescription: idea?.['Test Description'] || idea?.testDescription || 'New Test Idea',
      priority: idea?.['Priority'] || idea?.priority || '',
      isPending: true,
    }
    setOptimisticIdeas(prev => [newItem, ...prev])
  }

  const handleIdeaSuccess = () => {
    // Refetch to replace optimistic with real data
    setTimeout(() => {
      mutateIdeas()
      setOptimisticIdeas([])
    }, 1000)
  }

  const handleNotifyClient = async () => {
    setSubmitting(true)
    try {
      // TODO: wire up actual notify endpoint
      console.log("[SubmitStrategy] Notifying client about strategy for:", task.client)
      setSubmitted(true)
      setShowNotifyConfirm(false)
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm notify dialog
  if (showNotifyConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <Send className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">Notify Client</h3>
                <p className="text-[13px] text-muted-foreground mt-1">
                  This will notify{" "}
                  <span className="font-semibold text-foreground">{task.client}</span>{" "}
                  that their strategy has been submitted for review. Continue?
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
            <button
              onClick={() => setShowNotifyConfirm(false)}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNotifyClient}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-semibold transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? "Sending…" : "Send Strategy"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* Accent strip */}
          <div className="h-1.5 bg-emerald-500 shrink-0" />

          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-start justify-between shrink-0">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold mb-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                Strategy
              </span>
              <h2 className="text-[15px] font-semibold text-foreground">Submit Strategy</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">{task.client}</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Split body */}
          <div className="flex-1 overflow-hidden flex min-h-0">

            {/* LEFT — Client Q&A */}
            <div className="w-[42%] border-r border-border flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border bg-muted/20 shrink-0">
                <h3 className="text-[12px] font-semibold text-foreground">Client Q&A</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Onboarding answers for {task.client}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <QAViewer clientName={task.client} clientRecordId={task.clientRecordId} />
              </div>
            </div>

            {/* RIGHT — Test ideas list */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-5 py-3 border-b border-border bg-muted/20 shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-semibold text-foreground">Test Ideas</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {ideasLoading ? "Loading…" : `${allIdeas.length} idea${allIdeas.length !== 1 ? "s" : ""} for ${task.client}`}
                  </p>
                </div>
                {/* Small "+" icon button to add a new idea */}
                <button
                  onClick={() => setShowNewIdeaModal(true)}
                  title="Add test idea"
                  className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-300 transition-colors group"
                >
                  <Plus className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-[14px] font-semibold text-foreground">Strategy submitted!</p>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Client has been notified.
                    </p>
                  </div>
                ) : ideasLoading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-[13px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading test ideas…
                  </div>
                ) : allIdeas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                      <Lightbulb className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">No test ideas yet</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        Click + to add the first test idea for {task.client}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allIdeas.map((idea) => (
                      <div
                        key={idea.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border bg-card transition-opacity",
                          idea.isPending ? "opacity-60 border-dashed border-muted-foreground/30" : "border-border"
                        )}
                      >
                        <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground leading-snug">
                            {idea.testDescription}
                            {idea.isPending && (
                              <span className="ml-2 text-[11px] text-muted-foreground font-normal">saving…</span>
                            )}
                          </p>
                        </div>
                        {idea.priority && (
                          <span className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded border shrink-0",
                            getPriorityStyle(idea.priority)
                          )}>
                            {idea.priority}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right footer */}
              {!submitted && (
                <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
                  <p className="text-[12px] text-muted-foreground">
                    {allIdeas.length} idea{allIdeas.length !== 1 ? "s" : ""} ready
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setShowNotifyConfirm(true)}
                      disabled={allIdeas.length === 0}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                    >
                      Notify Client
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NewIdeaModal — rendered outside the main modal to avoid z-index conflicts */}
      <NewIdeaModal
        isOpen={showNewIdeaModal}
        onClose={() => setShowNewIdeaModal(false)}
        onSuccess={handleIdeaSuccess}
        clientName={task.client}
        clientId={task.clientRecordId ?? ''}
        onAddOptimistic={handleAddOptimistic}
      />
    </>
  )
}

// ─── PTA Types + Helpers ──────────────────────────────────────────────────────

const GOAL_METRIC_OPTIONS = ["CVR", "AOV", "RPV", "SCVR", "ATC", "Bounce Rate", "CTR", "Sessions", "Revenue", "Engagement Rate"]
const PTA_SEGMENT_OPTIONS = [
  "All Users", "Mobile", "Desktop", "Tablet",
  "New Visitors", "Returning Visitors",
  "US", "Non-US", "Canada", "UK", "Australia",
  "Cart Viewers", "Checkout Initiated",
  "First-Time Buyer", "Repeat Buyer",
  "Paid Traffic", "Organic Traffic", "Email Traffic", "Social Traffic",
  "iOS", "Android",
  "High Intent", "Low Intent",
]
const FINAL_STATUS_OPTIONS = ["Successful", "Unsuccessful", "Inconclusive", "Blocked"] as const

export interface PTAExp {
  id: string
  testDescription: string
  placement: string
  placementUrl: string
  convertId: string
  figmaUrl: string
  // PTA-specific
  imageType: "Mobile" | "Desktop" | ""
  controlImageUrl: string
  variantImageUrl: string
  ptaResultImageUrl: string
  ptaLoomUrl: string
  goalMetric1: string
  metric1Increase: number | null
  goalMetric2: string
  metric2Increase: number | null
  revenueAdded: number | null
  confidenceLevel: number | null
  testStatus: string
  segmentDeploy: string[]
  description: string
  nextSteps: string
  deployed: boolean
}

interface PTAVariant {
  id: string
  variantName: string
  experimentName: string
  previewUrl: string
  traffic: string
}

export interface PTAFormState {
  imageType: "Mobile" | "Desktop" | ""
  controlImageUrl: string
  variantImageUrl: string
  ptaResultImageUrl: string
  figmaUrl: string
  resultsVideoUrl: string
  goalMetric1: string
  metric1Increase: string
  goalMetric2: string
  metric2Increase: string
  revenueAdded: string
  confidenceLevel: string
  finalStatus: string
  segmentDeploy: string[]
  description: string
  nextSteps: string
  deployed: boolean
  saving: boolean
  saved: boolean
}

function getAttachmentUrl(field: unknown): string {
  if (!field) return ""
  if (typeof field === "string") return field
  if (Array.isArray(field) && field.length > 0) {
    const first = field[0] as Record<string, unknown>
    return (first.url as string) ?? ""
  }
  return ""
}

function initPTAForm(exp: PTAExp): PTAFormState {
  return {
    imageType: exp.imageType,
    controlImageUrl: exp.controlImageUrl,
    variantImageUrl: exp.variantImageUrl,
    ptaResultImageUrl: exp.ptaResultImageUrl,
    figmaUrl: exp.figmaUrl,
    resultsVideoUrl: exp.ptaLoomUrl,
    goalMetric1: exp.goalMetric1,
    metric1Increase: exp.metric1Increase != null ? String(exp.metric1Increase) : "",
    goalMetric2: exp.goalMetric2,
    metric2Increase: exp.metric2Increase != null ? String(exp.metric2Increase) : "",
    revenueAdded: exp.revenueAdded != null ? String(exp.revenueAdded) : "",
    confidenceLevel: exp.confidenceLevel != null ? String(exp.confidenceLevel) : "",
    finalStatus: exp.testStatus,
    segmentDeploy: exp.segmentDeploy,
    description: exp.description,
    nextSteps: exp.nextSteps,
    deployed: exp.deployed,
    saving: false,
    saved: false,
  }
}

// ─── PTASection ───────────────────────────────────────────────────────────────

function PTASection({
  num, title, icon: Icon, children,
}: {
  num: string
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-muted/30 border-b border-border">
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-white text-[11px] font-bold shrink-0 tabular-nums">
          {num}
        </span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-4 bg-card">
        {children}
      </div>
    </div>
  )
}

// ─── PTASlider ────────────────────────────────────────────────────────────────

function PTASlider({
  label, value, onChange, min = 0, max = 100, step = 0.5, suffix = "%",
}: {
  label: string; value: string; onChange: (v: string) => void
  min?: number; max?: number; step?: number; suffix?: string
}) {
  const numVal = parseFloat(value) || 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
        <span className="text-[14px] font-bold text-emerald-700 tabular-nums min-w-[3.5rem] text-right">
          {numVal % 1 === 0 ? numVal : numVal.toFixed(1)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value || "0"}
        onChange={e => onChange(e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: '#10b981' }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60 select-none">
        <span>{min}{suffix}</span>
        <span>{Math.round((min + max) / 2)}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  )
}

// ─── PTAUploadField ───────────────────────────────────────────────────────────

interface PTAUploadFieldProps {
  label: string
  value: string               // current URL (from Airtable, for preview)
  recordId: string            // Airtable experiment record ID
  fieldName: string           // Airtable field name: "Control Image" | "Variant Image" | "PTA Result Image"
  authHeaders?: Record<string, string>
  onChange: (url: string) => void
}

function PTAUploadField({ label, value, recordId, fieldName, authHeaders, onChange }: PTAUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const previewUrl = localPreview ?? value

  async function handleFile(file: File) {
    setError(null)
    // Show a local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('recordId', recordId)
      fd.append('fieldName', fieldName)
      const res = await fetch('/api/upload-experiment-image', {
        method: 'POST',
        headers: authHeaders
          ? Object.fromEntries(Object.entries(authHeaders).filter(([k]) => k !== 'Content-Type'))
          : {},
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Upload failed')
        setLocalPreview(null)
      } else {
        const { url } = await res.json()
        onChange(url)
        // Keep the local preview until a real URL is available
        if (url) setLocalPreview(null)
      }
    } catch {
      setError('Upload failed — please try again')
      setLocalPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[12px] font-medium text-muted-foreground block">{label}</label>

      {/* Preview */}
      {previewUrl && (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
          <img
            src={previewUrl}
            alt={label}
            className="w-full max-h-36 object-contain"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        disabled={uploading || !recordId}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed text-[13px] font-medium transition-colors",
          uploading
            ? "border-emerald-300 text-emerald-600 bg-emerald-50/50 cursor-not-allowed"
            : !recordId
            ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
            : "border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/30 cursor-pointer"
        )}
      >
        {uploading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          : <><Upload className="h-4 w-4" /> {previewUrl ? "Replace Image" : "Upload Image"}</>}
      </button>

      {error && (
        <p className="text-[11px] text-rose-600 font-medium">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── PTAFormContent ───────────────────────────────────────────────────────────
// The actual form — used both in the modal and on the standalone /strategy/pta/[expId] page.

export function PTAFormContent({
  exp,
  form,
  onChange,
  onSave,
  authHeaders,
}: {
  exp: PTAExp
  form: PTAFormState
  onChange: (updates: Partial<PTAFormState>) => void
  onSave: () => void
  authHeaders?: Record<string, string>
}) {
  function toggleSegment(opt: string) {
    if (form.segmentDeploy.includes(opt)) {
      onChange({ segmentDeploy: form.segmentDeploy.filter(s => s !== opt), saved: false })
    } else {
      onChange({ segmentDeploy: [...form.segmentDeploy, opt], saved: false })
    }
  }

  const statusColors: Record<string, string> = {
    Successful: "bg-emerald-100 border-emerald-400 text-emerald-700",
    Unsuccessful: "bg-rose-100 border-rose-400 text-rose-700",
    Inconclusive: "bg-amber-100 border-amber-400 text-amber-700",
    Blocked: "bg-slate-100 border-slate-400 text-slate-700",
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
  const labelCls = "text-[12px] font-medium text-muted-foreground block"

  // Hide Performance Metrics when the test outcome doesn't produce metrics
  const showPerformanceMetrics = !["Unsuccessful", "Inconclusive", "Blocked"].includes(form.finalStatus)

  return (
    <div className="space-y-4">

      {/* Experiment header */}
      <div className="flex items-start justify-between pb-1">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground leading-snug">
            {exp.testDescription || "Untitled Experiment"}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {exp.convertId && (
              <span className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                {exp.convertId}
              </span>
            )}
            {exp.placement && (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                {exp.placement}
                {exp.placementUrl && (
                  <a href={exp.placementUrl} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-600">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
        {exp.figmaUrl && (
          <a
            href={exp.figmaUrl} target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-[12px] text-violet-600 hover:text-violet-700 font-medium ml-4 mt-0.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Figma
          </a>
        )}
      </div>

      {/* Section 01 — Final Status */}
      <PTASection num="01" title="Final Status" icon={CheckCircle2}>
        <div className="grid grid-cols-2 gap-2">
          {FINAL_STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => onChange({ finalStatus: s, saved: false })}
              className={cn(
                "py-2.5 rounded-xl border text-[13px] font-semibold transition-all",
                form.finalStatus === s
                  ? statusColors[s]
                  : "border-border text-muted-foreground hover:bg-accent/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </PTASection>

      {/* Section 02 — Performance Metrics (hidden for non-successful outcomes) */}
      {showPerformanceMetrics && <PTASection num="02" title="Performance Metrics" icon={BarChart2}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {/* Goal Metric 1 */}
          <div className="space-y-2">
            <label className={labelCls}>Goal Metric #1</label>
            <SelectField
              value={form.goalMetric1 || "Select…"}
              onChange={val => onChange({ goalMetric1: val === "Select…" ? "" : val, saved: false })}
              options={["Select…", ...GOAL_METRIC_OPTIONS]}
              containerClassName="w-full"
              className="w-full"
            />
          </div>

          {/* Metric 1 slider */}
          <PTASlider
            label="Lift #1"
            value={form.metric1Increase}
            onChange={v => onChange({ metric1Increase: v, saved: false })}
          />

          {/* Goal Metric 2 */}
          <div className="space-y-2">
            <label className={labelCls}>Goal Metric #2</label>
            <SelectField
              value={form.goalMetric2 || "Select…"}
              onChange={val => onChange({ goalMetric2: val === "Select…" ? "" : val, saved: false })}
              options={["Select…", ...GOAL_METRIC_OPTIONS]}
              containerClassName="w-full"
              className="w-full"
            />
          </div>

          {/* Metric 2 slider */}
          <PTASlider
            label="Lift #2"
            value={form.metric2Increase}
            onChange={v => onChange({ metric2Increase: v, saved: false })}
          />
        </div>

        {/* Revenue Added */}
        <div className="space-y-2 pt-1">
          <label className={labelCls}>Revenue Added (MRR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px] font-medium pointer-events-none">
              $
            </span>
            <input
              type="number" step="1" min="0"
              value={form.revenueAdded}
              onChange={e => onChange({ revenueAdded: e.target.value, saved: false })}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Confidence Level */}
        <PTASlider
          label="Confidence Level"
          value={form.confidenceLevel}
          onChange={v => onChange({ confidenceLevel: v, saved: false })}
          min={0} max={100} step={1}
        />
      </PTASection>}

      {/* Section 03 — Test Images */}
      <PTASection num="03" title="Test Images" icon={Monitor}>
        <div className="space-y-2">
          <label className={labelCls}>Image Format</label>
          <div className="flex gap-2">
            {(["Mobile", "Desktop"] as const).map(type => (
              <button
                key={type}
                onClick={() => onChange({ imageType: type, saved: false })}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-[13px] font-medium transition-colors flex items-center justify-center gap-2",
                  form.imageType === type
                    ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                    : "border-border text-muted-foreground hover:bg-accent/50"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                {type}
              </button>
            ))}
          </div>
        </div>
        <PTAUploadField
          label="Control Image"
          value={form.controlImageUrl}
          recordId={exp.id}
          fieldName="Control Image"
          authHeaders={authHeaders}
          onChange={url => onChange({ controlImageUrl: url, saved: false })}
        />
        <PTAUploadField
          label="Variant Image"
          value={form.variantImageUrl}
          recordId={exp.id}
          fieldName="Variant Image"
          authHeaders={authHeaders}
          onChange={url => onChange({ variantImageUrl: url, saved: false })}
        />
        <PTAUploadField
          label="PTA Result Image"
          value={form.ptaResultImageUrl}
          recordId={exp.id}
          fieldName="PTA Result Image"
          authHeaders={authHeaders}
          onChange={url => onChange({ ptaResultImageUrl: url, saved: false })}
        />
      </PTASection>

      {/* Section 04 — Analysis Links */}
      <PTASection num="04" title="Analysis Links" icon={Link2}>
        <div className="space-y-2">
          <label className={labelCls}>Post-Test Analysis Figma URL</label>
          <input
            type="url" value={form.figmaUrl}
            onChange={e => onChange({ figmaUrl: e.target.value, saved: false })}
            placeholder="https://figma.com/file/..."
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Results Video URL (Loom)</label>
          <input
            type="url" value={form.resultsVideoUrl}
            onChange={e => onChange({ resultsVideoUrl: e.target.value, saved: false })}
            placeholder="https://loom.com/share/..."
            className={inputCls}
          />
        </div>
      </PTASection>

      {/* Section 05 — Segment Deploy */}
      <PTASection num="05" title="Segment Deploy Applied To" icon={Users}>
        <div className="flex flex-wrap gap-2">
          {PTA_SEGMENT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleSegment(opt)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all",
                form.segmentDeploy.includes(opt)
                  ? "bg-emerald-100 border-emerald-400 text-emerald-700 shadow-sm"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {form.segmentDeploy.length > 0 && (
          <p className="text-[12px] text-emerald-700 font-medium">
            {form.segmentDeploy.length} segment{form.segmentDeploy.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </PTASection>

      {/* Section 06 — Analysis */}
      <PTASection num="06" title="Analysis" icon={FileText}>
        <div className="space-y-2">
          <label className={labelCls}>What Happened &amp; What We Learned</label>
          <textarea
            value={form.description}
            onChange={e => onChange({ description: e.target.value, saved: false })}
            placeholder="Describe what happened and what we learned from this test…"
            rows={4}
            className={cn(inputCls, "resize-none")}
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Next Steps (Action)</label>
          <textarea
            value={form.nextSteps}
            onChange={e => onChange({ nextSteps: e.target.value, saved: false })}
            placeholder="What are the next steps based on this test?"
            rows={2}
            className={cn(inputCls, "resize-none")}
          />
        </div>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 cursor-pointer hover:bg-accent/30 transition-colors">
          <input
            type="checkbox"
            checked={form.deployed}
            onChange={e => onChange({ deployed: e.target.checked, saved: false })}
            className="h-4 w-4 rounded border-border"
            style={{ accentColor: '#10b981' }}
          />
          <span className="text-[13px] font-medium text-foreground">Deployed</span>
          {form.deployed && (
            <span className="ml-auto text-[11px] font-semibold text-emerald-600">✓ Active</span>
          )}
        </label>
      </PTASection>

      {/* Save */}
      {form.saved ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold">
          <CheckCircle2 className="h-4 w-4" /> Post-Test Analysis saved!
        </div>
      ) : (
        <button
          onClick={onSave}
          disabled={form.saving}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
        >
          {form.saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Save className="h-4 w-4" /> Save Post-Test Analysis</>}
        </button>
      )}
    </div>
  )
}

// ─── PTAModal ─────────────────────────────────────────────────────────────────

export function PTAModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { user } = useUser()

  const authHeaders: Record<string, string> = user
    ? {
        "Content-Type": "application/json",
        "x-user-role": user.role,
        "x-user-id": user.id,
        "x-user-name": user.name,
        ...(user.clientId ? { "x-client-id": user.clientId } : {}),
      }
    : { "Content-Type": "application/json" }

  // Fetch experiments using the record IDs from the "Experiments Attached (from Batch)" lookup
  const expIds = task.experimentIds ?? []
  const filterExtra = expIds.length > 0
    ? expIds.length === 1
      ? `RECORD_ID() = "${expIds[0]}"`
      : `OR(${expIds.map(id => `RECORD_ID() = "${id}"`).join(", ")})`
    : undefined

  const { data: rawExps, isLoading: expsLoading } = useAirtable<Record<string, unknown>>("experiments", {
    fields: [
      "Test Description", "Placement", "Placement URL", "Convert Experiment ID", "FIGMA Url",
      "Image Type", "Control Image", "Variant Image", "PTA Result Image",
      "Post-Test Analysis (Loom)", "Goal Metric 1", "Metric #1 Increase",
      "Goal Metric 2", "Metric #2 Increase", "Revenue Added (MRR) (Regular Format)",
      "Confidence Level", "Test Status", "Segment Deploy Applied to",
      "Describe what happened & what we learned", "Next Steps (Action)", "Deployed",
    ],
    filterExtra,
    enabled: expIds.length > 0,
  })

  // Fetch variants for this batch using the batch record ID
  const batchRecId = task.batchRecordId ?? ""
  const variantFilter = batchRecId
    ? `FIND("${batchRecId}", CONCATENATE({Batch Record ID (from Experiments)})) > 0`
    : undefined

  const { data: rawVariants, isLoading: variantsLoading } = useAirtable<Record<string, unknown>>("variants", {
    fields: ["Variant Name", "Test Description (from Experiments)", "Preview URL", "Traffic %"],
    filterExtra: variantFilter,
    enabled: !!batchRecId,
  })

  const experiments = useMemo<PTAExp[]>(() => {
    return (rawExps ?? []).map(r => {
      const f = r.fields as Record<string, unknown>
      const segRaw = f["Segment Deploy Applied to"]
      return {
        id: r.id,
        testDescription: (f["Test Description"] as string) ?? "",
        placement: (f["Placement"] as string) ?? "",
        placementUrl: (f["Placement URL"] as string) ?? "",
        convertId: (f["Convert Experiment ID"] as string) ?? "",
        figmaUrl: (f["FIGMA Url"] as string) ?? "",
        imageType: ((f["Image Type"] as string) ?? "") as "Mobile" | "Desktop" | "",
        controlImageUrl: getAttachmentUrl(f["Control Image"]),
        variantImageUrl: getAttachmentUrl(f["Variant Image"]),
        ptaResultImageUrl: getAttachmentUrl(f["PTA Result Image"]),
        ptaLoomUrl: (f["Post-Test Analysis (Loom)"] as string) ?? "",
        goalMetric1: (f["Goal Metric 1"] as string) ?? "",
        metric1Increase: typeof f["Metric #1 Increase"] === "number" ? (f["Metric #1 Increase"] as number) : null,
        goalMetric2: (f["Goal Metric 2"] as string) ?? "",
        metric2Increase: typeof f["Metric #2 Increase"] === "number" ? (f["Metric #2 Increase"] as number) : null,
        revenueAdded: typeof f["Revenue Added (MRR) (Regular Format)"] === "number" ? (f["Revenue Added (MRR) (Regular Format)"] as number) : null,
        confidenceLevel: typeof f["Confidence Level"] === "number" ? (f["Confidence Level"] as number) : null,
        testStatus: (f["Test Status"] as string) ?? "",
        segmentDeploy: Array.isArray(segRaw) ? (segRaw as string[]) : segRaw ? [segRaw as string] : [],
        description: (f["Describe what happened & what we learned"] as string) ?? "",
        nextSteps: (f["Next Steps (Action)"] as string) ?? "",
        deployed: !!f["Deployed"],
      }
    })
  }, [rawExps])

  // Group variants by experiment name
  const variantsByExp = useMemo<Record<string, PTAVariant[]>>(() => {
    const map: Record<string, PTAVariant[]> = {}
    for (const r of rawVariants ?? []) {
      const f = r.fields as Record<string, unknown>
      const nameRaw = f["Test Description (from Experiments)"]
      const expName = Array.isArray(nameRaw) ? (nameRaw[0] as string) ?? "" : (nameRaw as string) ?? ""
      const v: PTAVariant = {
        id: r.id,
        variantName: (f["Variant Name"] as string) ?? "Untitled Variant",
        experimentName: expName,
        previewUrl: (f["Preview URL"] as string) ?? "",
        traffic: (f["Traffic %"] as string) ?? "",
      }
      if (!map[expName]) map[expName] = []
      map[expName].push(v)
    }
    return map
  }, [rawVariants])

  // Selected experiment (defaults to first)
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null)
  const activeExp = (selectedExpId ? experiments.find(e => e.id === selectedExpId) : null) ?? experiments[0] ?? null

  // PTA form state per experiment
  const [ptaState, setPtaState] = useState<Record<string, PTAFormState>>({})

  function getPtaForm(exp: PTAExp): PTAFormState {
    return ptaState[exp.id] ?? initPTAForm(exp)
  }

  function updatePtaForm(expId: string, updates: Partial<PTAFormState>) {
    setPtaState(prev => {
      const base = prev[expId] ?? initPTAForm(experiments.find(e => e.id === expId)!)
      return { ...prev, [expId]: { ...base, ...updates } }
    })
  }

  async function handleSave(exp: PTAExp) {
    const form = getPtaForm(exp)
    updatePtaForm(exp.id, { saving: true, saved: false })
    try {
      const fields: Record<string, unknown> = {
        "Image Type": form.imageType || null,
        "FIGMA Url": form.figmaUrl || null,
        "Post-Test Analysis (Loom)": form.resultsVideoUrl || null,
        "Goal Metric 1": form.goalMetric1 || null,
        "Metric #1 Increase": form.metric1Increase ? parseFloat(form.metric1Increase) : null,
        "Goal Metric 2": form.goalMetric2 || null,
        "Metric #2 Increase": form.metric2Increase ? parseFloat(form.metric2Increase) : null,
        "Revenue Added (MRR) (Regular Format)": form.revenueAdded ? parseFloat(form.revenueAdded) : null,
        "Confidence Level": form.confidenceLevel ? parseFloat(form.confidenceLevel) : null,
        "Test Status": form.finalStatus || null,
        "Segment Deploy Applied to": form.segmentDeploy,
        "Describe what happened & what we learned": form.description || null,
        "Next Steps (Action)": form.nextSteps || null,
        "Deployed": form.deployed,
      }
      // Images are uploaded directly via /api/upload-experiment-image — not re-saved here
      await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      updatePtaForm(exp.id, { saving: false, saved: true })
    } catch {
      updatePtaForm(exp.id, { saving: false })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Strip */}
        <div className="h-1.5 bg-emerald-500 shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between shrink-0">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold mb-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              Strategy
            </span>
            <h2 className="text-[15px] font-semibold text-foreground">Submit Post-Test Analysis</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{task.client}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT — Experiment list + variant viewer */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden bg-muted/10">

            {/* Experiment list header */}
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Experiments ({experiments.length})
              </p>
            </div>

            {/* Experiment list */}
            <div className="overflow-y-auto flex-1">
              {expsLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground p-4">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : experiments.length === 0 ? (
                <p className="text-[12px] text-muted-foreground italic p-4">No experiments found for this batch.</p>
              ) : experiments.map(exp => {
                const isActive = activeExp?.id === exp.id
                const saved = ptaState[exp.id]?.saved
                return (
                  <button
                    key={exp.id}
                    onClick={() => setSelectedExpId(exp.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-border/50 transition-colors",
                      isActive ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-accent/50"
                    )}
                  >
                    <ChevronRight className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", isActive ? "text-emerald-600" : "text-transparent")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[13px] font-medium leading-tight", isActive ? "text-emerald-700" : "text-foreground")}>
                        {exp.testDescription || "Untitled Experiment"}
                      </p>
                      {exp.convertId && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{exp.convertId}</p>}
                      {(saved || exp.testStatus) && (
                        <span className={cn(
                          "inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                          saved ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                        )}>
                          {saved ? "✓ Saved" : exp.testStatus}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Variant viewer for selected experiment */}
            {activeExp && (
              <div className="border-t border-border shrink-0 bg-card overflow-y-auto" style={{ maxHeight: 260 }}>
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Variant Data</p>
                </div>
                <div className="p-3 space-y-3">
                  {activeExp.controlImageUrl && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground font-medium">Control</p>
                      <img src={activeExp.controlImageUrl} alt="Control"
                        className="w-full rounded-lg border border-border object-contain bg-muted/20" style={{ maxHeight: 80 }} />
                    </div>
                  )}
                  {activeExp.variantImageUrl && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground font-medium">Variant</p>
                      <img src={activeExp.variantImageUrl} alt="Variant"
                        className="w-full rounded-lg border border-border object-contain bg-muted/20" style={{ maxHeight: 80 }} />
                    </div>
                  )}
                  {(() => {
                    const variants = variantsByExp[activeExp.testDescription] ?? []
                    if (!variants.length && !activeExp.controlImageUrl && !activeExp.variantImageUrl) {
                      return <p className="text-[12px] text-muted-foreground italic">No variant data yet.</p>
                    }
                    if (!variants.length) return null
                    return (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground font-medium">Live Variants</p>
                        {variantsLoading
                          ? <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
                          : variants.map(v => (
                            <div key={v.id} className="flex items-center justify-between gap-2">
                              <span className="text-[12px] text-foreground truncate">{v.variantName}</span>
                              {v.previewUrl && (
                                <a href={v.previewUrl} target="_blank" rel="noopener noreferrer"
                                  className="shrink-0 text-[11px] text-sky-600 hover:text-sky-700 flex items-center gap-1">
                                  <Eye className="h-3 w-3" /> Preview
                                </a>
                              )}
                            </div>
                          ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — PTA form for selected experiment */}
          {activeExp ? (
            <div className="flex-1 overflow-y-auto p-6">
              <PTAFormContent
                exp={activeExp}
                form={getPtaForm(activeExp)}
                onChange={updates => updatePtaForm(activeExp.id, updates)}
                onSave={() => handleSave(activeExp)}
                authHeaders={authHeaders}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[13px] text-muted-foreground">
              {expsLoading
                ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading experiments…</div>
                : "No experiments found for this batch."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between shrink-0">
          <p className="text-[12px] text-muted-foreground">
            {experiments.length} experiment{experiments.length !== 1 ? "s" : ""} in batch
          </p>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
