"use client"

import React from "react"

import { useState, useMemo } from "react"
import { useLeads, useCallRecords } from "@/hooks/v2/use-airtable"
import type { AirtableRecord, LeadFields, CallRecordFields } from "@/lib/v2/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Phone, Mail, Globe, ExternalLink, ArrowUpRight } from "lucide-react"
import { getLeadStatusColor, getLeadStageColor } from "@/lib/v2/badge-colors"

const LEAD_STATUSES = [
  "all",
  "Lead",
  "Converted To Client",
  "Rejected",
  "Fresh",
  "Stale",
  "Dead",
  "No Stage",
]

const LEAD_STAGES = [
  "all",
  "Open",
  "No Show",
  "Maybe",
  "Qualifying Call",
  "Sales Call",
  "Onboarding Call",
  "Closed",
  "Churned / Rejected",
]

// Badge color functions removed - use getLeadStatusColor and getLeadStageColor from badge-colors.ts instead

function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function getHostname(url?: string): string {
  if (!url) return "-"
  try {
    const fullUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`
    return new URL(fullUrl).hostname || url
  } catch {
    return url
  }
}

function buildFilloutUrl(lead: AirtableRecord<LeadFields>): string {
  const f = lead.fields
  const baseUrl = "https://moreconversions.fillout.com/t/fCwdQdpJN8us?"
  
  const params = new URLSearchParams({
    BrandName: f["Company / Brand Name"] || "",
    id: lead.id,
    Email: f.Email || "",
    FirstName: f["First Name"] || "",
    LastName: f["Last Name"] || "",
    PhoneNumber: f["Phone Number"] || "",
    DateCreated: f["Date Created"] || "",
    JobTitle: f["Job Title"] || "",
    Timezone: f["Timezone"] || "",
    LastContact: f["Last Contact"] || "",
    UTMSource: f["UTM Source"] || "",
    UTMMedium: f["UTM Medium"] || "",
    UTMCampaign: f["UTM Campaign"] || "",
    UTMTerm: f["UTM Term"] || "",
    UTMContent: f["UTM Content"] || "",
    Website: f.Website || "",
    fullName: f["Full Name"] || "",
    callRecords: f["Call Record ID"] || "",
  })
  
  return baseUrl + params.toString()
}

export function LeadsContent() {
  const { leads, isLoading, mutate } = useLeads()
  const { callRecords } = useCallRecords()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stageFilter, setStageFilter] = useState("all")
  const [view, setView] = useState<"table" | "kanban">("table")
  const [selectedLead, setSelectedLead] = useState<AirtableRecord<LeadFields> | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const filteredLeads = useMemo(() => {
    let result = leads
    if (statusFilter !== "all") {
      result = result.filter((l) => {
        if (statusFilter === "Lead") return l.fields["Lead Status"] === "Lead"
        if (statusFilter === "Converted To Client") return l.fields["Lead Status"] === "Client"
        if (statusFilter === "Rejected") return ["No Show", "Churned / Rejected"].includes(l.fields.Stage || "")
        if (statusFilter === "No Stage") return !l.fields.Stage
        if (statusFilter === "Fresh") {
          const created = new Date(l.fields["Date Created"])
          const twoMonthsAgo = new Date()
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
          return created > twoMonthsAgo && ["Lead", "Client"].includes(l.fields["Lead Status"] || "")
        }
        if (statusFilter === "Stale") {
          const created = new Date(l.fields["Date Created"])
          const twoMonthsAgo = new Date()
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
          return created <= twoMonthsAgo && !["Closed", "Churned / Rejected"].includes(l.fields.Stage || "") && ["Lead", "Client"].includes(l.fields["Lead Status"] || "")
        }
        if (statusFilter === "Dead") {
          const created = new Date(l.fields["Date Created"])
          const sixMonthsAgo = new Date()
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
          return created <= sixMonthsAgo && !["Closed", "Churned / Rejected"].includes(l.fields.Stage || "") && l.fields["Lead Status"] === "Lead"
        }
        return true
      })
    }
    if (stageFilter !== "all") {
      result = result.filter((l) => l.fields.Stage === stageFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.fields["Full Name"]?.toLowerCase().includes(q) ||
          l.fields.Email?.toLowerCase().includes(q) ||
          l.fields["Company / Brand Name"]?.toLowerCase().includes(q)
      )
    }
    return result
  }, [leads, statusFilter, stageFilter, search])

  const metrics = useMemo(() => {
    const total = leads.length
    const newLeads = leads.filter((l) => l.fields["Lead Status"]?.toLowerCase() === "new").length
    const qualified = leads.filter((l) => l.fields["Lead Status"]?.toLowerCase() === "qualified").length
    const clients = leads.filter((l) => l.fields["Lead Status"]?.toLowerCase() === "client").length
    return { total, newLeads, qualified, clients }
  }, [leads])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading leads...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          Create New Lead
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-7 gap-2">
        {/* Original 4 Metrics */}
        <div className="border border-border rounded-lg bg-background cursor-pointer hover:shadow-md transition-shadow px-1 py-3 text-center" onClick={() => { setStatusFilter("all"); setStageFilter("all") }}>
          <div className="text-lg font-bold text-teal-600 leading-tight">{leads.length}</div>
          <div className="text-xs text-muted-foreground leading-tight">{leads.length === 1 ? "Total Lead" : "Total Leads"}</div>
        </div>
        <div className="border border-border rounded-lg bg-background cursor-pointer hover:shadow-md transition-shadow px-1 py-3 text-center" onClick={() => { setStatusFilter("Lead"); setStageFilter("all") }}>
          <div className="text-lg font-bold text-green-600 leading-tight">{leads.filter(l => l.fields["Lead Status"] === "Lead").length}</div>
          <div className="text-xs text-muted-foreground leading-tight">Leads</div>
        </div>
        <div className="border border-border rounded-lg bg-background cursor-pointer hover:shadow-md transition-shadow px-1 py-3 text-center" onClick={() => { setStatusFilter("Converted To Client"); setStageFilter("all") }} title="Leads that have been converted to clients">
          <div className="text-lg font-bold text-emerald-600 leading-tight">{leads.filter(l => l.fields["Lead Status"] === "Client").length}</div>
          <div className="text-xs text-muted-foreground leading-tight">Clients</div>
        </div>
        <div className="border border-border rounded-lg bg-background cursor-pointer hover:shadow-md transition-shadow px-1 py-3 text-center" onClick={() => { setStatusFilter("Rejected"); setStageFilter("all") }} title="Leads in No Show or Churned/Rejected stages">
          <div className="text-lg font-bold text-purple-600 leading-tight">{leads.filter(l => ["No Show", "Churned / Rejected"].includes(l.fields.Stage || "")).length}</div>
          <div className="text-xs text-muted-foreground leading-tight">Rejected</div>
        </div>

        {/* New 3 Metrics */}
        <div className="border border-border rounded-lg bg-background cursor-pointer hover:shadow-md transition-shadow px-1 py-3 text-center" onClick={() => { setStatusFilter("Fresh"); setStageFilter("all") }} title="Leads created less than 2 months ago">
          <div className="text-lg font-bold text-green-500 leading-tight">{leads.filter(l => {
            const created = new Date(l.fields["Date Created"])
            const twoMonthsAgo = new Date()
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
            return created > twoMonthsAgo && ["Lead", "Client"].includes(l.fields["Lead Status"] || "")
          }).length}</div>
          <div className="text-xs text-muted-foreground leading-tight">Fresh</div>
        </div>
        <div className="border border-border rounded-lg bg-background cursor-pointer hover:shadow-md transition-shadow px-1 py-3 text-center" onClick={() => { setStatusFilter("Stale"); setStageFilter("all") }} title="Leads in the pipeline for 2-6 months">
          <div className="text-lg font-bold text-yellow-600 leading-tight">{leads.filter(l => {
            const created = new Date(l.fields["Date Created"])
            const twoMonthsAgo = new Date()
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
            return created <= twoMonthsAgo && !["Closed", "Churned / Rejected"].includes(l.fields.Stage || "") && ["Lead", "Client"].includes(l.fields["Lead Status"] || "")
          }).length}</div>
          <div className="text-xs text-muted-foreground leading-tight">Stale</div>
        </div>
        <div className="border border-border rounded-lg bg-background cursor-pointer hover:shadow-md transition-shadow px-1 py-3 text-center" onClick={() => { setStatusFilter("Dead"); setStageFilter("all") }} title="Leads in the pipeline for more than 6 months">
          <div className="text-lg font-bold text-red-600 leading-tight">{leads.filter(l => {
            const created = new Date(l.fields["Date Created"])
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
            return created <= sixMonthsAgo && !["Closed", "Churned / Rejected"].includes(l.fields.Stage || "") && l.fields["Lead Status"] === "Lead"
          }).length}</div>
          <div className="text-xs text-muted-foreground leading-tight">Old</div>
        </div>
      </div>

      {/* Stage Summary Cards */}
      <div className="grid grid-cols-8 gap-2">
        {["Open", "Qualifying Call", "Sales Call", "Onboarding Call", "Closed", "Maybe", "No Show", "Churned / Rejected"].map((stage) => {
          const count = leads.filter((l) => l.fields.Stage === stage).length
          let bgColor = ""
          let textColor = ""
          
          // Positive stages: blue to green gradient
          if (stage === "Open") { bgColor = "bg-teal-50"; textColor = "text-teal-600" }
          else if (stage === "Qualifying Call") { bgColor = "bg-teal-50"; textColor = "text-teal-600" }
          else if (stage === "Sales Call") { bgColor = "bg-cyan-50"; textColor = "text-cyan-600" }
          else if (stage === "Onboarding Call") { bgColor = "bg-teal-50"; textColor = "text-teal-600" }
          else if (stage === "Closed") { bgColor = "bg-green-50"; textColor = "text-green-600" }
          // Negative stages: yellow, red, grey
          else if (stage === "Maybe") { bgColor = "bg-yellow-50"; textColor = "text-yellow-600" }
          else if (stage === "No Show") { bgColor = "bg-orange-50"; textColor = "text-orange-600" }
          else if (stage === "Churned / Rejected") { bgColor = "bg-red-50"; textColor = "text-red-600" }
          
          return (
            <div key={stage} className={`${bgColor} border border-gray-200 rounded-lg p-1.5 text-center cursor-pointer hover:shadow-md transition-shadow`} onClick={() => { setStageFilter(stage); setStatusFilter("all") }}>
              <div className={`text-lg font-bold ${textColor}`}>{count}</div>
              <div className="text-xs text-muted-foreground truncate">{stage}</div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All Status" : s === "Dead" ? "Old" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All Stages" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")} className="w-full">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-6">
          <LeadsTableView leads={filteredLeads} onSelectLead={setSelectedLead} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <LeadsKanbanView leads={leads} onSelectLead={setSelectedLead} search={search} mutate={mutate} callRecords={callRecords} />
        </TabsContent>
      </Tabs>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} open={true} onOpenChange={setSelectedLead} onRefresh={mutate} callRecords={callRecords} />
      )}

      {/* Create Lead Dialog */}
      {showCreateDialog && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogTitle>Create New Lead</DialogTitle>
            <CreateLeadDialogContent onOpenChange={setShowCreateDialog} mutate={mutate} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Table View Component
function LeadsTableView({
  leads,
  onSelectLead,
}: {
  leads: AirtableRecord<LeadFields>[]
  onSelectLead: (lead: AirtableRecord<LeadFields>) => void
}) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-8 max-w-80">Email</TableHead>
              <TableHead className="w-48">Name</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="max-w-20">Timezone</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-32">Company</TableHead>
              <TableHead className="max-w-35">Website</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Medium</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Convert</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onSelectLead(lead)}>
                <TableCell className="font-medium text-sm pl-8 max-w-80 truncate">
                  {lead.fields.Email || "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-48">
                  {lead.fields["Full Name"] || `${lead.fields["First Name"] || ""} ${lead.fields["Last Name"] || ""}`.trim() || "Unknown"}
                </TableCell>
                <TableCell>
                  {lead.fields.Stage && (
                            <Badge className={`text-xs ${getLeadStageColor(lead.fields.Stage)}`}>
                      {lead.fields.Stage}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-20 truncate">
                  {lead.fields["Timezone"] || "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lead.fields["Phone Number"] || "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-32">
                  {lead.fields["Company / Brand Name"] || "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-35">
                  {lead.fields.Website ? (
                    <a
                      href={lead.fields.Website.startsWith("http") ? lead.fields.Website : `https://${lead.fields.Website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getHostname(lead.fields.Website)}
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground text-xs">
                  {lead.fields["UTM Source"] || "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground text-xs">
                  {lead.fields["UTM Medium"] || "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(lead.fields["Date Created"])}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {lead.fields["Lead Status"] !== "Client" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(buildFilloutUrl(lead), "_blank")}
                      className="h-7"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Kanban View Component
function LeadsKanbanView({
  leads,
  onSelectLead,
  search,
  mutate,
  callRecords,
}: {
  leads: AirtableRecord<LeadFields>[]
  onSelectLead: (lead: AirtableRecord<LeadFields>) => void
  search: string
  mutate: (data?: any) => Promise<any>
  callRecords: AirtableRecord<CallRecordFields>[]
}) {
  const stages = ["Open", "Qualifying Call", "Sales Call", "Onboarding Call", "Closed", "Maybe", "No Show", "Churned / Rejected"]
  const [draggedLead, setDraggedLead] = useState<{ id: string; fromStage: string } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const filteredLeads = useMemo(() => {
    if (!search) return leads
    const q = search.toLowerCase()
    return leads.filter(
      (l) =>
        l.fields["Full Name"]?.toLowerCase().includes(q) ||
        l.fields.Email?.toLowerCase().includes(q) ||
        l.fields["Company / Brand Name"]?.toLowerCase().includes(q)
    )
  }, [leads, search])

  const leadsByStage = useMemo(() => {
    const grouped: Record<string, AirtableRecord<LeadFields>[]> = {}
    stages.forEach((stage) => {
      grouped[stage] = filteredLeads.filter((l) => l.fields.Stage === stage)
    })
    return grouped
  }, [filteredLeads])

  const handleDragStart = (lead: AirtableRecord<LeadFields>, fromStage: string) => {
    setDraggedLead({ id: lead.id, fromStage })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (toStage: string, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedLead || draggedLead.fromStage === toStage) {
      setDraggedLead(null)
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/airtable/leads/${draggedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { Stage: toStage } }),
      })

      if (!response.ok) {
        console.error("[v0] Failed to update lead stage")
        return
      }

      // Revalidate the leads list after successful update
      await mutate()
    } catch (error) {
      console.error("[v0] Error updating lead:", error)
    } finally {
      setIsUpdating(false)
      setDraggedLead(null)
    }
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {stages.map((stage) => (
          <div key={stage} className="flex flex-col gap-3 min-w-64">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${getStageColor(stage)}`}>
                  {stage}
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">
                  {leadsByStage[stage]?.length || 0}
                </span>
              </div>
            </div>

            <div
              className="flex flex-col gap-2 bg-muted/30 rounded-lg p-3 min-h-64 transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(stage, e)}
            >
              {leadsByStage[stage]?.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead, stage)}
                  onClick={() => onSelectLead(lead)}
                  className="bg-background border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow opacity-100"
                  style={{
                    opacity: draggedLead?.id === lead.id ? 0.5 : 1,
                  }}
                >
                  <div className="space-y-2">
                    <div className="font-medium text-sm truncate">
                      {lead.fields["Full Name"] || `${lead.fields["First Name"] || ""} ${lead.fields["Last Name"] || ""}`.trim() || "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {lead.fields.Email || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {lead.fields["Company / Brand Name"] || "-"}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(() => {
                          const created = new Date(lead.fields["Date Created"])
                          const twoMonthsAgo = new Date()
                          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
                          const sixMonthsAgo = new Date()
                          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
                          
                          let ageTag = ""
                          if (created > twoMonthsAgo) ageTag = "Fresh"
                          else if (created > sixMonthsAgo) ageTag = "Stale"
                          else ageTag = "Old"
                          
                          return <Badge className="text-xs bg-teal-100 text-teal-700">{ageTag}</Badge>
                        })()}
                        <span className="text-muted-foreground">{formatDate(lead.fields["Date Created"])}</span>
                      </div>
                      {(lead.fields["UTM Source"] || lead.fields["UTM Medium"]) && (
                        <div className="flex gap-1 text-muted-foreground">
                          {lead.fields["UTM Source"] && <span>📍 {lead.fields["UTM Source"]}</span>}
                          {lead.fields["UTM Medium"] && <span>• {lead.fields["UTM Medium"]}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!leadsByStage[stage] || leadsByStage[stage].length === 0) && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No leads
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Lead Detail Modal Component
function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onRefresh,
  callRecords,
}: {
  lead: AirtableRecord<LeadFields> | null
  open: boolean
  onOpenChange: (lead: AirtableRecord<LeadFields> | null) => void
  onRefresh?: (updatedLead: AirtableRecord<LeadFields>) => void
  callRecords: AirtableRecord<CallRecordFields>[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editValues, setEditValues] = useState<Partial<LeadFields>>({})

  if (!lead) return null

  const name =
    lead.fields["Full Name"] ||
    `${lead.fields["First Name"] || ""} ${lead.fields["Last Name"] || ""}`.trim()

  // Initialize edit values when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsEditing(false)
      setEditValues({})
    }
    onOpenChange(null)
  }

  const handleEditStart = () => {
    setEditValues({
      Email: lead.fields.Email || "",
      "Full Name": lead.fields["Full Name"] || "",
      "First Name": lead.fields["First Name"] || "",
      "Last Name": lead.fields["Last Name"] || "",
      "Company / Brand Name": lead.fields["Company / Brand Name"] || "",
      Website: lead.fields.Website || "",
      "Phone Number": lead.fields["Phone Number"] || "",
      Stage: lead.fields.Stage || "",
      "Timezone": lead.fields["Timezone"] || "",
      "Job Title": lead.fields["Job Title"] || "",
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    const changedFields: Partial<LeadFields> = {}

    // Only include fields that actually changed and have non-empty values
    if (editValues.Email !== lead.fields.Email && editValues.Email && editValues.Email.trim()) {
      changedFields.Email = editValues.Email.trim()
    }
    if (editValues["Full Name"] !== lead.fields["Full Name"] && editValues["Full Name"] && editValues["Full Name"].trim()) {
      changedFields["Full Name"] = editValues["Full Name"].trim()
    }
    if (editValues["First Name"] !== lead.fields["First Name"] && editValues["First Name"] && editValues["First Name"].trim()) {
      changedFields["First Name"] = editValues["First Name"].trim()
    }
    if (editValues["Last Name"] !== lead.fields["Last Name"] && editValues["Last Name"] && editValues["Last Name"].trim()) {
      changedFields["Last Name"] = editValues["Last Name"].trim()
    }
    if (editValues["Company / Brand Name"] !== lead.fields["Company / Brand Name"] && editValues["Company / Brand Name"] && editValues["Company / Brand Name"].trim()) {
      changedFields["Company / Brand Name"] = editValues["Company / Brand Name"].trim()
    }
    if (editValues.Website !== lead.fields.Website && editValues.Website && editValues.Website.trim()) {
      changedFields.Website = editValues.Website.trim()
    }
    if (editValues["Phone Number"] !== lead.fields["Phone Number"] && editValues["Phone Number"] && editValues["Phone Number"].trim()) {
      // Extract just the digits for the Number field
      const phoneOnly = editValues["Phone Number"].replace(/\D/g, "")
      if (phoneOnly) {
        changedFields["Phone Number"] = Number(phoneOnly)
      }
    }
    if (editValues.Stage !== lead.fields.Stage && editValues.Stage && editValues.Stage.trim()) {
      changedFields.Stage = editValues.Stage.trim()
    }
    if (editValues["Timezone"] !== lead.fields["Timezone"] && editValues["Timezone"] && editValues["Timezone"].trim()) {
      changedFields["Timezone"] = editValues["Timezone"].trim()
    }
    if (editValues["Job Title"] !== lead.fields["Job Title"] && editValues["Job Title"] && editValues["Job Title"].trim()) {
      changedFields["Job Title"] = editValues["Job Title"].trim()
    }


    if (Object.keys(changedFields).length === 0) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/airtable/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: changedFields }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Failed to save lead:", response.status, errorText)
        return
      }

      const updatedData = await response.json()
      const updatedLead: AirtableRecord<LeadFields> = updatedData.records[0] || {
        id: lead.id,
        fields: { ...lead.fields, ...changedFields },
      }

      // Call onRefresh with the updated lead for parent cache update
      if (onRefresh) {
        onRefresh(updatedLead)
      }

      setIsEditing(false)
      setEditValues({})
    } catch (error) {
      console.error("[v0] Error saving lead:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between">
            <DialogTitle>{name || "Unknown Lead"}</DialogTitle>
            <Button size="sm" variant="outline" onClick={handleEditStart}>
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Email</div>
                {lead.fields.Email ? (
                  <a href={`mailto:${lead.fields.Email}`} className="text-sm hover:underline">
                    {lead.fields.Email}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Phone</div>
                <span className="text-sm">{lead.fields["Phone Number"] || "-"}</span>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Company</div>
                <span className="text-sm">{lead.fields["Company / Brand Name"] || "-"}</span>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Job Title</div>
                <span className="text-sm">{lead.fields["Job Title"] || "-"}</span>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Timezone</div>
                <span className="text-sm">{lead.fields["Timezone"] || "-"}</span>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Website</div>
                {lead.fields.Website ? (
                  <a
                    href={lead.fields.Website.startsWith("http") ? lead.fields.Website : `https://${lead.fields.Website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                  >
                    {getHostname(lead.fields.Website)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Calls</div>
                <div className="space-y-2">
                  {lead.fields["Call Record ID"] && lead.fields["Call Record ID"].length === 0 ? (
                    <span className="text-xs text-muted-foreground">No calls</span>
                  ) : (
                    lead.fields["Call Record ID"]?.map(callId => (
                      <div key={callId} className="text-xs flex items-center gap-2">
                        {callRecords.find(c => c.id === callId)?.fields["Event URL"] ? (
                          <a href={callRecords.find(c => c.id === callId)?.fields["Event URL"]} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:text-teal-600 hover:underline">
                            {callRecords.find(c => c.id === callId)?.fields["Event Name"] || "Call"}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{callRecords.find(c => c.id === callId)?.fields["Event Name"] || "Call"}</span>
                        )}
                        {callRecords.find(c => c.id === callId)?.fields["Fathom URL"] && (
                          <>
                            <span className="text-muted-foreground">-</span>
                            <a href={callRecords.find(c => c.id === callId)?.fields["Fathom URL"]} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700">
                              <Phone className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Stage</div>
                {lead.fields.Stage && (
                  <Badge className={`text-xs ${getLeadStageColor(lead.fields.Stage)}`}>
                    {lead.fields.Stage}
                  </Badge>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Created</div>
                <span className="text-sm">{formatDate(lead.fields["Date Created"])}</span>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Last Contact</div>
                <span className="text-sm">{formatDate(lead.fields["Last Contact"])}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground uppercase mb-2">UTM Data</div>
                <div className="space-y-1 text-xs">
                  <div><span className="font-medium">Source:</span> {lead.fields["UTM Source"] || "-"}</div>
                  <div><span className="font-medium">Medium:</span> {lead.fields["UTM Medium"] || "-"}</div>
                  <div><span className="font-medium">Campaign:</span> {lead.fields["UTM Campaign"] || "-"}</div>
                  <div><span className="font-medium">Term:</span> {lead.fields["UTM Term"] || "-"}</div>
                  <div><span className="font-medium">Content:</span> {lead.fields["UTM Content"] || "-"}</div>
                </div>
              </div>
            </div>
          </div>

          {lead.fields["Lead Status"] !== "Client" && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => window.open(buildFilloutUrl(lead), "_blank")}
                className="w-full"
              >
                Convert Lead to Client
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between">
          <DialogTitle>Edit Lead</DialogTitle>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">First Name</label>
              <Input
                value={editValues["First Name"] || ""}
                onChange={(e) => setEditValues({ ...editValues, "First Name": e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Last Name</label>
              <Input
                value={editValues["Last Name"] || ""}
                onChange={(e) => setEditValues({ ...editValues, "Last Name": e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
            <Input
              type="email"
              value={editValues.Email || ""}
              onChange={(e) => setEditValues({ ...editValues, Email: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Phone</label>
            <Input
              value={editValues["Phone Number"] || ""}
              onChange={(e) => setEditValues({ ...editValues, "Phone Number": e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Company</label>
            <Input
              value={editValues["Company / Brand Name"] || ""}
              onChange={(e) => setEditValues({ ...editValues, "Company / Brand Name": e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Website</label>
            <Input
              value={editValues.Website || ""}
              onChange={(e) => setEditValues({ ...editValues, Website: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Timezone</label>
            <Input
              value={editValues["Timezone"] || ""}
              onChange={(e) => setEditValues({ ...editValues, "Timezone": e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Job Title</label>
            <Input
              value={editValues["Job Title"] || ""}
              onChange={(e) => setEditValues({ ...editValues, "Job Title": e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Stage</label>
            <Select value={editValues.Stage || ""} onValueChange={(value) => setEditValues({ ...editValues, Stage: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {["Open", "No Show", "Maybe", "Qualifying Call", "Sales Call", "Onboarding Call", "Closed", "Churned / Rejected"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Create Lead Dialog Content Component
function CreateLeadDialogContent({ 
  onOpenChange,
  mutate,
}: { 
  onOpenChange: (open: boolean) => void
  mutate: (data?: any) => Promise<any>
}) {
  const [formValues, setFormValues] = useState<Partial<LeadFields>>({})
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async () => {
    // Validate required fields
    if (!formValues.Email || !formValues["First Name"] || !formValues["Last Name"]) {
      console.error("[v0] Email, First Name, and Last Name are required")
      return
    }

    const newLeadFields: Partial<LeadFields> = {
      Email: formValues.Email,
      "First Name": formValues["First Name"],
      "Last Name": formValues["Last Name"],
      "Company / Brand Name": formValues["Company / Brand Name"],
      Website: formValues.Website,
      "Phone Number": formValues["Phone Number"],
      "Job Title": formValues["Job Title"],
      Timezone: formValues.Timezone,
      Stage: "Open",
      "Lead Status": "Lead",
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/airtable/leads/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: newLeadFields }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Failed to create lead:", response.status, errorText)
        return
      }

      const createdData = await response.json()
      const newLead: AirtableRecord<LeadFields> = createdData

      // Force SWR to revalidate the leads list
      await mutate()

      // Reset form and close
      setFormValues({})
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error creating lead:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">First Name *</label>
        <Input
          value={formValues["First Name"] || ""}
          onChange={(e) => setFormValues({ ...formValues, "First Name": e.target.value })}
          className="mt-1"
          placeholder="Required"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">Last Name *</label>
        <Input
          value={formValues["Last Name"] || ""}
          onChange={(e) => setFormValues({ ...formValues, "Last Name": e.target.value })}
          className="mt-1"
          placeholder="Required"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">Email *</label>
        <Input
          type="email"
          value={formValues.Email || ""}
          onChange={(e) => setFormValues({ ...formValues, Email: e.target.value })}
          className="mt-1"
          placeholder="Required"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">Phone</label>
        <Input
          value={formValues["Phone Number"] || ""}
          onChange={(e) => setFormValues({ ...formValues, "Phone Number": e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">Company</label>
        <Input
          value={formValues["Company / Brand Name"] || ""}
          onChange={(e) => setFormValues({ ...formValues, "Company / Brand Name": e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">Website</label>
        <Input
          value={formValues.Website || ""}
          onChange={(e) => setFormValues({ ...formValues, Website: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">Job Title</label>
        <Input
          value={formValues["Job Title"] || ""}
          onChange={(e) => setFormValues({ ...formValues, "Job Title": e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase">Timezone</label>
        <Input
          value={formValues.Timezone || ""}
          onChange={(e) => setFormValues({ ...formValues, Timezone: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2 pt-4 border-t">
        <Button
          onClick={handleCreate}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? "Creating..." : "Create Lead"}
        </Button>
        <Button
          onClick={() => setFormValues({})}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
