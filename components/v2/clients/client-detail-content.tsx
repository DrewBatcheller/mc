"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { TooltipProvider } from "@/components/ui/tooltip" // Import TooltipProvider
import { ImageIcon, Loader2 } from "lucide-react"
import Image from "next/image"
import { truncate, formatCurrency } from "@/lib/utils"
import {
  useClients,
  useBatches,
  useExperiments,
  useContacts,
  useTeam,
  useTasks,
  useCallRecords,
  useVariants,
} from "@/hooks/v2/use-airtable"
import { useUser } from "@/contexts/v2/user-context"
import type {
  AirtableRecord,
  ClientFields,
  BatchFields,
  ExperimentFields,
  ContactFields,
  TaskFields,
} from "@/lib/v2/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/v2/status-badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Building2,
  Globe,
  ExternalLink,
  Mail,
  Users,
  FlaskConical,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  Phone,
  DollarSign,
  Pencil,
  ChevronRight,
  Play,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import ContactsEditor from "@/components/v2/clients/ContactsEditor" // Import ContactsEditor
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BatchRowGroup } from "@/components/v2/shared/batch-row-group"
import { ExperimentDetailPanel } from "@/components/v2/client-tracker/experiment-detail-panel"

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "paused":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    case "churned":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getTestStatusBadge(status?: string) {
  if (!status) return <Badge variant="outline">Unknown</Badge>
  return <StatusBadge status={status} variant="solid" />
}

function getBatchStatusBadge(allTestStatuses?: string | string[]) {
  if (!allTestStatuses || (Array.isArray(allTestStatuses) && allTestStatuses.length === 0)) return <Badge variant="outline">No Tests</Badge>
  const statuses = (Array.isArray(allTestStatuses) ? allTestStatuses : String(allTestStatuses).split(",")).map((s) => s.trim().toLowerCase())
  if (statuses.some((s) => s.includes("live") || s.includes("collecting")))
    return <StatusBadge status="Live" variant="solid" />
  if (statuses.every((s) => s.includes("successful") || s.includes("winner")))
    return <StatusBadge status="Successful" variant="solid" />
  if (statuses.every((s) => s.includes("inconclusive")))
    return <StatusBadge status="Inconclusive" variant="solid" />
  if (statuses.some((s) => s.includes("pending") || s.includes("draft")))
    return <StatusBadge status="In Progress" variant="solid" />
  return <StatusBadge status="Mixed" variant="solid" />
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    // Parse date string as local date (YYYY-MM-DD format)
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "-"
  }
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function ClientDetailContent() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentFields | null>(null)
  const [selectedExperimentRecord, setSelectedExperimentRecord] = useState<AirtableRecord<ExperimentFields> | null>(null)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const { currentUser } = useUser()
  const isClient = currentUser?.role === "client"

  const { clients, isLoading: loadingClient } = useClients()
  const { batches, isLoading: loadingBatches } = useBatches({ clientId })
  const { experiments, isLoading: loadingExperiments } = useExperiments({ clientId })
  const { tasks, isLoading: loadingTasks } = useTasks({ clientId })
  const { callRecords } = useCallRecords(clientId)
  const { team } = useTeam()
  const { variants } = useVariants()

  const client = useMemo(() => {
    return clients.find((c) => c.id === clientId)
  }, [clients, clientId])

  // Use contact IDs from the client's Contacts field if available
  const contactIds = client?.fields.Contacts || []
  const { contacts, isLoading: loadingContacts } = useContacts(contactIds.length > 0 ? contactIds : undefined)

  const isLoading = loadingClient

  // Team members assigned to this client
  const assignedTeam = useMemo(() => {
    if (!client) return []
    const assignments: { role: string; name: string }[] = []
    const strategist = Array.isArray(client.fields["Full Name (from Strategist)"]) ? client.fields["Full Name (from Strategist)"][0] : client.fields["Full Name (from Strategist)"]
    const designer = Array.isArray(client.fields["Full Name (from Designer)"]) ? client.fields["Full Name (from Designer)"][0] : client.fields["Full Name (from Designer)"]
    const developer = Array.isArray(client.fields["Full Name (from Developer)"]) ? client.fields["Full Name (from Developer)"][0] : client.fields["Full Name (from Developer)"]
    const qa = Array.isArray(client.fields["Full Name (from QA)"]) ? client.fields["Full Name (from QA)"][0] : client.fields["Full Name (from QA)"]
    if (strategist) assignments.push({ role: "Strategist", name: strategist })
    if (designer) assignments.push({ role: "Designer", name: designer })
    if (developer) assignments.push({ role: "Developer", name: developer })
    if (qa) assignments.push({ role: "QA", name: qa })
    return assignments
  }, [client])

  // Experiment stats
  const experimentStats = useMemo(() => {
    const total = experiments.length
    const live = experiments.filter((e) => {
      const s = (e.fields["Test Status"] || "").toLowerCase()
      return s.includes("live") || s.includes("collecting")
    }).length
    const successful = experiments.filter((e) => {
      const s = (e.fields["Test Status"] || "").toLowerCase()
      return s.includes("successful") || s.includes("winner")
    }).length
    return { total, live, successful }
  }, [experiments])

  // Active tasks
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => {
      const s = t.fields.Status?.toLowerCase() || ""
      return !s.includes("done") && !s.includes("complete")
    })
  }, [tasks])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center flex flex-col items-center gap-3">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Client Not Found</h2>
          <p className="text-sm text-muted-foreground">This client record does not exist.</p>
          <Button variant="outline" className="bg-transparent" onClick={() => router.push("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const f = client.fields
  const status = f["Client Status"] || f.Status || "Unknown"

  return (
    <TooltipProvider>
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="bg-transparent" onClick={() => router.push("/clients")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {client?.fields.Avatar?.[0]?.url ? (
              <Image
                src={client.fields.Avatar[0].url || "/placeholder.svg"}
                alt={client.fields["Brand Name"]}
                width={56}
                height={56}
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{f["Brand Name"]}</h1>
                <Badge className={getStatusColor(status)}>{status}</Badge>
                {f.Sentiment && (
                  <Badge variant="outline" className="text-xs">{f.Sentiment}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                {f.Website && (
                  <a
                    href={f.Website.startsWith("http") ? f.Website : `https://${f.Website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {f.Website}
                  </a>
                )}
                {f["Plan Type"] && (
                  <span className="text-sm text-muted-foreground">Plan: {f["Plan Type"]}</span>
                )}
                {f["Monthly Price"] && (
                  <span className="text-sm text-muted-foreground">
                    <DollarSign className="h-3 w-3 inline" />{f["Monthly Price"]}/mo
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() => router.push(`/clients/${clientId}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            {f["Shopify Shop URL"] && (
              <a href={f["Shopify Shop URL"]} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="bg-transparent">
                  Shopify
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Button>
              </a>
            )}
            {f["Client Portal URL"] && (
              <a href={f["Client Portal URL"]} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="bg-transparent">
                  Portal
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Button>
              </a>
            )}
            {f["Convert Account ID"] && (
              <Badge variant="secondary" className="text-xs">
                Convert: {f["Convert Account ID"]}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Total Tests</p>
              </div>
              <p className="text-xl font-bold">{f["Total Tests Run"] || experimentStats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-teal-500" />
                <p className="text-xs font-medium text-muted-foreground">Live Now</p>
              </div>
              <p className="text-xl font-bold text-teal-600">{experimentStats.live}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-medium text-muted-foreground">Successful</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">{f["Successful Tests"] || experimentStats.successful}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Win Rate</p>
              </div>
              <p className="text-xl font-bold">
                {f["Test Win Rate (%)"] ? `${Number(f["Test Win Rate (%)"]).toFixed(2)}%` : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-medium text-muted-foreground">Revenue Added</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                ${f["Revenue Added (MRR) (K Format ) Rollup (from Experiments)"] ? formatCurrency(f["Revenue Added (MRR) (K Format ) Rollup (from Experiments)"]) : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Active Tasks</p>
              </div>
              <p className="text-xl font-bold">{activeTasks.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="batches">
              Batches ({batches.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="contacts">
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="calls">
              Calls ({callRecords.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Assignments */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Assigned Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assignedTeam.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No team members assigned.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {assignedTeam.map((a) => (
                        <div key={a.role} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <span className="text-sm text-muted-foreground">{a.role}</span>
                          <span className="text-sm font-medium text-foreground">{a.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Client Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <DetailRow label="Plan Type" value={f["Plan Type"]} />
                    <DetailRow label="Monthly Price" value={f["Monthly Price"]} />
                    <DetailRow label="Initial Closed Date" value={formatDate(f["Initial Closed Date"])} />
                    <DetailRow label="Total Spent" value={f["Total Spent"]} />
                    <DetailRow label="LTV" value={f.LTV} />
                    <DetailRow label="ROI %" value={f["ROI %"]} />
                    <DetailRow label="ROI $" value={f["ROI $"]} />
                    <DetailRow label="Dev Enabled" value={f["Development Enabled"] ? "Yes" : undefined} />
                    <DetailRow label="Dev Hours Assigned" value={f["Development Hours Assigned"]?.toString()} />
                    <DetailRow label="Dev Hours Logged" value={f["Dev Hours Logged"]?.toString()} />
                    <DetailRow label="Slack Channel" value={f["Slack Channel ID"]} />
                    <DetailRow label="Convert Project ID" value={f["Convert Project ID"]} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Resources & Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {f.Website && (
                    <LinkButton label="Website" url={f.Website.startsWith("http") ? f.Website : `https://${f.Website}`} />
                  )}
                  {f["Shopify Shop URL"] && <LinkButton label="Shopify" url={f["Shopify Shop URL"]} />}
                  {f["Client Portal URL"] && <LinkButton label="Client Portal" url={f["Client Portal URL"]} />}
                  {f["Fathom Qualifying Call Summary URL"] && <LinkButton label="Qualifying Call" url={f["Fathom Qualifying Call Summary URL"]} />}
                  {f["Fathom Sales Call Summary URL"] && <LinkButton label="Sales Call" url={f["Fathom Sales Call Summary URL"]} />}
                  {f["Fathom Onboarding Call"] && <LinkButton label="Onboarding Call" url={f["Fathom Onboarding Call"]} />}
                </div>
                {!f.Website && !f["Shopify Shop URL"] && !f["Client Portal URL"] && (
                  <p className="text-sm text-muted-foreground">No links available.</p>
                )}
              </CardContent>
            </Card>

            {f.Notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{f.Notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Batches Tab */}
          <TabsContent value="batches" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]" />
                      <TableHead>Launch Date</TableHead>
                      <TableHead>Finish Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Revenue Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBatches ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No batches found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      batches.map((batch) => {
                        const isExpanded = expandedBatch === batch.id
                        const revenue = batch.fields["Revenue Added (MRR)"] ? `$${formatCurrency(batch.fields["Revenue Added (MRR)"], 0)}` : "$0"

                        return (
                          <TooltipProvider key={batch.id}>
                            <BatchRowGroup
                              batch={{ 
                                ...batch, 
                                launchDate: batch.fields["Launch Date"],
                                experiments: experiments.filter((exp) => exp.fields.Batch?.includes(batch.id)) 
                              }}
                              isExpanded={isExpanded}
                              isClient={true}
                              onToggle={() => setExpandedBatch(isExpanded ? null : batch.id)}
                              onSelectExperiment={(exp) => {
                                setSelectedExperimentRecord(exp)
                                setDetailOpen(true)
                              }}
                              onEditBatch={() => {
                                // For client view, editing is not available
                              }}
                              revenue={revenue}
                              showActions={false}
                              getBatchStatusBadge={getBatchStatusBadge}
                              getTestStatusBadge={getTestStatusBadge}
                            />
                          </TooltipProvider>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experiment Detail Dialog */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0">
              <div className="overflow-y-auto max-h-[85vh] w-full">
                <div className="p-6">
                  <DialogHeader className="mb-6">
                    <DialogTitle>{selectedExperimentRecord?.fields["Test Description"] || "Experiment Details"}</DialogTitle>
                  </DialogHeader>
                  {selectedExperimentRecord && (
                    <ExperimentDetailPanel 
                      experiment={selectedExperimentRecord} 
                      isClient={isClient}
                      onRefresh={() => {
                        setDetailOpen(false)
                      }}
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No tasks found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => {
                        const overdue =
                          task.fields["Due Date"] &&
                          !task.fields.Status?.toLowerCase().includes("done") &&
                          new Date(task.fields["Due Date"]) < new Date()
                        return (
                          <TableRow key={task.id} className={overdue ? "bg-red-50 dark:bg-red-900/10" : ""}>
                            <TableCell className="font-medium text-sm">
                              {task.fields["Team Facing Name"]}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {task.fields.Department || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              {formatDate(task.fields["Due Date"])}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  overdue
                                    ? "bg-red-100 text-red-700"
                                    : task.fields.Status?.toLowerCase().includes("done")
                                      ? "bg-emerald-100 text-emerald-700"
                                      : ""
                                }`}
                              >
                                {overdue ? "Overdue" : task.fields.Status || "Not Started"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {task.fields["Assigned to"] || "-"}
                            </TableCell>
                            <TableCell>
                              {task.fields["Open URL"] && (
                                <a href={task.fields["Open URL"]} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-4">
            <div className="space-y-4">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No contacts found</p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <Card key={contact.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {contact.fields.Avatar?.[0]?.url && (
                          <img
                            src={contact.fields.Avatar[0].url || "/placeholder.svg"}
                            alt={contact.fields["Full Name"]}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <div className="font-medium">
                            {contact.fields["Full Name"]}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {contact.fields["User Email"] && (
                              <div>
                                <span className="font-medium">Email:</span> {contact.fields["User Email"]}
                              </div>
                            )}
                            {contact.fields["User Type"] && (
                              <div>
                                <span className="font-medium">Type:</span> {contact.fields["User Type"]}
                              </div>
                            )}
                            {contact.fields["Slack Member ID"] && (
                              <div>
                                <span className="font-medium">Slack:</span> {contact.fields["Slack Member ID"]}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Notifications:</span>{" "}
                              {contact.fields["Receive Notifications"] ? (
                                <StatusBadge status="On" label="On" />
                              ) : (
                                <Badge className="ml-2" variant="outline">Off</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {callRecords.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <Phone className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No call records found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="w-[80px]">Links</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {callRecords.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell className="font-medium text-sm">
                            {call.fields["Event Name"] || "Call"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {call.fields["Event Type"] || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(call.fields["Event Start Time"])}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {call.fields["Client Full Name"] || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {call.fields["Fathom URL"] && (
                                <a href={call.fields["Fathom URL"]} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    Fathom
                                  </Button>
                                </a>
                              )}
                              {call.fields["Join URL"] && (
                                <a href={call.fields["Join URL"]} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Experiment Detail Modal */}
        <Dialog open={!!selectedExperiment} onOpenChange={(open) => !open && setSelectedExperiment(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedExperiment?.["Test Description"]}</DialogTitle>
              <DialogDescription>Full experiment details</DialogDescription>
            </DialogHeader>

            {selectedExperiment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                    <div>{getTestStatusBadge(selectedExperiment["Test Status"])}</div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Launch Date</p>
                    <p className="text-sm">{formatDate(selectedExperiment["Launch Date"])}</p>
                  </div>
                </div>

                {selectedExperiment.Hypothesis && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Hypothesis</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedExperiment.Hypothesis}</p>
                  </div>
                )}

                {selectedExperiment.Rationale && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Rationale</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedExperiment.Rationale}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedExperiment.Placement && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Placement</p>
                      <p className="text-sm">{selectedExperiment.Placement}</p>
                      {selectedExperiment["Placement URL"] && (
                        <a
                          href={selectedExperiment["Placement URL"]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:underline"
                        >
                          Visit Placement
                        </a>
                      )}
                    </div>
                  )}
                  {selectedExperiment["Variants Weight"] && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Variants Weight</p>
                      <p className="text-sm">{selectedExperiment["Variants Weight"]}</p>
                    </div>
                  )}
                </div>

                {selectedExperiment["Primary Goals"] && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Primary Goals</p>
                    <p className="text-sm">{selectedExperiment["Primary Goals"]}</p>
                  </div>
                )}

                {selectedExperiment["Design Brief"] && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Design Brief</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedExperiment["Design Brief"]}</p>
                  </div>
                )}

                {selectedExperiment["Development Brief"] && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Development Brief</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedExperiment["Development Brief"]}</p>
                  </div>
                )}

                {selectedExperiment["Media/Links"] && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Media/Links</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedExperiment["Media/Links"]}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedExperiment.GEOs && selectedExperiment.GEOs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">GEOs</p>
                      <div className="flex gap-1 flex-wrap">
                        {selectedExperiment.GEOs.map((geo) => (
                          <Tooltip key={geo}>
                            <TooltipTrigger asChild>
                              <span className="text-2xl">{getCountryFlag(geo)}</span>
                            </TooltipTrigger>
                            <TooltipContent>{geo}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedExperiment.Devices && selectedExperiment.Devices.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Devices</p>
                      <p className="text-sm">{Array.isArray(selectedExperiment.Devices) ? selectedExperiment.Devices.join(", ") : selectedExperiment.Devices}</p>
                    </div>
                  )}
                </div>

                {selectedExperiment["Revenue Added (MRR)"] && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Revenue Added (MRR)</p>
                    <p className="text-sm font-medium text-emerald-600">${selectedExperiment["Revenue Added (MRR)"]}</p>
                  </div>
                )}

                {(selectedExperiment["PTA Video"] || selectedExperiment["PTA Result Image"]) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">PTA Media</p>
                    <div className="flex gap-2">
                      {selectedExperiment["PTA Video"] && (
                        <a
                          href={selectedExperiment["PTA Video"]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs"
                        >
                          <Play className="h-3.5 w-3.5" />
                          PTA Video
                        </a>
                      )}
                      {selectedExperiment["PTA Result Image"] && (
                        <a
                          href={selectedExperiment["PTA Result Image"]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Result Image
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  if (!value || value === "-") return null
  
  // Handle ROI % which might be an object or array
  if (typeof value === "object") {
    if (Array.isArray(value) && value.length > 0) {
      value = value[0]
    } else {
      return null
    }
  }
  
  // Format currency fields with commas
  const isCurrencyField = label.includes("$") || label === "ROI $" || label === "Total Spent" || label === "Monthly Price" || label === "Revenue Added"
  const displayValue = typeof value === "number" || (typeof value === "string" && !isNaN(Number(value))) 
    ? (isCurrencyField ? formatCurrency(value) : truncate(value))
    : String(value)
  
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{displayValue}</span>
    </div>
  )
}

function LinkButton({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" size="sm" className="bg-transparent gap-1.5">
        {label}
        <ExternalLink className="h-3 w-3" />
      </Button>
    </a>
  )
}
