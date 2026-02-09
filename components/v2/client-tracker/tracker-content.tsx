"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { PopoverContent } from "@/components/ui/popover"
import { PopoverTrigger } from "@/components/ui/popover"
import { Popover } from "@/components/ui/popover"
import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Filter,
  FlaskConical,
  Video,
  ImageIcon,
  FileText,
  Play,
  Pencil,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn, formatCurrency } from "@/lib/utils"
import { useClients, useBatches, useExperiments, useVariants } from "@/hooks/v2/use-airtable"
import { useUser } from "@/contexts/v2/user-context"
import type { AirtableRecord, ExperimentFields, BatchFields, VariantFields } from "@/lib/v2/types"
import { VariantDataTable } from "./variant-data-table"
import { ExperimentDetailPanel } from "./experiment-detail-panel"
import { StatusBadge } from "@/components/v2/status-badge"

// Status badge styling
function getTestStatusBadge(status?: string) {
  if (!status) return <Badge variant="outline">Unknown</Badge>
  return <StatusBadge status={status} variant="solid" />
}

function getBatchStatusBadge(allTestStatuses?: string | string[]) {
  if (!allTestStatuses || (Array.isArray(allTestStatuses) && allTestStatuses.length === 0)) return <Badge variant="outline">No Tests</Badge>
  const rawStatuses = (Array.isArray(allTestStatuses) ? allTestStatuses : String(allTestStatuses).split(",")).map((s) => s.trim().toLowerCase())
  
  // Filter out incomplete statuses - only evaluate completed tests
  const completedStatuses = rawStatuses.filter((s) => !s.includes("pending") && !s.includes("draft") && !s.includes("paused"))
  
  
  // If no completed tests, batch is still in progress
  if (completedStatuses.length === 0) return <StatusBadge status="In Progress" variant="solid" />
  
  // If at least one test is Live/Collecting, batch is Live
  if (completedStatuses.some((s) => s.includes("live") || s.includes("collecting")))
    return <StatusBadge status="Live" variant="solid" />
  
  // Check for unsuccessful/failed/loser first (must come before successful check)
  const hasUnsuccessful = completedStatuses.some((s) => s.includes("unsuccessful") || s.includes("failed") || s.includes("loser"))
  
  // If all completed tests are Successful, batch is Successful (but NOT unsuccessful)
  const allSuccessful = completedStatuses.every((s) => (s.includes("successful") || s.includes("winner")) && !s.includes("unsuccessful"))
  if (allSuccessful && !hasUnsuccessful)
    return <StatusBadge status="Successful" variant="solid" />
  
  // If all completed tests are Blocked, batch is Blocked
  if (completedStatuses.every((s) => s.includes("blocked")))
    return <StatusBadge status="Blocked" variant="solid" />
  
  // If all completed tests are Inconclusive, batch is Inconclusive
  if (completedStatuses.every((s) => s.includes("inconclusive")))
    return <StatusBadge status="Inconclusive" variant="solid" />
  
  // If at least one completed test is Successful (but not all), batch is Mixed
  const hasSuccessful = completedStatuses.some((s) => (s.includes("successful") || s.includes("winner")) && !s.includes("unsuccessful"))
  if (hasSuccessful && hasUnsuccessful)
    return <StatusBadge status="Mixed" variant="solid" />
  
  // If no tests are Successful, batch is Unsuccessful
  if (hasUnsuccessful)
    return <StatusBadge status="Unsuccessful" variant="solid" />
  
  // Default fallback
  return <StatusBadge status="Mixed" variant="solid" />
}

export function ClientTrackerContent() {
  const { currentUser } = useUser()
  const isClient = currentUser?.role === "client"

  // Fetch all data
  const { clients, isLoading: clientsLoading } = useClients()
  const { batches, isLoading: batchesLoading } = useBatches()
  const { experiments, isLoading: experimentsLoading } = useExperiments()

  // UI state
  const [searchTerm, setSearchTerm] = useState("")
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [selectedExperiment, setSelectedExperiment] = useState<AirtableRecord<ExperimentFields> | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editBatchOpen, setEditBatchOpen] = useState(false)
  const [editBatchData, setEditBatchData] = useState<{ id: string; currentDate: string } | null>(null)
  const [editBatchNewDate, setEditBatchNewDate] = useState<Date | undefined>()

  const isLoading = clientsLoading || batchesLoading || experimentsLoading

  // Build a map of experiments by record ID for quick lookup
  const experimentsMap = useMemo(() => {
    const map = new Map<string, AirtableRecord<ExperimentFields>>()
    experiments.forEach((exp) => map.set(exp.id, exp))
    return map
  }, [experiments])

  // Active clients for filter dropdown
  const activeClients = useMemo(() => {
    return clients
      .filter((c) => c.fields["Client Status"] !== "Churned")
      .sort((a, b) => (a.fields["Brand Name"] || "").localeCompare(b.fields["Brand Name"] || ""))
  }, [clients])

  // Build enriched batch list with their experiments
  const enrichedBatches = useMemo(() => {
    return batches.map((batch) => {
      const batchExperimentIds = batch.fields["Experiments Attached"] || []
      const batchExperiments = batchExperimentIds
        .map((id) => experimentsMap.get(id))
        .filter(Boolean) as AirtableRecord<ExperimentFields>[]

      return {
        ...batch,
        experiments: batchExperiments,
        clientName: batch.fields["Brand Name"] || "Unknown Client",
        launchDate: batch.fields["Launch Date"] || "",
      }
    })
  }, [batches, experimentsMap])

  // Apply filters
  const filteredBatches = useMemo(() => {
    return enrichedBatches.filter((batch) => {
      // Client filter - for client users, only show their batches
      if (isClient && currentUser?.clientRecordId) {
        const batchClientIds = batch.fields["Record ID (from Client)"] || []
        if (!batchClientIds.includes(currentUser?.clientRecordId || "")) return false
      } else if (clientFilter.length > 0) {
        const batchClientIds = batch.fields["Record ID (from Client)"] || []
        if (!batchClientIds.some((id) => clientFilter.includes(id))) return false
      }

      // Status filter
      if (statusFilter !== "all") {
        const allStatuses = batch.fields["All Tests Status"] || []
        const statusStr = Array.isArray(allStatuses) ? allStatuses.join(",") : String(allStatuses)
        if (!statusStr.toLowerCase().includes(statusFilter.toLowerCase())) return false
      }

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesBatch = batch.fields["Batch Key"]?.toLowerCase().includes(term)
        const matchesClient = batch.clientName.toLowerCase().includes(term)
        const matchesTest = batch.experiments.some(
          (exp) =>
            exp.fields["Test Description"]?.toLowerCase().includes(term) ||
            exp.fields.Hypothesis?.toLowerCase().includes(term)
        )
        if (!matchesBatch && !matchesClient && !matchesTest) return false
      }

      return true
    })
  }, [enrichedBatches, clientFilter, statusFilter, searchTerm, isClient, currentUser?.clientRecordId])

  // Sort by launch date desc
  const sortedBatches = useMemo(() => {
    return [...filteredBatches].sort((a, b) => {
      const dateA = a.launchDate ? new Date(a.launchDate).getTime() : 0
      const dateB = b.launchDate ? new Date(b.launchDate).getTime() : 0
      return dateB - dateA
    })
  }, [filteredBatches])

  // Toggle batch expansion
  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev)
      if (next.has(batchId)) {
        next.delete(batchId)
      } else {
        next.add(batchId)
      }
      return next
    })
  }

  // Summary stats
  const stats = useMemo(() => {
    const totalBatches = sortedBatches.length
    const totalExperiments = sortedBatches.reduce((sum, b) => sum + b.experiments.length, 0)
    const liveExperiments = sortedBatches.reduce(
      (sum, b) =>
        sum +
        b.experiments.filter((e) => {
          const s = (e.fields["Test Status"] || "").toLowerCase()
          return s.includes("live") || s.includes("collecting")
        }).length,
      0
    )
    const successfulExperiments = sortedBatches.reduce(
      (sum, b) =>
        sum +
        b.experiments.filter((e) => {
          const s = (e.fields["Test Status"] || "").toLowerCase()
          return s.includes("successful") || s.includes("winner")
        }).length,
      0
    )
    return { totalBatches, totalExperiments, liveExperiments, successfulExperiments }
  }, [sortedBatches])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading tracker data...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tabular-nums text-foreground">Client Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track experiment batches and their performance across all clients
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="flex flex-col gap-0 px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground leading-none">Total Batches</div>
              <div className="text-xl font-semibold tabular-nums text-foreground">{stats.totalBatches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-0 px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground leading-none">Total Experiments</div>
              <div className="text-xl font-semibold tabular-nums text-foreground">{stats.totalExperiments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-0 px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground leading-none">Live Now</div>
              <div className="text-xl font-semibold tabular-nums text-teal-600">{stats.liveExperiments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-0 px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground leading-none">Successful</div>
              <div className="text-xl font-semibold tabular-nums text-emerald-600">{stats.successfulExperiments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search batches, experiments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {!isClient && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] bg-transparent">
                  {clientFilter.length === 0 ? "All Clients" : `${clientFilter.length} selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setClientFilter([])}
                  >
                    Clear all
                  </Button>
                  {activeClients.map((c) => (
                    <div key={c.id} className="flex items-center space-x-2 px-2 py-1">
                      <Checkbox
                        id={c.id}
                        checked={clientFilter.includes(c.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setClientFilter([...clientFilter, c.id])
                          } else {
                            setClientFilter(clientFilter.filter((id) => id !== c.id))
                          }
                        }}
                      />
                      <label
                        htmlFor={c.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {c.fields["Brand Name"]}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="inconclusive">Inconclusive</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Batches Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]" />
                  {!isClient && <TableHead className="w-[150px]">Client</TableHead>}
                  <TableHead>Launch Date</TableHead>
                  <TableHead>Finish Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Revenue Impact</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isClient ? 7 : 8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FlaskConical className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No batches found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBatches.map((batch) => {
                    const isExpanded = expandedBatches.has(batch.id)
                    const revenue = batch.fields["Revenue Added (MRR)"] ? `$${formatCurrency(batch.fields["Revenue Added (MRR)"], 0)}` : "$0"

                    return (
                      <BatchRowGroup
                        key={batch.id}
                        batch={batch}
                        isExpanded={isExpanded}
                        isClient={isClient}
                        onToggle={() => toggleBatch(batch.id)}
                        onSelectExperiment={(exp) => {
                          setSelectedExperiment(exp)
                          setDetailOpen(true)
                        }}
                        onEditBatch={() => {
                          setEditBatchData({ 
                            id: batch.id, 
                            currentDate: batch.launchDate || new Date().toISOString() 
                          })
                          setEditBatchNewDate(batch.launchDate ? new Date(batch.launchDate) : undefined)
                          setEditBatchOpen(true)
                        }}
                        revenue={revenue}
                      />
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Experiment Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0">
            <div className="overflow-y-auto max-h-[85vh] w-full">
              <div className="p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle>{selectedExperiment?.fields["Test Description"] || "Experiment Details"}</DialogTitle>
                </DialogHeader>
                {selectedExperiment && (
                  <ExperimentDetailPanel 
                    experiment={selectedExperiment} 
                    isClient={isClient}
                    onRefresh={() => {
                      // Reload batches data
                      // The data will auto-refresh through SWR on interval
                      setDetailOpen(false)
                    }}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Batch Modal */}
        <Dialog open={editBatchOpen} onOpenChange={setEditBatchOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Batch Launch Date</DialogTitle>
            </DialogHeader>
            {editBatchData && (
              <div className="flex flex-col gap-4 py-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select New Launch Date</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Launch date must be at least 28 days after the previous batch and 12 business days from today.
                  </p>
                  {/* Calendar picker would go here */}
                  <input 
                    type="date" 
                    value={editBatchNewDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setEditBatchNewDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditBatchOpen(false)}>
                    Cancel
                  </Button>
                  <Button disabled>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// Batch row group component
function BatchRowGroup({
  batch,
  isExpanded,
  isClient,
  onToggle,
  onSelectExperiment,
  onEditBatch,
  revenue,
}: {
  batch: any
  isExpanded: boolean
  isClient: boolean
  onToggle: () => void
  onSelectExperiment: (exp: AirtableRecord<ExperimentFields>) => void
  onEditBatch: () => void
  revenue: string
}) {
  return (
    <>
      <TableRow
        className="hover:bg-muted/50 cursor-pointer"
        onClick={onToggle}
      >
        <TableCell>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        {!isClient && (
          <TableCell className="font-medium">
            <Link
              href={`/clients/${batch.fields["Record ID (from Client)"]?.[0] || ""}`}
              className="text-teal-700 hover:text-teal-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {batch.clientName}
            </Link>
          </TableCell>
        )}
        <TableCell>
          {batch.launchDate
            ? new Date(batch.launchDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Not set"}
        </TableCell>
        <TableCell>
          {batch.fields["PTA (Scheduled Finish)"]
            ? new Date(batch.fields["PTA (Scheduled Finish)"]).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "-"}
        </TableCell>
        <TableCell>{getBatchStatusBadge(batch.fields["All Tests Status"])}</TableCell>
        <TableCell>
          <Badge variant="secondary">{batch.experiments.length} test{batch.experiments.length !== 1 ? "s" : ""}</Badge>
        </TableCell>
        <TableCell>
          <span className={cn("text-sm font-medium", revenue !== "$0" ? "text-emerald-600" : "text-muted-foreground")}>
            {revenue}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Launch Batch</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditBatch()
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Edit Batch Date</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Delete Batch</TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded experiments */}
      {isExpanded && batch.experiments.length > 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="p-0">
            <div className="bg-muted/30 border-y border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-12">Experiment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>GEOs</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Revenue</TableHead>
                    {!isClient && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.experiments.map((exp: AirtableRecord<ExperimentFields>) => (
                    <TableRow
                      key={exp.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onSelectExperiment(exp)}
                    >
                      <TableCell className="pl-12">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{exp.fields["Test Description"]}</span>
                          {exp.fields.Hypothesis && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {exp.fields.Hypothesis}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p className="text-sm">{exp.fields.Hypothesis}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTestStatusBadge(exp.fields["Test Status"])}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-sm">{exp.fields.Placement || "-"}</span>
                          {exp.fields["Placement URL"] && (
                            <a
                              href={exp.fields["Placement URL"]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-teal-700 hover:text-teal-600 hover:underline block break-all"
                            >
                              {exp.fields["Placement URL"]}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{exp.fields.Devices || "All"}</span>
                      </TableCell>
                      <TableCell>
                        {exp.fields["GEOs Flags"] && (
                          <span className="text-sm">{exp.fields["GEOs Flags"]}</span>
                        )}
                        {!exp.fields["GEOs Flags"] && (
                          <span className="text-sm text-muted-foreground">{exp.fields.GEOs || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {exp.fields.Variants && exp.fields.Variants.length > 0 ? (
                          <span className="text-xs text-teal-700 font-medium">
                            {exp.fields.Variants.length} variant{exp.fields.Variants.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {exp.fields["Revenue Added (MRR)"] ? (
                          <span className="text-xs font-medium text-emerald-600">
                            ${exp.fields["Revenue Added (MRR)"]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {!isClient && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {exp.fields["Post-Test Analysis (Loom)"] && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={exp.fields["Post-Test Analysis (Loom)"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Video className="h-4 w-4" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>View PTA Video</TooltipContent>
                              </Tooltip>
                            )}
                            {exp.fields["FIGMA Url"] && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={exp.fields["FIGMA Url"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>View Figma</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && batch.experiments.length === 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="text-center py-6 text-sm text-muted-foreground bg-muted/30">
            No experiments attached to this batch yet.
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
