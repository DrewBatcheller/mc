"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { ExternalLink, Video, ImageIcon, FileText, Loader2, Edit2, Unlink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBatches, useVariants, useTeam } from "@/hooks/v2/use-airtable"
import type { AirtableRecord, ExperimentFields } from "@/lib/v2/types"
import { VariantDataTable } from "./variant-data-table"
import { BatchSelector } from "@/components/v2/shared/batch-selector"
import { ExperimentImageUpload } from "@/components/v2/experiment-image-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/v2/status-badge"

const GEO_OPTIONS = [
  "United States", "Canada", "Australia", "United Kingdom", "Mexico",
  "European Union", "Germany", "France", "Spain", "Italy",
  "Japan", "South Korea", "India", "Brazil", "New Zealand",
]

const GOAL_METRICS_OPTIONS = ["SCVR%", "CVR", "AOV", "RRPV", "APPV", "PPV", "CTR", "Other"]
const PRIMARY_GOALS_OPTIONS = ["CVR", "RPV", "Bug Fix", "Subscription", "AOV", "Bounce Rate", "Revenue", "LTV", "CVR/AOV", "Pricing", "Shipping Test", "Price Test", "Other", "Category", "CCVR"]
const DEPLOY_SEGMENT_OPTIONS = ["All Users", "New Users", "Returning Users", "Desktop", "iPhones", "Other phones", "iPads", "Other Tablets", "Edge", "Chrome", "Firefox", "Safari", "Campaign", "Search", "Referral", "Direct", "Other"]

function MultiSelectBadges({ options, selected, onChange, label }: { options: string[]; selected: string[]; onChange: (s: string[]) => void; label: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${selected.includes(opt) ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function getTestStatusBadge(status?: string) {
  if (!status) return <Badge variant="outline">Unknown</Badge>
  return <StatusBadge status={status} variant="solid" />
}

interface ExperimentDetailPanelProps {
  experiment: AirtableRecord<ExperimentFields>
  isClient: boolean
  onRefresh?: (updatedFields: any) => void
}

export function ExperimentDetailPanel({ experiment, isClient, onRefresh }: ExperimentDetailPanelProps) {
  const f = experiment.fields
  const [editingTab, setEditingTab] = useState<"experiment" | "pta" | null>(null)
  const [showDesyncConfirm, setShowDesyncConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedFields, setEditedFields] = useState<Partial<ExperimentFields>>(f)
  const [imageFiles, setImageFiles] = useState<{ [key: string]: File }>({})
  
  const { variants } = useVariants({ experimentId: experiment.id })
  const { batches } = useBatches()
  const { team: teamMembers } = useTeam()

  const launchDate = f["Launch Date"] ? new Date(f["Launch Date"]) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const hasLaunched = launchDate && launchDate < today

  // Parse initial values
  const initialGEOs = useMemo(() => {
    if (Array.isArray(f.GEOs)) return f.GEOs
    if (typeof f.GEOs === "string") return f.GEOs.split(",").map(g => g.trim())
    return []
  }, [f.GEOs])

  const activeTeamByDepartment = useMemo(() => ({
    strategist: teamMembers.filter(t => t.fields.Department === "Strategy" && t.fields["Employment Status"] === "Active"),
    designer: teamMembers.filter(t => t.fields.Department === "Design" && t.fields["Employment Status"] === "Active"),
    developer: teamMembers.filter(t => t.fields.Department === "Development" && t.fields["Employment Status"] === "Active"),
    qa: teamMembers.filter(t => t.fields.Department === "QA" && t.fields["Employment Status"] === "Active"),
  }), [teamMembers])

  const handleEditFieldChange = (field: keyof ExperimentFields, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      let fieldsToSave = Object.fromEntries(
        Object.entries(editedFields).filter(([key, value]) => f[key] !== value)
      )

      const numericFields = ["Metric #1 Result (%)", "Metric #1 Increase", "Metric #2 Result (%)", "Metric #2 Increase", "Revenue Added (MRR) (K Format )", "Confidence Level"]
      fieldsToSave = Object.fromEntries(
        Object.entries(fieldsToSave).map(([key, value]) => {
          if (numericFields.includes(key) && value !== "" && value !== null && value !== undefined) {
            return [key, parseFloat(value as string)]
          }
          return [key, value]
        })
      )

      // Handle image uploads
      const imageFieldNames = ["Control ImageE", "Variant ImageE", "PTA Result Image"]
      for (const fieldName of imageFieldNames) {
        if (imageFiles[fieldName]) {
          const formData = new FormData()
          formData.append("file", imageFiles[fieldName])
          formData.append("recordId", experiment.id)
          formData.append("table", "Experiments")
          
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
          const uploadData = await uploadRes.json()
          if (uploadData.url) {
            fieldsToSave[fieldName] = [{ url: uploadData.url }]
          }
        }
      }

      const response = await fetch(`/api/airtable/experiments/${experiment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fieldsToSave }),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedFields = data.record?.fields || fieldsToSave
        setEditedFields(prev => ({ ...prev, ...updatedFields }))
        setImageFiles({})
        if (onRefresh) onRefresh(updatedFields)
        setEditingTab(null)
      }
    } catch (error) {
      console.error("Failed to save changes:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 w-full">
        {/* Status Badges - Always visible */}
        <div className="flex flex-wrap items-center gap-2">
          {getTestStatusBadge(f["Test Status"])}
          {f.Placement && <Badge variant="secondary">{f.Placement}</Badge>}
          {f.Devices && <Badge variant="outline">{f.Devices}</Badge>}
          {f["Variants Weight"] && <Badge variant="outline">Split: {f["Variants Weight"]}</Badge>}
          {f["Client Approval"] && (
            <StatusBadge status={f["Client Approval"] || "Unknown"} />
          )}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="experiment" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="experiment">Experiment Data</TabsTrigger>
            <TabsTrigger value="pta">PTA Results</TabsTrigger>
          </TabsList>

          {/* EXPERIMENT DATA TAB */}
          <TabsContent value="experiment" className="space-y-4">
            {editingTab === "experiment" ? (
              <>
                {/* Edit Mode */}
                <div className="flex gap-2 justify-between">
                  <Button variant="outline" size="sm" onClick={() => setEditingTab(null)}>Back</Button>
                </div>

                <Card className="bg-teal-50 border-teal-200">
                  <CardHeader>
                    <CardTitle className="text-sm text-teal-900">Edit Experiment Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Batch */}
                    <BatchSelector
                      batches={batches}
                      selectedBatchId={editedFields.Batch?.[0]}
                      excludeBatchId={f.Batch?.[0]}
                      onSelect={(id) => handleEditFieldChange("Batch", [id])}
                    />

                    <Separator />

                    {/* Team Members */}
                    <div>
                      <label className="text-sm font-medium mb-3 block">Assigned Team Members</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "Strategist", label: "Strategist", team: activeTeamByDepartment.strategist },
                          { key: "Designer", label: "Designer", team: activeTeamByDepartment.designer },
                          { key: "Developer", label: "Developer", team: activeTeamByDepartment.developer },
                          { key: "QA", label: "QA", team: activeTeamByDepartment.qa },
                        ].map(({ key, label, team }) => (
                          <div key={key}>
                            <label className="text-xs font-medium">{label}</label>
                            <Select value={editedFields[key as keyof ExperimentFields]?.[0] || ""} onValueChange={(id) => handleEditFieldChange(key as keyof ExperimentFields, [id])}>
                              <SelectTrigger className="mt-1 bg-white">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {team.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.fields["Full Name"]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Test Description */}
                    <div>
                      <label className="text-sm font-medium">Test Description</label>
                      <Textarea value={editedFields["Test Description"] || ""} onChange={(e) => handleEditFieldChange("Test Description", e.target.value)} placeholder="Describe the test..." className="mt-2" rows={3} />
                    </div>

                    {/* Hypothesis */}
                    <div>
                      <label className="text-sm font-medium">Hypothesis</label>
                      <Textarea value={editedFields.Hypothesis || ""} onChange={(e) => handleEditFieldChange("Hypothesis", e.target.value)} placeholder="Enter hypothesis..." className="mt-2" rows={3} />
                    </div>

                    {/* Rationale */}
                    <div>
                      <label className="text-sm font-medium">Rationale</label>
                      <Textarea value={editedFields.Rationale || ""} onChange={(e) => handleEditFieldChange("Rationale", e.target.value)} placeholder="Enter rationale..." className="mt-2" rows={3} />
                    </div>

                    <Separator />

                    {/* Placement & Geo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Placement</label>
                        <Input value={editedFields.Placement || ""} onChange={(e) => handleEditFieldChange("Placement", e.target.value)} placeholder="e.g., Homepage Hero" className="mt-2 bg-white" />
                      </div>
                    </div>

                    <MultiSelectBadges
                      label="GEOs"
                      options={GEO_OPTIONS}
                      selected={Array.isArray(editedFields.GEOs) ? editedFields.GEOs : initialGEOs}
                      onChange={(selected) => handleEditFieldChange("GEOs", selected)}
                    />

                    {/* Devices & Variants */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Devices</label>
                        <Select value={editedFields.Devices || ""} onValueChange={(v) => handleEditFieldChange("Devices", v)}>
                          <SelectTrigger className="mt-2 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mobile">Mobile</SelectItem>
                            <SelectItem value="Desktop">Desktop</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Variants Weight</label>
                        <Input value={editedFields["Variants Weight"] || ""} onChange={(e) => handleEditFieldChange("Variants Weight", e.target.value)} placeholder="e.g., 50/50" className="mt-2 bg-white" />
                      </div>
                    </div>

                    {/* Primary Goals */}
                    <MultiSelectBadges
                      label="Primary Goals"
                      options={PRIMARY_GOALS_OPTIONS}
                      selected={editedFields["Category Primary Goals"] || []}
                      onChange={(selected) => handleEditFieldChange("Category Primary Goals", selected)}
                    />

                    <Separator />

                    {/* Save Button at Bottom */}
                    <div className="flex gap-2 justify-end pt-2">
                      <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Display Mode */}
                {!isClient && (
                  <Button size="sm" variant="outline" disabled={hasLaunched} onClick={() => setEditingTab("experiment")}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit Pre-Launch
                  </Button>
                )}

                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-600">Batch</div>
                          <div className="mt-1">{f.Batch?.[0] ? batches.find(b => b.id === f.Batch[0])?.fields.Name : "—"}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Placement</div>
                          <div className="mt-1">{f.Placement || "—"}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Devices</div>
                          <div className="mt-1">{f.Devices || "—"}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Variants Weight</div>
                          <div className="mt-1">{f["Variants Weight"] || "—"}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="font-medium text-gray-600">Test Description</div>
                          <div className="mt-1 text-gray-700">{f["Test Description"] || "—"}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="font-medium text-gray-600">Hypothesis</div>
                          <div className="mt-1 text-gray-700">{f.Hypothesis || "—"}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* PTA RESULTS TAB */}
          <TabsContent value="pta" className="space-y-4">
            {editingTab === "pta" ? (
              <>
                {/* Edit Mode */}
                <div className="flex gap-2 justify-between">
                  <Button variant="outline" size="sm" onClick={() => setEditingTab(null)}>Back</Button>
                </div>

                <Card className="bg-teal-50 border-teal-200">
                  <CardHeader>
                    <CardTitle className="text-sm text-teal-900">Edit PTA Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Goal Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Goal Metric 1</label>
                        <Select value={editedFields["Goal Metric 1"] || ""} onValueChange={(v) => handleEditFieldChange("Goal Metric 1", v)}>
                          <SelectTrigger className="mt-2 bg-white">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {GOAL_METRICS_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Goal Metric 2</label>
                        <Select value={editedFields["Goal Metric 2"] || ""} onValueChange={(v) => handleEditFieldChange("Goal Metric 2", v)}>
                          <SelectTrigger className="mt-2 bg-white">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {GOAL_METRICS_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {/* Metric Increases Only */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Metric #1 Increase (%)</label>
                        <Input type="number" value={editedFields["Metric #1 Increase"] || ""} onChange={(e) => handleEditFieldChange("Metric #1 Increase", e.target.value)} className="mt-2 bg-white" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Metric #2 Increase (%)</label>
                        <Input type="number" value={editedFields["Metric #2 Increase"] || ""} onChange={(e) => handleEditFieldChange("Metric #2 Increase", e.target.value)} className="mt-2 bg-white" />
                      </div>
                    </div>

                    <Separator />

                    {/* Revenue & Confidence */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Revenue Added (MRR) (K Format)</label>
                        <Input type="number" value={editedFields["Revenue Added (MRR) (K Format )"] || ""} onChange={(e) => handleEditFieldChange("Revenue Added (MRR) (K Format )", e.target.value)} placeholder="e.g., 50" className="mt-2 bg-white" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Confidence Level</label>
                        <Input type="number" value={editedFields["Confidence Level"] || ""} onChange={(e) => handleEditFieldChange("Confidence Level", e.target.value)} placeholder="e.g., 95" className="mt-2 bg-white" />
                      </div>
                    </div>

                    <Separator />

                    {/* Analysis Text */}
                    <div>
                      <label className="text-sm font-medium">What Happened</label>
                      <Textarea value={editedFields["Describe what happened & what we learned"] || ""} onChange={(e) => handleEditFieldChange("Describe what happened & what we learned", e.target.value)} placeholder="Enter analysis..." className="mt-2" rows={4} />
                    </div>

                    {/* Next Steps */}
                    <div>
                      <label className="text-sm font-medium">Next Steps (Action)</label>
                      <Textarea value={editedFields["Next Steps (Action)"] || ""} onChange={(e) => handleEditFieldChange("Next Steps (Action)", e.target.value)} placeholder="Enter next steps..." className="mt-2" rows={3} />
                    </div>

                    <Separator />

                    {/* Deploy Segment - Multi-select */}
                    <MultiSelectBadges
                      label="Deploy Segment"
                      options={DEPLOY_SEGMENT_OPTIONS}
                      selected={Array.isArray(editedFields["Segment Deploy Applied to"]) ? editedFields["Segment Deploy Applied to"] : []}
                      onChange={(selected) => handleEditFieldChange("Segment Deploy Applied to", selected)}
                    />

                    {/* Test Status */}
                    <div>
                      <label className="text-sm font-medium">Test Status</label>
                      <Select value={editedFields["Test Status"] || ""} onValueChange={(v) => handleEditFieldChange("Test Status", v)}>
                        <SelectTrigger className="mt-2 bg-white">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Live">Live</SelectItem>
                          <SelectItem value="Successful">Successful</SelectItem>
                          <SelectItem value="Failed">Failed</SelectItem>
                          <SelectItem value="Inconclusive">Inconclusive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Images & Media */}
                    <div>
                      <label className="text-sm font-medium mb-3 block">Media & Images</label>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium">Image Type</label>
                          <Input value={editedFields["Image Type"] || ""} onChange={(e) => handleEditFieldChange("Image Type", e.target.value)} placeholder="e.g., Screenshot, Video" className="mt-1 bg-white" />
                        </div>

                        {/* Image Attachments */}
                        <ExperimentImageUpload
                          label="Control Image"
                          currentUrl={editedFields["Control ImageE"] as string | Array<{ url: string; filename: string }> | undefined}
                          onUpload={(file) => setImageFiles(prev => ({ ...prev, "Control ImageE": file }))}
                          isLoading={isSaving}
                        />

                        <ExperimentImageUpload
                          label="Variant Image"
                          currentUrl={editedFields["Variant ImageE"] as string | Array<{ url: string; filename: string }> | undefined}
                          onUpload={(file) => setImageFiles(prev => ({ ...prev, "Variant ImageE": file }))}
                          isLoading={isSaving}
                        />

                        <ExperimentImageUpload
                          label="PTA Result Image"
                          currentUrl={editedFields["PTA Result Image"] as string | Array<{ url: string; filename: string }> | undefined}
                          onUpload={(file) => setImageFiles(prev => ({ ...prev, "PTA Result Image": file }))}
                          isLoading={isSaving}
                        />

                        <div>
                          <label className="text-xs font-medium">Post-Test Analysis (Loom URL)</label>
                          <Input value={editedFields["Post - Test Analysis (Loom)"] || ""} onChange={(e) => handleEditFieldChange("Post - Test Analysis (Loom)", e.target.value)} placeholder="https://loom.com/..." className="mt-1 bg-white" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Save Button at Bottom */}
                    <div className="flex gap-2 justify-end pt-2">
                      <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Display Mode */}
                {!isClient && (
                  <Button size="sm" variant="outline" disabled={!hasLaunched} onClick={() => setEditingTab("pta")}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit PTA Results
                  </Button>
                )}

                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4 text-sm space-y-4">
                        {/* Goal Metrics */}
                        <div>
                          <div className="font-medium text-gray-600">Goal Metric 1</div>
                          <div className="mt-1">{f["Goal Metric 1"] || "—"}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Goal Metric 2</div>
                          <div className="mt-1">{f["Goal Metric 2"] || "—"}</div>
                        </div>

                        {/* Metric #1 & #2 Increase with % and badges */}
                        <div>
                          <div className="font-medium text-gray-600 mb-2">Metric #1 Increase</div>
                          {f["Metric #1 Increase"] ? (
                            <Badge className="bg-teal-100 text-teal-900 hover:bg-teal-100">{f["Metric #1 Increase"]}%</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-600 mb-2">Metric #2 Increase</div>
                          {f["Metric #2 Increase"] ? (
                            <Badge className="bg-teal-100 text-teal-900 hover:bg-teal-100">{f["Metric #2 Increase"]}%</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>

                        {/* Revenue & Confidence */}
                        <div>
                          <div className="font-medium text-gray-600">Revenue Added (MRR)</div>
                          <div className="mt-1">{f["Revenue Added (MRR) (K Format )"] ? `$${f["Revenue Added (MRR) (K Format )"]}` : "—"}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Confidence Level</div>
                          <div className="mt-1">{f["Confidence Level"] ? `${f["Confidence Level"]}%` : "—"}</div>
                        </div>

                        {/* Deploy Segment as Badges */}
                        <div className="col-span-2">
                          <div className="font-medium text-gray-600 mb-2">Deploy Segment</div>
                          {Array.isArray(f["Segment Deploy Applied to"]) && f["Segment Deploy Applied to"].length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {f["Segment Deploy Applied to"].map((segment: string, idx: number) => (
                                <Badge key={idx} className="bg-green-100 text-green-900 hover:bg-green-100">{segment}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>

                        {/* Test Status */}
                        <div>
                          <div className="font-medium text-gray-600">Test Status</div>
                          <div className="mt-1">{f["Test Status"] || "—"}</div>
                        </div>

                        {/* Analysis Text */}
                        <div className="col-span-2">
                          <div className="font-medium text-gray-600">What Happened</div>
                          <div className="mt-1 text-gray-700">{f["Describe what happened & what we learned"] || "—"}</div>
                        </div>

                        {/* Next Steps */}
                        <div className="col-span-2">
                          <div className="font-medium text-gray-600">Next Steps (Action)</div>
                          <div className="mt-1 text-gray-700">{f["Next Steps (Action)"] || "—"}</div>
                        </div>

                        {/* Image Type */}
                        <div>
                          <div className="font-medium text-gray-600">Image Type</div>
                          <div className="mt-1">{f["Image Type"] || "—"}</div>
                        </div>

                        {/* Media & Images */}
                        <div className="col-span-2">
                          <div className="font-medium text-gray-600 mb-3">Media & Images</div>
                          <div className="space-y-4">
                            {/* Test Images Preview */}
                            <div className="grid grid-cols-3 gap-3">
                              {f["Control ImageE"] && (
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1">Control Image</div>
                                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted border border-gray-200">
                                    <Image 
                                      src={typeof f["Control ImageE"] === "string" ? f["Control ImageE"] : Array.isArray(f["Control ImageE"]) && f["Control ImageE"][0]?.url ? f["Control ImageE"][0].url : "/placeholder.svg"} 
                                      alt="Control" 
                                      fill 
                                      className="object-cover" 
                                    />
                                  </div>
                                </div>
                              )}
                              {f["Variant ImageE"] && (
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1">Variant Image</div>
                                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted border border-gray-200">
                                    <Image 
                                      src={typeof f["Variant ImageE"] === "string" ? f["Variant ImageE"] : Array.isArray(f["Variant ImageE"]) && f["Variant ImageE"][0]?.url ? f["Variant ImageE"][0].url : "/placeholder.svg"} 
                                      alt="Variant" 
                                      fill 
                                      className="object-cover" 
                                    />
                                  </div>
                                </div>
                              )}
                              {f["PTA Result Image"] && (
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1">PTA Result</div>
                                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted border border-gray-200">
                                    <Image 
                                      src={typeof f["PTA Result Image"] === "string" ? f["PTA Result Image"] : Array.isArray(f["PTA Result Image"]) && f["PTA Result Image"][0]?.url ? f["PTA Result Image"][0].url : "/placeholder.svg"} 
                                      alt="PTA Result" 
                                      fill 
                                      className="object-cover" 
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Loom URL */}
                            {f["Post - Test Analysis (Loom)"] && (
                              <div className="flex items-center gap-2 text-xs">
                                <Video className="h-3 w-3" />
                                <a href={f["Post - Test Analysis (Loom)"]} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:text-teal-600 hover:underline">Post-Test Analysis (Loom)</a>
                              </div>
                            )}

                            {!f["Control ImageE"] && !f["Variant ImageE"] && !f["PTA Result Image"] && !f["Post - Test Analysis (Loom)"] && <div className="text-gray-500 text-xs">No media uploaded</div>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Desync Dialog */}
        <AlertDialog open={showDesyncConfirm} onOpenChange={setShowDesyncConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desync Experiment</AlertDialogTitle>
              <AlertDialogDescription>Convert this experiment back to a test idea?</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Desync</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Desync Button - Only visible in view mode */}
        {!editingTab && !isClient && (
          <Button variant="outline" size="sm" onClick={() => setShowDesyncConfirm(true)} className="w-fit">
            <Unlink className="h-4 w-4 mr-1" />
            Desync Experiment
          </Button>
        )}
      </div>
    </TooltipProvider>
  )
}
