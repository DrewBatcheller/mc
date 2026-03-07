"use client"

import { useState, useMemo } from "react"
import { X, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/UserContext"
import { SelectField } from "@/components/shared/select-field"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadCreated: () => void
}

// ─── Stage config (mirrors leads-table.tsx badge colors) ─────────────────────

const STAGE_OPTIONS = [
  "Open", "Qualifying Call", "Sales Call", "Onboarding Call",
  "Closed", "Maybe", "No Show", "Churned / Rejected",
]

const stageBg: Record<string, string> = {
  "Open":               "bg-slate-50",
  "Qualifying Call":    "bg-violet-50",
  "Sales Call":         "bg-amber-50",
  "Onboarding Call":    "bg-emerald-50",
  "Closed":             "bg-sky-50",
  "Maybe":              "bg-gray-50",
  "No Show":            "bg-rose-50",
  "Churned / Rejected": "bg-rose-50",
}

const stageDot: Record<string, string> = {
  "Open":               "bg-slate-400",
  "Qualifying Call":    "bg-violet-500",
  "Sales Call":         "bg-amber-500",
  "Onboarding Call":    "bg-emerald-500",
  "Closed":             "bg-sky-500",
  "Maybe":              "bg-gray-400",
  "No Show":            "bg-rose-400",
  "Churned / Rejected": "bg-rose-600",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateLeadModal({
  isOpen,
  onClose,
  onLeadCreated,
}: CreateLeadModalProps) {
  const { user } = useUser()

  const authHeaders: HeadersInit = useMemo(() => user ? {
    "x-user-role": user.role,
    "x-user-id":   user.id,
    "x-user-name": user.name,
    ...(user.clientId ? { "x-client-id": user.clientId } : {}),
  } : {}, [user])

  // ── Form state ────────────────────────────────────────────────────────────
  const [fullName,    setFullName]    = useState("")
  const [email,       setEmail]       = useState("")
  const [phone,       setPhone]       = useState("")
  const [timezone,    setTimezone]    = useState("")
  const [company,     setCompany]     = useState("")
  const [website,     setWebsite]     = useState("")
  const [stage,       setStage]       = useState("Open")
  const [dealValue,   setDealValue]   = useState("")
  const [source,      setSource]      = useState("")
  const [medium,      setMedium]      = useState("")
  const [notes,       setNotes]       = useState("")
  const [lastContact, setLastContact] = useState("")
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const resetForm = () => {
    setFullName(""); setEmail(""); setPhone(""); setTimezone("")
    setCompany(""); setWebsite(""); setStage("Open"); setDealValue("")
    setSource(""); setMedium(""); setNotes(""); setLastContact("")
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCreate = async () => {
    if (!fullName.trim()) {
      setError("Full name is required")
      return
    }
    setSaving(true)
    setError(null)

    try {
      const fields: Record<string, unknown> = {
        "Full Name": fullName.trim(),
        "Stage":     stage,
      }

      if (email.trim())    fields["Email"]                = email.trim()
      if (phone.trim())    fields["Phone Number"]         = phone.trim()
      if (timezone.trim()) fields["Timezone"]             = timezone.trim()
      if (company.trim())  fields["Company / Brand Name"] = company.trim()
      if (website.trim())  fields["Website"]              = website.trim()
      if (notes.trim())    fields["Notes"]                = notes.trim()
      if (lastContact)     fields["Last Contact"]         = lastContact
      if (source)          fields["UTM Source"]           = source
      if (medium)          fields["UTM Medium"]           = medium

      const dealNum = parseFloat(dealValue.replace(/[^0-9.]/g, ""))
      if (!isNaN(dealNum) && dealNum > 0) fields["Deal Value"] = dealNum

      const res = await fetch("/api/airtable/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body:    JSON.stringify({ fields }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Failed to create lead")
      }

      onLeadCreated()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lead")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const headerBg  = stageBg[stage]  ?? "bg-slate-50"
  const headerDot = stageDot[stage] ?? "bg-slate-400"

  const INPUT_CLS = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
  const SELECT_CLS = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-label="New Lead"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* ── Header — color follows stage ── */}
        <div className={cn(
          "rounded-t-xl px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0 transition-colors",
          headerBg
        )}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0 transition-colors", headerDot)} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground leading-tight">New Lead</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Add a new lead to the pipeline</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4 text-foreground/60" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Full Name */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">
              Full Name <span className="text-red-400">*</span>
            </p>
            <input
              autoFocus
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate() }}
              placeholder="Jane Smith"
              className={INPUT_CLS}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Email</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Phone</p>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Company + Timezone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Company / Brand</p>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Inc"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Timezone</p>
              <input
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                placeholder="EST"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Website</p>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className={INPUT_CLS}
            />
          </div>

          {/* Stage + Deal Value — pill row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Stage — pill SelectField, header color follows selection */}
            <SelectField
              value={stage}
              onChange={setStage}
              options={STAGE_OPTIONS}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] font-medium border-border text-foreground transition-colors",
                stageBg[stage] ?? "bg-accent"
              )}
            />

            {/* Deal Value — inline */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
              <span className="text-[12px] text-muted-foreground shrink-0">Deal</span>
              <input
                value={dealValue}
                onChange={e => setDealValue(e.target.value)}
                placeholder="$5,000"
                className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Source + Medium + Last Contact */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">UTM Source</p>
              <SelectField
                value={source || "—"}
                onChange={v => setSource(v === "—" ? "" : v)}
                options={["—", "direct", "fb", "ig", "email", "referral", "other"]}
                containerClassName="w-full"
                className="w-full"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">UTM Medium</p>
              <SelectField
                value={medium || "—"}
                onChange={v => setMedium(v === "—" ? "" : v)}
                options={["—", "organic", "paid", "referral"]}
                containerClassName="w-full"
                className="w-full"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Last Contact</p>
              <input
                type="date"
                value={lastContact}
                onChange={e => setLastContact(e.target.value)}
                className={SELECT_CLS}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-border pt-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this lead…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-600">
              {error}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-2 justify-end shrink-0">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !fullName.trim()}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Check className="h-3.5 w-3.5" />
            }
            Add Lead
          </button>
        </div>

      </div>
    </div>
  )
}
