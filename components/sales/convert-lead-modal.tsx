"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
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

interface ConvertLeadModalProps {
  isOpen: boolean
  lead: Lead | null
  onClose: () => void
  onConvert: () => void
}

const planTypes = ["Starter", "Growth", "Enterprise", "Custom"]
const teamMembers = ["Alice Johnson", "Bob Smith", "Carol Williams", "David Brown", "Emma Davis", "Frank Miller", "Grace Wilson", "Henry Moore"]

function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
  let password = ""
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export function ConvertLeadModal({ isOpen, lead, onClose, onConvert }: ConvertLeadModalProps) {
  const [planType, setPlanType] = useState("Growth")
  const [devEnabled, setDevEnabled] = useState(true)
  const [devHours, setDevHours] = useState("40")
  const [password, setPassword] = useState("")
  const [strategist, setStrategist] = useState(teamMembers[0])
  const [designer, setDesigner] = useState(teamMembers[1])
  const [developer, setDeveloper] = useState(teamMembers[2])
  const [qa, setQa] = useState(teamMembers[3])
  const [createSlack, setCreateSlack] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setPassword(generatePassword())
    }
  }, [isOpen])

  if (!isOpen || !lead) return null

  const handleConvert = () => {
    onConvert()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground leading-tight">Convert Lead to Client</h2>
            <p className="text-[13px] text-muted-foreground mt-1">{lead.name} ({lead.email})</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Plan Type */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Plan Type</label>
              <SelectField value={planType} onChange={setPlanType} options={planTypes} containerClassName="w-full" className="w-full" />
            </div>

            {/* Development Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dev-enabled"
                  checked={devEnabled}
                  onChange={(e) => setDevEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="dev-enabled" className="text-sm font-semibold text-foreground cursor-pointer">
                  Development Enabled?
                </label>
              </div>
              
              {devEnabled && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Development Hours</label>
                  <input
                    type="number"
                    value={devHours}
                    onChange={(e) => setDevHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="40"
                  />
                </div>
              )}
            </div>

            {/* Dashboard Password */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Client Dashboard Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="h-px bg-border" />

            {/* Team Members */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Assign Team Members</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Strategist</label>
                  <SelectField value={strategist} onChange={setStrategist} options={teamMembers} containerClassName="w-full" className="w-full" />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Designer</label>
                  <SelectField value={designer} onChange={setDesigner} options={teamMembers} containerClassName="w-full" className="w-full" />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Developer</label>
                  <SelectField value={developer} onChange={setDeveloper} options={teamMembers} containerClassName="w-full" className="w-full" />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">QA</label>
                  <SelectField value={qa} onChange={setQa} options={teamMembers} containerClassName="w-full" className="w-full" />
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Slack Channel Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-slack"
                checked={createSlack}
                onChange={(e) => setCreateSlack(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="create-slack" className="text-sm font-medium text-foreground cursor-pointer">
                Create Slack Channel?
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            className="px-4 py-2 text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 rounded-lg transition-colors"
          >
            Create Client
          </button>
        </div>
      </div>
    </div>
  )
}
