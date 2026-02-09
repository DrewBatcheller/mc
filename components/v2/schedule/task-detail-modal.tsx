'use client';

import { AirtableRecord, TaskFields } from "@/lib/v2/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getStatusColor, getStatusIcon, getDeptColor, formatDate } from "@/lib/v2/schedule-utils"
import { X } from "lucide-react"

interface TaskDetailModalProps {
  task: AirtableRecord<TaskFields> | null
  isOpen: boolean
  onClose: () => void
  clientNameMap: Record<string, string>
}

export function TaskDetailModal({ task, isOpen, onClose, clientNameMap }: TaskDetailModalProps) {
  if (!task) return null

  const fields = task.fields
  const isOverdue = fields["Due Date"] && new Date(fields["Due Date"]) < new Date() && fields.Status !== "Done"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{fields["Team Facing Name"]}</DialogTitle>
              {fields["Client Facing Name"] && (
                <p className="text-sm text-muted-foreground">Client: {fields["Client Facing Name"]}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
              <div className="mt-1">
                <Badge className={getStatusColor(fields.Status)}>
                  {fields.Status || "Not Started"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Department</label>
              <div className="mt-1">
                <Badge variant="outline" className={getDeptColor(fields.Department)}>
                  {fields.Department || "-"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</label>
                <p className="text-sm mt-1">{formatDate(fields["Start Date"]) || "-"}</p>
              </CardContent>
            </Card>
            <Card className={`${isOverdue ? "bg-red-50 dark:bg-red-900/10" : "bg-muted/50"}`}>
              <CardContent className="pt-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</label>
                <p className={`text-sm mt-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                  {formatDate(fields["Due Date"]) || "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Duration</label>
                  <p className="text-sm mt-1">{fields.Duration ? `${fields.Duration} day(s)` : "-"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Assigned To</label>
                  <p className="text-sm mt-1">{fields["Assigned to"] || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batch Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Brand</label>
                <p className="text-sm mt-1">{fields["Brand Name (from Batch)"] || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Linked Test Names</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {fields["Linked Test Names (from Batch)"] ? (
                    Array.isArray(fields["Linked Test Names (from Batch)"])
                      ? fields["Linked Test Names (from Batch)"].map((test, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {test}
                          </Badge>
                        ))
                      : <Badge variant="outline" className="text-xs">{String(fields["Linked Test Names (from Batch)"])}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members by Role */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Strategist", field: "Strategist (from Experiments Attached) (from Batch)" },
                  { label: "Designer", field: "Designer (from Experiments Attached) (from Batch)" },
                  { label: "Developer", field: "Developer (from Experiments Attached) (from Batch)" },
                  { label: "QA", field: "QA (from Experiments Attached) (from Batch)" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {fields[field as keyof TaskFields] ? (
                        Array.isArray(fields[field as keyof TaskFields])
                          ? (fields[field as keyof TaskFields] as string[]).map((member, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {member}
                              </Badge>
                            ))
                          : <Badge variant="outline" className="text-xs">{String(fields[field as keyof TaskFields])}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Client & Lead */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Client</label>
                <p className="text-sm mt-1">{fields.Client || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Lead</label>
                <p className="text-sm mt-1">{fields.Lead || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
