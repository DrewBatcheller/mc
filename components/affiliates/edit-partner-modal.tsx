"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { SelectField } from "@/components/shared/select-field"
import type { PartnerFormData } from "./add-partner-modal"

const specialties = [
  "Email Marketing",
  "Google Media Buying",
  "Full Stack Media Buying",
  "Meta Ads",
  "TikTok Ads",
  "eCommerce SEO",
  "Influencer Marketing",
  "Content Marketing",
  "Affiliate Marketing",
  "Other",
]

const commissionTypes = ["Percentage", "Flat Fee", "Tiered"]
const paymentMethods = ["Bank Transfer", "PayPal", "Check", "Crypto"]
const paymentFrequencies = ["Monthly", "Quarterly", "On Demand"]

const inputClass =
  "w-full px-3 py-1.5 text-[13px] font-medium rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-ring"

interface EditPartnerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: PartnerFormData) => void
  initialData: PartnerFormData | null
}

export function EditPartnerModal({ isOpen, onClose, onSave, initialData }: EditPartnerModalProps) {
  const [form, setForm] = useState<PartnerFormData | null>(initialData)

  useEffect(() => {
    if (initialData) setForm(initialData)
  }, [initialData, isOpen])

  if (!isOpen || !form) return null

  const set = (field: keyof PartnerFormData, value: string) =>
    setForm((prev) => prev ? { ...prev, [field]: value } : prev)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form) onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Edit Partner</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Update the partner details below</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Partner Information */}
          <div>
            <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Partner Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Full Name <span className="text-destructive">*</span></label>
                <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. John Smith" className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Title</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Founder, CEO" className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Agency / Company</label>
                <input value={form.agency} onChange={(e) => set("agency", e.target.value)} placeholder="e.g. Acme Agency" className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Specialty</label>
                <SelectField value={form.specialty} onChange={(v) => set("specialty", v)} options={specialties} containerClassName="w-full" className="w-full" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Email <span className="text-destructive">*</span></label>
                <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="partner@agency.com" className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Phone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 000-0000" className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Website</label>
                <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="www.agency.com" className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Location</label>
                <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City, State" className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any relevant context about this partner..."
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>
          </div>

          {/* Commission Settings */}
          <div className="border-t border-border pt-5">
            <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Commission Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Commission Type</label>
                <SelectField value={form.commissionType} onChange={(v) => set("commissionType", v)} options={commissionTypes} containerClassName="w-full" className="w-full" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">
                  {form.commissionType === "Flat Fee" ? "Amount ($)" : "Rate (%)"}
                </label>
                <input
                  value={form.commissionRate}
                  onChange={(e) => set("commissionRate", e.target.value)}
                  placeholder={form.commissionType === "Flat Fee" ? "e.g. 500" : "e.g. 10"}
                  type="number"
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Payment Method</label>
                <SelectField value={form.paymentMethod} onChange={(v) => set("paymentMethod", v)} options={paymentMethods} containerClassName="w-full" className="w-full" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Payment Frequency</label>
                <SelectField value={form.paymentFrequency} onChange={(v) => set("paymentFrequency", v)} options={paymentFrequencies} containerClassName="w-full" className="w-full" />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
