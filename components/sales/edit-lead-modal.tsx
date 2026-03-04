"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseCurrency } from "@/lib/transforms"
import { useUser } from "@/contexts/UserContext"
import { SelectField } from "@/components/shared/select-field"

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface EditLeadData {
  id:          string
  name:        string   // Full Name
  email:       string
  phone:       string   // Phone Number
  timezone:    string
  company:     string   // Company / Brand Name
  website:     string
  stage:       string
  dealValue:   string   // display string e.g. "$5,000" or ""
  source:      string   // UTM Source
  medium:      string   // UTM Medium
  notes:       string
  lastContact: string   // YYYY-MM-DD or ""
}

interface EditLeadModalProps {
  isOpen:   boolean
  lead:     EditLeadData | null
  onClose:  () => void
  /** Called after a successful PATCH — parent should mutate/revalidate */
  onSaved:  (updated: EditLeadData) => void
}

/* ── Config ─────────────────────────────────────────────────────────────────── */

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

/* ── Component ──────────────────────────────────────────────────────────────── */

export function EditLeadModal({ isOpen, lead, onClose, onSaved }: EditLeadModalProps) {
  const { user } = useUser()

  const authHeaders: HeadersInit = useMemo(() => user ? {
    "x-user-role": user.role,
    "x-user-id":   user.id,
    "x-user-name": user.name,
    ...(user.clientId ? { "x-client-id": user.clientId } : {}),
  } : {}, [user])

  const [form,   setForm]   = useState<EditLeadData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (lead) { setForm({ ...lead }); setError(null) }
  }, [lead])

  if (!isOpen || !form) return null

  const set = (key: keyof EditLeadData, value: string) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev)

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError(null)

    const dealNum = parseCurrency(form.dealValue)

    try {
      const res = await fetch(`/api/airtable/leads/${form.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          fields: {
            "Full Name":             form.name,
            "Email":                 form.email,
            "Phone Number":          form.phone,
            "Timezone":              form.timezone,
            "Company / Brand Name":  form.company,
            "Website":               form.website,
            "Stage":                 form.stage,
            "UTM Source":            form.source,
            "UTM Medium":            form.medium,
            ...(form.notes        ? { "Notes":        form.notes        } : {}),
            ...(form.lastContact  ? { "Last Contact": form.lastContact  } : {}),
            ...(dealNum > 0       ? { "Deal Value":   dealNum           } : {}),
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Save failed (${res.status})`)
      }

      onSaved(form)
    } catch (e: any) {
      setError(e.message ?? "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const headerBg  = stageBg[form.stage]  ?? "bg-slate-50"
  const headerDot = stageDot[form.stage] ?? "bg-slate-400"

  const INPUT_CLS  = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
  const SELECT_CLS = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* ── Header — color follows stage ── */}
        <div className={cn(
          "rounded-t-xl px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0 transition-colors",
          headerBg
        )}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0 transition-colors", headerDot)} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground leading-tight">Edit Lead</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {form.name || form.email || "No name"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4 text-foreground/60" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Full Name */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Full Name</p>
            <input
              type="text"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              className={INPUT_CLS}
              placeholder="Jane Smith"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Email</p>
              <input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                className={INPUT_CLS}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Phone</p>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                className={INPUT_CLS}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          {/* Company + Timezone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Company / Brand</p>
              <input
                type="text"
                value={form.company}
                onChange={e => set("company", e.target.value)}
                className={INPUT_CLS}
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Timezone</p>
              <input
                type="text"
                value={form.timezone}
                onChange={e => set("timezone", e.target.value)}
                className={INPUT_CLS}
                placeholder="EST"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Website</p>
            <input
              type="text"
              value={form.website}
              onChange={e => set("website", e.target.value)}
              className={INPUT_CLS}
              placeholder="https://example.com"
            />
          </div>

          {/* Stage + Deal Value — pill row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Stage — pill SelectField, header color tracks this */}
            <SelectField
              value={form.stage}
              onChange={v => set("stage", v)}
              options={STAGE_OPTIONS}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] font-medium border-border text-foreground transition-colors",
                stageBg[form.stage] ?? "bg-accent"
              )}
            />

            {/* Deal Value */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
              <span className="text-[12px] text-muted-foreground shrink-0">Deal</span>
              <input
                type="text"
                value={form.dealValue}
                onChange={e => set("dealValue", e.target.value)}
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
                value={form.source || "—"}
                onChange={v => set("source", v === "—" ? "" : v)}
                options={["—", "direct", "fb", "ig", "email", "referral", "other"]}
                containerClassName="w-full"
                className="w-full"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">UTM Medium</p>
              <SelectField
                value={form.medium || "—"}
                onChange={v => set("medium", v === "—" ? "" : v)}
                options={["—", "organic", "paid", "referral"]}
                containerClassName="w-full"
                className="w-full"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Last Contact</p>
              <input
                type="date"
                value={form.lastContact}
                onChange={e => set("lastContact", e.target.value)}
                className={SELECT_CLS}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-border pt-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Notes</p>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="Add notes about this lead…"
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
            onClick={onClose}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Check className="h-3.5 w-3.5" />
            }
            Save Changes
          </button>
        </div>

      </div>
    </div>
  )
}
