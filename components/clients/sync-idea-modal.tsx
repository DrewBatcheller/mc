"use client"

import { X } from "lucide-react"
import { useState } from "react"

interface ClientIdea {
  testDescription: string
  hypothesis: string
  rationale: string
  placement: string
  placementUrl: string
  primaryGoals: string[]
  weighting: string
  devices: string
  geos: string
  priority: string
}

interface SyncIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  idea: ClientIdea
}

export function SyncIdeaModal({ isOpen, onClose, idea }: SyncIdeaModalProps) {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [strategist, setStrategist] = useState("Connor Shelefontiuk")
  const [designer, setDesigner] = useState("Tobi Akinloye")
  const [developer, setDeveloper] = useState("Ivan Guzman")
  const [qa, setQa] = useState("Anna Anikeeva")
  const [walkthroughUrl, setWalkthroughUrl] = useState("")

  if (!isOpen) return null

  const batches = [
    { id: "batch-1", name: "Batch 1 - Q1 2024" },
    { id: "batch-2", name: "Batch 2 - Q1 2024" },
    { id: "batch-3", name: "Batch 3 - Q2 2024" },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle sync submission
    console.log("Syncing idea:", {
      idea: idea.testDescription,
      batch: selectedBatch,
      team: { strategist, designer, developer, qa },
      walkthroughUrl,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Sync Test Idea to {idea.testDescription}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Batch Selection */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Select Batch to Sync to <span className="text-red-500">*</span>
            </label>
            {selectedBatch ? (
              <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center justify-between">
                <span className="text-sm text-foreground">
                  {batches.find((b) => b.id === selectedBatch)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const batch = batches[0]
                  setSelectedBatch(batch.id)
                }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex items-center gap-1.5 justify-center"
              >
                <span>+ Select</span>
              </button>
            )}
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
                    type="button"
                    onClick={() => setStrategist("")}
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
                    type="button"
                    onClick={() => setDesigner("")}
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
                    type="button"
                    onClick={() => setDeveloper("")}
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
                    type="button"
                    onClick={() => setQa("")}
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
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Walkthrough Video URL
            </label>
            <input
              type="url"
              value={walkthroughUrl}
              onChange={(e) => setWalkthroughUrl(e.target.value)}
              placeholder="e.g. https://loom.com/share/..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedBatch}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:bg-slate-400 transition-colors text-sm font-medium"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
