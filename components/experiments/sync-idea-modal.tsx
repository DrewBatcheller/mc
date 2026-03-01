"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Idea {
  client: string
  name: string
  hypothesis: string
  rationale: string
  placementLabel: string
  placementUrl: string
  goals: string[]
  devices: string
  geos: string
  createdBy: string
}

interface SyncIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  idea: Idea
}

// Mock data for clients and their team members
const clientTeamData: Record<string, { strategist?: string; designer?: string; developer?: string; qa?: string; batches: string[] }> = {
  "The Ayurveda Experience": { strategist: "Connor Shelefontiuk", designer: "Tobi Akinloye", developer: "Ivan Guzman", qa: "Anna Aniksieva", batches: ["Q1 2024 - Organic Growth", "Q1 2024 - Paid Performance", "Evergreen Tests"] },
  "Vita Hustle": { strategist: "Sarah Johnson", designer: "Marcus Lee", developer: "Elena Rodriguez", qa: "James Park", batches: ["Subscription Growth", "AOV Optimization", "Monthly Tests"] },
  "Cosara": { strategist: "Connor Shelefontiuk", designer: "Tobi Akinloye", developer: "Ivan Guzman", qa: "Anna Aniksieva", batches: ["Premium Positioning", "Conversion Focus", "Engagement Series"] },
  "Fake Brand": { strategist: "Alex Chen", designer: "Jordan Smith", developer: "Pat Miller", qa: "Casey Brown", batches: ["Brand Launch", "Q2 Tests", "Mobile First"] },
  "Dr Woof Apparel": { strategist: "Taylor Davis", designer: "Morgan White", developer: "Riley Jackson", qa: "Casey Black", batches: ["Loyalty Program", "Holiday Campaign", "Community Growth"] },
  "Unassigned": { batches: ["General Testing"] },
}

export function SyncIdeaModal({ isOpen, onClose, idea }: SyncIdeaModalProps) {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [strategist, setStrategist] = useState<string | null>(clientTeamData[idea.client]?.strategist || null)
  const [designer, setDesigner] = useState<string | null>(clientTeamData[idea.client]?.designer || null)
  const [developer, setDeveloper] = useState<string | null>(clientTeamData[idea.client]?.developer || null)
  const [qa, setQa] = useState<string | null>(clientTeamData[idea.client]?.qa || null)

  const clientData = clientTeamData[idea.client] || {}
  const batches = clientData.batches || []

  const handleSubmit = () => {
    if (!selectedBatch) {
      alert("Please select a batch")
      return
    }
    console.log("Syncing idea to batch:", {
      idea: idea.name,
      batch: selectedBatch,
      strategist,
      designer,
      developer,
      qa,
      videoUrl,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl border border-border max-w-md w-full mx-4 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sync Test Idea to {idea.client}</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Convert this Test Idea to an Experiment for {idea.client} and sync it to a Batch you select below</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Select Batch */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">
              Select Batch to Sync to <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {selectedBatch ? (
                <div className="h-10 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] flex items-center justify-between">
                  <span>{selectedBatch}</span>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedBatch(batches[0] || "")}
                  className="h-10 px-4 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-[13px] font-medium transition-colors flex items-center gap-2"
                >
                  <span>+</span> Select
                </button>
              )}
              {selectedBatch && batches.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10">
                  {batches.map((batch) => (
                    <button
                      key={batch}
                      onClick={() => setSelectedBatch(batch)}
                      className="w-full text-left px-4 py-2 text-[13px] text-foreground hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      {batch}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Strategist */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                Strategist <span className="text-red-500">*</span>
              </label>
              {strategist ? (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center justify-between">
                  <span className="text-[13px] text-foreground">{strategist}</span>
                  <button
                    onClick={() => setStrategist(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center text-muted-foreground text-[13px]">
                  None selected
                </div>
              )}
            </div>

            {/* Designer */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                Designer <span className="text-red-500">*</span>
              </label>
              {designer ? (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center justify-between">
                  <span className="text-[13px] text-foreground">{designer}</span>
                  <button
                    onClick={() => setDesigner(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center text-muted-foreground text-[13px]">
                  None selected
                </div>
              )}
            </div>

            {/* Developer */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                Developer <span className="text-red-500">*</span>
              </label>
              {developer ? (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center justify-between">
                  <span className="text-[13px] text-foreground">{developer}</span>
                  <button
                    onClick={() => setDeveloper(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center text-muted-foreground text-[13px]">
                  None selected
                </div>
              )}
            </div>

            {/* QA */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">
                QA <span className="text-red-500">*</span>
              </label>
              {qa ? (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center justify-between">
                  <span className="text-[13px] text-foreground">{qa}</span>
                  <button
                    onClick={() => setQa(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center text-muted-foreground text-[13px]">
                  None selected
                </div>
              )}
            </div>
          </div>

          {/* Walkthrough Video URL */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Walkthrough Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video"
              className="w-full h-10 px-4 rounded-lg border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border bg-card text-foreground text-[13px] font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 h-9 rounded-lg bg-teal-700 text-white text-[13px] font-medium hover:bg-teal-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
