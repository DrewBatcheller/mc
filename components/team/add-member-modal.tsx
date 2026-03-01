"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"

export interface MemberFormData {
  name: string
  email: string
  role: string
  department: string
  employment: string
  startDate: string
  slackId: string
  timezone: string
  bio: string
}

const DEPARTMENTS = ["Strategy", "QA", "Development", "Management", "Design"]
const ROLES: Record<string, string[]> = {
  Strategy: ["CRO Strategist", "Senior Strategist", "Junior Strategist"],
  QA: ["QA Lead", "QA Specialist"],
  Development: ["Lead Developer", "Developer", "Senior Developer"],
  Management: ["CEO", "COO", "Account Manager", "Project Manager"],
  Design: ["Lead Designer", "Senior Designer", "Designer"],
}
const TIMEZONES = ["EST", "CST", "MST", "PST", "GMT", "CET", "IST", "WAT", "BRT", "AEST"]
const EMPLOYMENT = ["Active", "Inactive"]

const empty = (): MemberFormData => ({
  name: "", email: "", role: "", department: "Strategy",
  employment: "Active", startDate: "", slackId: "", timezone: "EST", bio: "",
})

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: MemberFormData) => void
  initialData?: MemberFormData
  mode?: "add" | "edit"
}

export function AddMemberModal({ isOpen, onClose, onAdd, initialData, mode = "add" }: Props) {
  const [form, setForm] = useState<MemberFormData>(initialData ?? empty())
  const set = <K extends keyof MemberFormData>(k: K, v: MemberFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (isOpen) setForm(initialData ?? empty())
  }, [isOpen, initialData])

  if (!isOpen) return null

  const roleOptions = ROLES[form.department] ?? []

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) return
    onAdd(form)
    onClose()
  }

  const isEdit = mode === "edit"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold text-foreground">{isEdit ? "Edit Team Member" : "Add Team Member"}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* Account Settings */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Full Name <span className="text-destructive">*</span></label>
                <input
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Department</label>
                <SelectField
                  value={form.department}
                  onChange={v => set("department", v)}
                  options={DEPARTMENTS}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Role</label>
                <SelectField
                  value={form.role || roleOptions[0] || ""}
                  onChange={v => set("role", v)}
                  options={roleOptions}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Employment Details */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Employment Status</label>
                <SelectField
                  value={form.employment}
                  onChange={v => set("employment", v)}
                  options={EMPLOYMENT}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => set("startDate", e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => set("bio", e.target.value)}
                  placeholder="Brief description of role and responsibilities..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Email Address <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Slack ID</label>
                <input
                  value={form.slackId}
                  onChange={e => set("slackId", e.target.value)}
                  placeholder="U0XXXXXX"
                  className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Timezone</label>
                <SelectField
                  value={form.timezone}
                  onChange={v => set("timezone", v)}
                  options={TIMEZONES}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name.trim() || !form.email.trim()}
            className={cn(
              "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-opacity",
              form.name.trim() && form.email.trim()
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-foreground/30 text-background cursor-not-allowed"
            )}
          >
            {isEdit ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  )
}

