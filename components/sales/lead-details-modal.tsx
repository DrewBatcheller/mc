"use client"

import { useState, useEffect } from "react"
import { X, Check, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface Lead {
  email:     string
  name:      string
  stage:     string
  timezone:  string
  phone:     string
  company:   string
  website:   string
  dealValue: string  // display string e.g. "$5,000" or "-"
  source:    string
  medium:    string
  created:   string  // formatted display date
}

interface LeadDetailsModalProps {
  isOpen:    boolean
  lead?:     Lead | null
  onClose:   () => void
  onSave?:   (lead: Lead) => void
  onDelete?: (lead: Lead) => void
}

/* ── Config ─────────────────────────────────────────────────────────────────── */

const stageOptions  = ["Open", "Qualifying Call", "Sales Call", "Onboarding Call", "Closed", "Maybe", "No Show", "Churned / Rejected"]
const sourceOptions = ["—", "direct", "fb", "ig", "email", "referral", "other"]
const mediumOptions = ["—", "organic", "paid", "referral"]

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

/* ── Empty form ─────────────────────────────────────────────────────────────── */

const EMPTY_LEAD: Lead = {
  email: "", name: "", stage: "Open", timezone: "",
  phone: "", company: "", website: "", dealValue: "",
  source: "", medium: "", created: "",
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export function LeadDetailsModal({ isOpen, lead, onClose, onSave, onDelete }: LeadDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData,  setFormData]  = useState<Lead>(lead ?? EMPTY_LEAD)

  const isCreateMode  = !lead
  const isDisplayMode = !!lead && !isEditing

  useEffect(() => {
    if (lead) {
      setFormData(lead)
      setIsEditing(false)
    } else {
      setFormData(EMPTY_LEAD)
      setIsEditing(true)
    }
  }, [lead])

  const set = (key: keyof Lead, val: string) =>
    setFormData(prev => ({ ...prev, [key]: val }))

  const handleSave = () => {
    onSave?.(formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (isCreateMode) {
      onClose()
    } else {
      setFormData(lead!)
      setIsEditing(false)
    }
  }

  if (!isOpen) return null

  const headerBg  = stageBg[formData.stage]  ?? "bg-slate-50"
  const headerDot = stageDot[formData.stage] ?? "bg-slate-400"

  const INPUT_CLS  = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"

  /* ── View-mode field helper ── */
  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className="text-[13px] text-foreground">{value || "—"}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* ── Header — color tracks stage ── */}
        <div className={cn(
          "rounded-t-xl px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0 transition-colors",
          headerBg
        )}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0 transition-colors", headerDot)} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground leading-tight truncate">
                {isCreateMode ? "New Lead" : (formData.name || formData.email || "Lead")}
              </h2>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {isCreateMode
                  ? "Add a new lead to the pipeline"
                  : (formData.email || formData.company || formData.stage)}
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

          {isDisplayMode ? (
            /* ───── VIEW MODE ───── */
            <>
              {/* Row 1: Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email"  value={formData.email} />
                <Field label="Phone"  value={formData.phone} />
              </div>

              {/* Row 2: Company + Timezone */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company / Brand" value={formData.company} />
                <Field label="Timezone"        value={formData.timezone} />
              </div>

              {/* Website */}
              {formData.website && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Website</p>
                  <a
                    href={formData.website.startsWith("http") ? formData.website : `https://${formData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-sky-600 hover:underline truncate block"
                  >
                    {formData.website}
                  </a>
                </div>
              )}

              {/* Pill badges row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Stage pill */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border border-border",
                  stageBg[formData.stage] ?? "bg-accent"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", headerDot)} />
                  {formData.stage}
                </span>

                {/* Deal Value */}
                {formData.dealValue && formData.dealValue !== "-" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
                    {formData.dealValue}
                  </span>
                )}

                {/* Source */}
                {formData.source && formData.source !== "-" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border border-border bg-accent text-muted-foreground">
                    {formData.source}
                  </span>
                )}

                {/* Medium */}
                {formData.medium && formData.medium !== "-" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border border-border bg-accent text-muted-foreground">
                    {formData.medium}
                  </span>
                )}
              </div>

              {/* Created date */}
              {formData.created && (
                <p className="text-[12px] text-muted-foreground">
                  Added {formData.created}
                </p>
              )}
            </>
          ) : (
            /* ───── EDIT / CREATE MODE ───── */
            <>
              {/* Full Name */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-1">
                  Full Name {isCreateMode && <span className="text-red-400">*</span>}
                </p>
                <input
                  autoFocus={isCreateMode}
                  type="text"
                  value={formData.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="Jane Smith"
                  className={INPUT_CLS}
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Email</p>
                  <input type="email" value={formData.email} onChange={e => set("email", e.target.value)}
                    placeholder="jane@example.com" className={INPUT_CLS} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Phone</p>
                  <input type="tel" value={formData.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="+1 (555) 000-0000" className={INPUT_CLS} />
                </div>
              </div>

              {/* Company + Timezone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Company / Brand</p>
                  <input type="text" value={formData.company} onChange={e => set("company", e.target.value)}
                    placeholder="Acme Inc" className={INPUT_CLS} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Timezone</p>
                  <input type="text" value={formData.timezone} onChange={e => set("timezone", e.target.value)}
                    placeholder="EST" className={INPUT_CLS} />
                </div>
              </div>

              {/* Website */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-1">Website</p>
                <input type="text" value={formData.website} onChange={e => set("website", e.target.value)}
                  placeholder="https://example.com" className={INPUT_CLS} />
              </div>

              {/* Stage pill + Deal Value row */}
              <div className="flex flex-wrap items-center gap-2">
                <SelectField
                  value={formData.stage}
                  onChange={v => set("stage", v)}
                  options={stageOptions}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px] font-medium border-border",
                    stageBg[formData.stage] ?? "bg-accent"
                  )}
                />
                <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                  <span className="text-[12px] text-muted-foreground shrink-0">Deal</span>
                  <input
                    type="text"
                    value={formData.dealValue}
                    onChange={e => set("dealValue", e.target.value)}
                    placeholder="$5,000"
                    className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Source + Medium */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">UTM Source</p>
                  <SelectField
                    value={formData.source || "—"}
                    onChange={v => set("source", v === "—" ? "" : v)}
                    options={sourceOptions}
                    containerClassName="w-full"
                    className="w-full"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">UTM Medium</p>
                  <SelectField
                    value={formData.medium || "—"}
                    onChange={v => set("medium", v === "—" ? "" : v)}
                    options={mediumOptions}
                    containerClassName="w-full"
                    className="w-full"
                  />
                </div>
              </div>
            </>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-2 shrink-0">
          {isDisplayMode ? (
            <>
              <button
                onClick={() => onDelete?.(lead!)}
                className="flex items-center gap-1.5 text-[13px] font-medium text-destructive hover:opacity-80 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="ml-auto px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Lead
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="ml-auto px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {isCreateMode ? "Create Lead" : "Save Changes"}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
