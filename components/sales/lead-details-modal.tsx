"use client"

import { useState, useEffect } from "react"
import { X, Save, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"

interface Lead {
  email: string
  name: string
  stage: string
  timezone: string
  phone: string
  company: string
  website: string
  dealValue: string
  source: string
  medium: string
  created: string
}

interface LeadDetailsModalProps {
  isOpen: boolean
  lead?: Lead | null
  onClose: () => void
  onSave?: (lead: Lead) => void
  onDelete?: (lead: Lead) => void
}

const stageOptions = ["Open", "Qualifying Call", "Sales Call", "Onboarding Call", "Closed", "Maybe", "No Show", "Churned / Rejected"]
const sourceOptions = ["direct", "fb", "ig", "email", "referral", "other"]
const mediumOptions = ["-", "organic", "paid", "referral"]

const stageBadgeColors: Record<string, string> = {
  "Open": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Qualifying Call": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Sales Call": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Onboarding Call": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  "Closed": "bg-green-500/10 text-green-600 border-green-500/20",
  "Maybe": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "No Show": "bg-gray-500/10 text-gray-600 border-gray-500/20",
  "Churned / Rejected": "bg-red-500/10 text-red-600 border-red-500/20",
}

const sourceBadgeColors: Record<string, string> = {
  "direct": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "fb": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "ig": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "email": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "referral": "bg-green-500/10 text-green-600 border-green-500/20",
  "other": "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

export function LeadDetailsModal({ isOpen, lead, onClose, onSave, onDelete }: LeadDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Lead>(
    lead || {
      email: "",
      name: "",
      stage: "Open",
      timezone: "",
      phone: "",
      company: "",
      website: "",
      dealValue: "-",
      source: "direct",
      medium: "-",
      created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }
  )

  const isCreateMode = !lead
  const isDisplayMode = lead && !isEditing

  useEffect(() => {
    if (lead) {
      setFormData(lead)
      setIsEditing(false)
    } else {
      setFormData({
        email: "",
        name: "",
        stage: "Open",
        timezone: "",
        phone: "",
        company: "",
        website: "",
        dealValue: "-",
        source: "direct",
        medium: "-",
        created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      })
      setIsEditing(true)
    }
  }, [lead])

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg border border-border shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground leading-tight">
                {isCreateMode ? "Create New Lead" : formData.name || formData.email}
              </h2>
              {!isCreateMode && formData.dealValue && formData.dealValue !== "-" && (
                <span className="text-sm font-semibold text-green-600 bg-green-500/10 px-2.5 py-1 rounded-md border border-green-500/20">
                  {formData.dealValue}
                </span>
              )}
            </div>
            {!isCreateMode && <p className="text-[13px] text-muted-foreground mt-1">{formData.email}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Contact Information</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="John Doe"
                    />
                  ) : (
                    <p className="text-[13px] text-foreground">{formData.name || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="john@example.com"
                    />
                  ) : (
                    <p className="text-[13px] text-foreground">{formData.email || "-"}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="+1 (555) 123-4567"
                    />
                  ) : (
                    <p className="text-[13px] text-foreground">{formData.phone || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Timezone</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="EST"
                    />
                  ) : formData.timezone ? (
                    <span className="inline-flex px-2.5 py-1 rounded-md border border-border bg-accent/30 text-[12px] font-medium text-foreground">
                      {formData.timezone}
                    </span>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Company Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Company Information</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Company</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Acme Inc"
                    />
                  ) : (
                    <p className="text-[13px] text-foreground">{formData.company || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Website</label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="https://example.com"
                    />
                  ) : (
                    <p className="text-[13px] text-foreground">{formData.website || "-"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Lead Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Lead Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Stage</label>
                  {isEditing ? (
                    <SelectField
                      value={formData.stage}
                      onChange={(v) => setFormData({ ...formData, stage: v })}
                      options={stageOptions}
                      containerClassName="w-full"
                      className="w-full"
                    />
                  ) : (
                    <span className={cn(
                      "inline-flex px-2.5 py-1 rounded-md border text-[12px] font-medium",
                      stageBadgeColors[formData.stage] || "bg-accent/30 text-foreground border-border"
                    )}>
                      {formData.stage}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Deal Value</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.dealValue}
                      onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="$5,000"
                    />
                  ) : (
                    <p className="text-[13px] text-foreground">{formData.dealValue || "-"}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Source</label>
                  {isEditing ? (
                    <SelectField
                      value={formData.source}
                      onChange={(v) => setFormData({ ...formData, source: v })}
                      options={sourceOptions}
                      containerClassName="w-full"
                      className="w-full"
                    />
                  ) : (
                    <span className={cn(
                      "inline-flex px-2.5 py-1 rounded-md border text-[12px] font-medium",
                      sourceBadgeColors[formData.source] || "bg-accent/30 text-foreground border-border"
                    )}>
                      {formData.source}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Medium</label>
                  {isEditing ? (
                    <SelectField
                      value={formData.medium}
                      onChange={(v) => setFormData({ ...formData, medium: v })}
                      options={mediumOptions}
                      containerClassName="w-full"
                      className="w-full"
                    />
                  ) : (
                    <span className="inline-flex px-2.5 py-1 rounded-md border border-border bg-accent/30 text-[12px] font-medium text-foreground">
                      {formData.medium}
                    </span>
                  )}
                </div>
              </div>
              {!isCreateMode && (
                <div>
                  <label className="text-[12px] text-muted-foreground font-medium block mb-1.5">Created</label>
                  <p className="text-[13px] text-foreground">{formData.created}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          {isDisplayMode && (
            <>
              <button
                onClick={() => onDelete?.(lead!)}
                className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Lead
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Lead
              </button>
            </>
          )}
          {!isDisplayMode && (
            <>
              <button
                onClick={handleCancel}
                className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                <Save className="h-3.5 w-3.5" />
                {isCreateMode ? "Create Lead" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
