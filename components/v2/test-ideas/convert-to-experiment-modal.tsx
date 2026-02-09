"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { addBusinessDays, formatDate, getDefaultBatchDate } from "@/lib/v2/business-days"
import type { AirtableRecord, BatchFields, ExperimentIdeaFields } from "@/lib/v2/types"

interface ConvertToExperimentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  idea: AirtableRecord<ExperimentIdeaFields> | null
  clientId: string
  batches: AirtableRecord<BatchFields>[]
  teamMembers: any[]
  clientStrategist?: string
  clientDesigner?: string
  clientDeveloper?: string
  clientQA?: string
  onSuccess: () => void
}

type Step = "batch-selection" | "batch-date" | "team-assignment"

export function ConvertToExperimentModal({
  isOpen,
  onOpenChange,
  idea,
  clientId,
  batches,
  teamMembers,
  clientStrategist,
  clientDesigner,
  clientDeveloper,
  clientQA,
  onSuccess,
}: ConvertToExperimentModalProps) {
  const [step, setStep] = useState<Step>("batch-selection")
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [createNewBatch, setCreateNewBatch] = useState(false)
  const [batchDate, setBatchDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [strategistId, setStrategistId] = useState(clientStrategist || "")
  const [designerId, setDesignerId] = useState(clientDesigner || "")
  const [developerId, setDeveloperId] = useState(clientDeveloper || "")
  const [qaId, setQaId] = useState(clientQA || "")

  // Filter batches that haven't launched yet (upcoming batches)
  const upcomingBatches = useMemo(() => {
    const now = new Date()
    return batches.filter((b) => {
      if (!b.fields["Launch Date"]) return false
      const launchDate = new Date(b.fields["Launch Date"])
      return launchDate > now
    })
  }, [batches])

  // Get the latest launch date to calculate minimum new batch date
  const latestBatchDate = useMemo(() => {
    if (upcomingBatches.length === 0) return undefined
    const dates = upcomingBatches
      .map((b) => b.fields["Launch Date"])
      .filter(Boolean) as string[]
    if (dates.length === 0) return undefined
    return dates.sort().reverse()[0]
  }, [upcomingBatches])

  // Set default batch date when modal opens or createNewBatch changes
  useMemo(() => {
    if (createNewBatch && !batchDate) {
      const defaultDate = getDefaultBatchDate(latestBatchDate)
      setBatchDate(formatDate(defaultDate))
    }
  }, [createNewBatch, latestBatchDate, batchDate])

  // Filter team members by department
  const strategists = teamMembers.filter((t) => t.fields.Department === "Strategy")
  const designers = teamMembers.filter((t) => t.fields.Department === "Design")
  const developers = teamMembers.filter((t) => t.fields.Department === "Development")
  const qaMembers = teamMembers.filter((t) => t.fields.Department === "QA")

  const handleBatchSelection = () => {
    if (!selectedBatchId && !createNewBatch) {
      setError("Please select a batch or choose to create a new one")
      return
    }
    if (createNewBatch && !batchDate) {
      setError("Please select a launch date for the new batch")
      return
    }
    setError("")
    setStep("team-assignment")
  }

  const handleConvert = async () => {
    if (!idea || !strategistId || !designerId || !developerId || !qaId) {
      setError("Please assign all team members")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/airtable/experiments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: idea.id,
          clientId,
          batchId: createNewBatch ? null : selectedBatchId,
          newBatchLaunchDate: createNewBatch ? batchDate : null,
          strategistId,
          designerId,
          developerId,
          qaId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to convert to experiment")
      }

      onSuccess()
      onOpenChange(false)
      resetModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert to experiment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetModal = () => {
    setStep("batch-selection")
    setSelectedBatchId("")
    setCreateNewBatch(false)
    setBatchDate("")
    setError("")
    setStrategistId(clientStrategist || "")
    setDesignerId(clientDesigner || "")
    setDeveloperId(clientDeveloper || "")
    setQaId(clientQA || "")
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetModal()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convert to Experiment</DialogTitle>
          <DialogDescription>
            {idea ? `Create an experiment from "${idea.fields["Test Description"]}"` : "Create an experiment"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "batch-selection" && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Select or Create Batch</Label>

                {upcomingBatches.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">Upcoming Batches:</p>
                    {upcomingBatches.map((batch) => (
                      <label key={batch.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <input
                          type="radio"
                          name="batch"
                          value={batch.id}
                          checked={selectedBatchId === batch.id && !createNewBatch}
                          onChange={() => {
                            setSelectedBatchId(batch.id)
                            setCreateNewBatch(false)
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{batch.fields["Batch Key"]}</p>
                          <p className="text-xs text-muted-foreground">
                            Launch: {new Date(batch.fields["Launch Date"] || "").toLocaleDateString()}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="batch"
                    checked={createNewBatch}
                    onChange={() => {
                      setCreateNewBatch(true)
                      setSelectedBatchId("")
                    }}
                  />
                  <span className="font-medium text-sm">Create New Batch</span>
                </label>
              </div>

              {createNewBatch && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <Label htmlFor="batch-date">Launch Date</Label>
                  <Input
                    id="batch-date"
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    min={formatDate(getDefaultBatchDate(latestBatchDate))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {latestBatchDate
                      ? `Minimum date: 28 days after latest batch launch`
                      : `Default: 12 business days from today`}
                  </p>
                </div>
              )}

              {error && <div className="text-sm text-destructive">{error}</div>}

              <Button onClick={handleBatchSelection} className="w-full">
                Continue to Team Assignment
              </Button>
            </div>
          )}

          {step === "team-assignment" && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Assign Team Members</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Defaulted to client's assigned team. Update as needed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="strategist">Strategist</Label>
                  <Select value={strategistId} onValueChange={setStrategistId}>
                    <SelectTrigger id="strategist">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {strategists.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fields["Full Name"]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designer">Designer</Label>
                  <Select value={designerId} onValueChange={setDesignerId}>
                    <SelectTrigger id="designer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {designers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fields["Full Name"]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="developer">Developer</Label>
                  <Select value={developerId} onValueChange={setDeveloperId}>
                    <SelectTrigger id="developer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {developers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fields["Full Name"]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qa">QA</Label>
                  <Select value={qaId} onValueChange={setQaId}>
                    <SelectTrigger id="qa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {qaMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fields["Full Name"]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("batch-selection")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConvert}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Convert to Experiment"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
