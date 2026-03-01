"use client"

import { useState } from "react"
import { X, Plus, Trash2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  title: string
  client: string
  department: string
  dueDate: string
  status: string
  assigned: string
  batchId?: string
  experiments?: { id: string; name: string }[]
}

// Management Task Detail Modal - Shows task details
export function ManagementTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <span className="text-[12px] font-medium text-muted-foreground">Department</span>
            <p className="text-[14px] text-foreground mt-1">Sales</p>
          </div>
          <div>
            <span className="text-[12px] font-medium text-muted-foreground">Due Date</span>
            <p className="text-[14px] text-foreground mt-1">{new Date(task.dueDate).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-[12px] font-medium text-muted-foreground">Status</span>
            <p className="text-[14px] text-foreground mt-1">{task.status}</p>
          </div>
          <div>
            <span className="text-[12px] font-medium text-muted-foreground">Description</span>
            <p className="text-[13px] text-muted-foreground mt-1">
              This is a scheduled sales call or meeting with a potential client.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Tests Running Modal - Launch Tests with Confirmation
export function LaunchTestsModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleLaunch = () => {
    console.log("[v0] Launching tests for batch:", task.batchId)
    onClose()
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Confirm Launch</h2>
                <p className="text-[13px] text-muted-foreground">This action will launch tests in Convert</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Confirming this will launch these tests in Convert. Are you sure?
            </p>
          </div>
          <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLaunch}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium transition-colors"
            >
              Launch Tests
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Launch Tests</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{task.client}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-muted-foreground">
            The following experiments are ready to launch:
          </p>
          <div className="space-y-2">
            {task.experiments?.map((exp) => (
              <div key={exp.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-accent/30">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[13px] font-medium text-foreground">{exp.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium transition-colors"
          >
            Launch Tests
          </button>
        </div>
      </div>
    </div>
  )
}

// Submit Strategy Modal - Add test ideas and notify client
export function SubmitStrategyModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [testIdeas, setTestIdeas] = useState<{ id: string; name: string; description: string }[]>([
    { id: "1", name: "", description: "" }
  ])
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false)

  const addTestIdea = () => {
    setTestIdeas([...testIdeas, { id: Date.now().toString(), name: "", description: "" }])
  }

  const removeTestIdea = (id: string) => {
    setTestIdeas(testIdeas.filter(idea => idea.id !== id))
  }

  const updateTestIdea = (id: string, field: 'name' | 'description', value: string) => {
    setTestIdeas(testIdeas.map(idea => 
      idea.id === id ? { ...idea, [field]: value } : idea
    ))
  }

  const handleNotifyClient = () => {
    console.log("[v0] Notifying client with test ideas:", testIdeas)
    onClose()
  }

  if (showNotifyConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Notify Client</h2>
                <p className="text-[13px] text-muted-foreground">Confirm sending strategy</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">
              This will send the strategy document with {testIdeas.filter(t => t.name).length} test ideas to {task.client}. Continue?
            </p>
          </div>
          <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
            <button
              onClick={() => setShowNotifyConfirm(false)}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNotifyClient}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors"
            >
              Send Strategy
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Submit Strategy</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{task.client} • Batch {task.batchId}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {testIdeas.map((idea, idx) => (
              <div key={idea.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-muted-foreground">Test Idea {idx + 1}</span>
                  {testIdeas.length > 1 && (
                    <button
                      onClick={() => removeTestIdea(idea.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-rose-50 transition-colors group"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-rose-600" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                    Test Name
                  </label>
                  <input
                    type="text"
                    value={idea.name}
                    onChange={(e) => updateTestIdea(idea.id, 'name', e.target.value)}
                    placeholder="e.g., Hero CTA Button Color Test"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                    Description / Hypothesis
                  </label>
                  <textarea
                    value={idea.description}
                    onChange={(e) => updateTestIdea(idea.id, 'description', e.target.value)}
                    placeholder="Describe the test hypothesis and expected impact..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addTestIdea}
              className="w-full py-3 rounded-lg border-2 border-dashed border-border hover:border-sky-400 hover:bg-sky-50/50 transition-colors flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-sky-600"
            >
              <Plus className="h-4 w-4" />
              Add Another Test Idea
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-medium transition-colors"
          >
            Save & Close
          </button>
          <button
            onClick={() => setShowNotifyConfirm(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors"
          >
            Notify Client
          </button>
        </div>
      </div>
    </div>
  )
}
