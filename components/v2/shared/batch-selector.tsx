"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AirtableRecord, BatchFields } from "@/lib/v2/types"

function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number)
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "-"
  }
}

interface BatchSelectorProps {
  batches: AirtableRecord<BatchFields>[]
  selectedBatchId?: string
  onSelect: (batchId: string) => void
  excludeBatchId?: string
}

export function BatchSelector({ batches, selectedBatchId, onSelect, excludeBatchId }: BatchSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredBatches = batches.filter((batch) => {
    // Exclude already selected batch and batches that have launched
    if (excludeBatchId && batch.id === excludeBatchId) return false
    const launchDate = batch.fields["Launch Date"] ? new Date(batch.fields["Launch Date"]) : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const hasLaunched = launchDate && launchDate < today

    if (hasLaunched) return false

    // Filter by search term
    const key = batch.fields["Batch Key"] || ""
    return key.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const selectedBatch = batches.find((b) => b.id === selectedBatchId)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Batch</label>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full justify-start text-left font-normal"
        >
          {selectedBatch ? (
            <div className="flex items-center gap-2">
              <span>{selectedBatch.fields["Batch Key"]}</span>
              <Badge variant="secondary" className="text-xs">
                {formatDate(selectedBatch.fields["Launch Date"])}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">Select a batch...</span>
          )}
        </Button>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Batch</DialogTitle>
            <DialogDescription>
              Choose a batch for this experiment. Only future batches that haven't launched are available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredBatches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {batches.length === 0 ? "No batches available" : "No matching batches found"}
                </p>
              ) : (
                filteredBatches.map((batch) => (
                  <Card
                    key={batch.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onSelect(batch.id)
                      setOpen(false)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{batch.fields["Batch Key"]}</p>
                          <p className="text-xs text-muted-foreground">
                            Launch: {formatDate(batch.fields["Launch Date"])}
                          </p>
                        </div>
                        <Badge variant="outline">{batch.fields["All Tests Status"] || "In Progress"}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
