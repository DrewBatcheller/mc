"use client"

import { useState } from "react"
import { X, CheckCircle2, Plus, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Experiment {
  id: string
  name: string
  figmaUrl?: string
  convertId?: string
  qaApproved?: boolean
  qaReportUrl?: string
}

interface Task {
  title: string
  client: string
  department: string
  dueDate: string
  status: string
  assigned: string
  batchId?: string
  experiments?: Experiment[]
  taskDetails?: string
}

interface TaskSubmissionModalProps {
  task: Task
  onClose: () => void
}

export function TaskSubmissionModal({ task, onClose }: TaskSubmissionModalProps) {
  const [experiments, setExperiments] = useState<Experiment[]>(task.experiments || [])
  const [hasChanges, setHasChanges] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationType, setConfirmationType] = useState<"launch" | "notify" | null>(null)
  const [testIdeas, setTestIdeas] = useState<string[]>([""])

  const handleSave = () => {
    console.log("[v0] Saving task submissions:", experiments)
    onClose()
  }

  const handleLaunchTests = () => {
    console.log("[v0] Launching tests in Convert")
    setShowConfirmation(false)
    onClose()
  }

  const handleNotifyClient = () => {
    console.log("[v0] Notifying client of strategy submission")
    setShowConfirmation(false)
    onClose()
  }

  const updateExperiment = (index: number, field: keyof Experiment, value: string | boolean) => {
    const updated = [...experiments]
    updated[index] = { ...updated[index], [field]: value }
    setExperiments(updated)
    setHasChanges(true)
  }

  const addTestIdea = () => {
    setTestIdeas([...testIdeas, ""])
    setHasChanges(true)
  }

  const updateTestIdea = (index: number, value: string) => {
    const updated = [...testIdeas]
    updated[index] = value
    setTestIdeas(updated)
    setHasChanges(true)
  }

  const removeTestIdea = (index: number) => {
    setTestIdeas(testIdeas.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  // Determine task type
  const isDesignMockups = task.title === "Submit Mockups"
  const isTestsForQA = task.title === "Submit Tests for QA"
  const isQAReports = task.title === "Submit QA Report(s)"
  const isTestsRunning = task.title === "Tests Running"
  const isSubmitStrategy = task.title === "Submit Strategy"
  const isManagementTask = task.department === "Management"

  // Confirmation Modal
  if (showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowConfirmation(false)} />
        <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {confirmationType === "launch" ? "Launch Tests in Convert" : "Notify Client"}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {confirmationType === "launch" 
                  ? "Confirming this will launch these tests in Convert. Are you sure?"
                  : "This will send an email to the client notifying them that the strategy has been submitted. Continue?"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-6 justify-end">
            <button
              onClick={() => setShowConfirmation(false)}
              className="h-9 rounded-lg bg-muted hover:bg-muted/80 px-4 text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmationType === "launch" ? handleLaunchTests : handleNotifyClient}
              className="h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-4 text-[13px] font-medium transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Management Task Details Modal
  if (isManagementTask) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
              <p className="text-[13px] text-muted-foreground mt-1">Management Task Details</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[12px] font-medium text-muted-foreground">Due Date</span>
              <p className="text-[13px] text-foreground mt-1">{task.dueDate}</p>
            </div>
            <div>
              <span className="text-[12px] font-medium text-muted-foreground">Assigned To</span>
              <p className="text-[13px] text-foreground mt-1">{task.assigned === "-" ? "Unassigned" : task.assigned}</p>
            </div>
            <div>
              <span className="text-[12px] font-medium text-muted-foreground">Status</span>
              <p className="text-[13px] text-foreground mt-1">{task.status}</p>
            </div>
            <div>
              <span className="text-[12px] font-medium text-muted-foreground">Details</span>
              <p className="text-[13px] text-muted-foreground/80 mt-1">
                {task.taskDetails || "This is a scheduled management task. No additional details available."}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="h-9 rounded-lg bg-accent hover:bg-accent/80 px-4 text-[13px] font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tests Running Modal
  if (isTestsRunning) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Launch Tests</h2>
              <p className="text-[13px] text-muted-foreground mt-1">{task.client} - Batch {task.batchId}</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-[13px] text-muted-foreground">
              The following experiments are ready to launch in Convert:
            </p>
            {experiments.map((exp, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-accent/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-[13px] font-medium text-foreground">{exp.name}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="h-9 rounded-lg bg-muted hover:bg-muted/80 px-4 text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setConfirmationType("launch")
                setShowConfirmation(true)
              }}
              className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-[13px] font-medium transition-colors"
            >
              Launch Tests
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Submit Strategy Modal
  if (isSubmitStrategy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Submit Strategy</h2>
              <p className="text-[13px] text-muted-foreground mt-1">{task.client} - Batch {task.batchId}</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-2 block">Test Ideas for Batch</label>
              <div className="space-y-2">
                {testIdeas.map((idea, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={idea}
                      onChange={(e) => updateTestIdea(i, e.target.value)}
                      placeholder={`Test idea ${i + 1}...`}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                    {testIdeas.length > 1 && (
                      <button
                        onClick={() => removeTestIdea(i)}
                        className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addTestIdea}
                className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-sky-600 hover:text-sky-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Test Idea
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="h-9 rounded-lg bg-muted hover:bg-muted/80 px-4 text-[13px] font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                setConfirmationType("notify")
                setShowConfirmation(true)
              }}
              className="h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-4 text-[13px] font-medium transition-colors"
            >
              Notify Client
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {task.client} • {task.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!task.experiments || task.experiments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-[13px]">
              No experiments in this batch
            </div>
          ) : (
            <div className="space-y-4">
              {experiments.map((exp, idx) => (
                <div
                  key={exp.id}
                  className="border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{exp.name}</h3>
                    <span className="text-[11px] text-muted-foreground font-mono">{exp.id}</span>
                  </div>

                  {/* Design Mockups - Figma URL */}
                  {isDesignMockups && (
                    <div>
                      <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                        Figma URL
                      </label>
                      <input
                        type="url"
                        value={exp.figmaUrl || ""}
                        onChange={(e) => updateExperiment(idx, "figmaUrl", e.target.value)}
                        placeholder="https://figma.com/file/..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}

                  {/* Submit for QA - Convert.com Experiment ID */}
                  {isTestsForQA && (
                    <div>
                      <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                        Convert.com Experiment ID
                      </label>
                      <input
                        type="text"
                        value={exp.convertId || ""}
                        onChange={(e) => updateExperiment(idx, "convertId", e.target.value)}
                        placeholder="EXP-10012345"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                    </div>
                  )}

                  {/* QA Report - Approve or Submit Report */}
                  {isQAReports && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            updateExperiment(idx, "qaApproved", !exp.qaApproved)
                            if (!exp.qaApproved) {
                              updateExperiment(idx, "qaReportUrl", "")
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-[13px] font-medium",
                            exp.qaApproved
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "border-border bg-background text-muted-foreground hover:bg-accent"
                          )}
                        >
                          <CheckCircle2 className={cn("h-4 w-4", exp.qaApproved && "text-emerald-600")} />
                          {exp.qaApproved ? "Approved for Launch" : "Approve Experiment"}
                        </button>
                      </div>

                      {!exp.qaApproved && (
                        <div>
                          <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                            QA Report URL (optional)
                          </label>
                          <input
                            type="url"
                            value={exp.qaReportUrl || ""}
                            onChange={(e) => updateExperiment(idx, "qaReportUrl", e.target.value)}
                            placeholder="https://docs.google.com/..."
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
              "px-4 py-2 text-[13px] font-medium rounded-lg transition-colors",
              hasChanges
                ? "bg-sky-600 text-white hover:bg-sky-700"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
