"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Lightbulb,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Globe,
  Monitor,
  Target,
  Plus,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { CreateTestIdeaModal } from "./create-test-idea-modal"
import { ConvertToExperimentModal } from "./convert-to-experiment-modal"
import { useClients, useExperimentIdeas, useBatches, useTeam } from "@/hooks/v2/use-airtable"
import { useUser } from "@/contexts/v2/user-context"
import type { AirtableRecord, ExperimentIdeaFields } from "@/lib/v2/types"

export function TestIdeasContent() {
  const { currentUser } = useUser()
  const isClient = currentUser?.role === "client"

  const { clients, isLoading: clientsLoading } = useClients()
  const { ideas, isLoading: ideasLoading, mutate: mutateIdeas } = useExperimentIdeas()
  const { batches } = useBatches()
  const { team } = useTeam()

  const [searchTerm, setSearchTerm] = useState("")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [selectedIdea, setSelectedIdea] = useState<AirtableRecord<ExperimentIdeaFields> | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [ideaToConvert, setIdeaToConvert] = useState<AirtableRecord<ExperimentIdeaFields> | null>(null)

  const isLoading = clientsLoading || ideasLoading

  // Client name lookup
  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>()
    clients.forEach((c) => {
      map.set(c.id, c.fields["Brand Name"] || "Unknown")
    })
    return map
  }, [clients])

  const activeClients = useMemo(() => {
    return clients
      .filter((c) => c.fields["Client Status"] !== "Churned")
      .sort((a, b) => (a.fields["Brand Name"] || "").localeCompare(b.fields["Brand Name"] || ""))
  }, [clients])

  // Enrich ideas with client name
  const enrichedIdeas = useMemo(() => {
    return ideas.map((idea) => {
      const clientIds = idea.fields.Client || []
      const clientName = clientIds.length > 0 ? clientNameMap.get(clientIds[0]) || "Unassigned" : "Unassigned"
      return { ...idea, clientName, clientRecordId: clientIds[0] || "" }
    })
  }, [ideas, clientNameMap])

  // Filter
  const filteredIdeas = useMemo(() => {
    return enrichedIdeas.filter((idea) => {
      if (isClient && currentUser?.clientRecordId) {
        if (idea.clientRecordId !== currentUser?.clientRecordId) return false
      } else if (clientFilter !== "all") {
        if (idea.clientRecordId !== clientFilter) return false
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matches =
          idea.fields["Test Description"]?.toLowerCase().includes(term) ||
          idea.fields.Hypothesis?.toLowerCase().includes(term) ||
          idea.fields.Placement?.toLowerCase().includes(term) ||
          idea.clientName.toLowerCase().includes(term)
        if (!matches) return false
      }

      return true
    })
  }, [enrichedIdeas, clientFilter, searchTerm, isClient, currentUser?.clientRecordId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading test ideas...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Test Ideas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and manage experiment ideas across clients
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? "s" : ""}
            </Badge>
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Idea
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ideas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {!isClient && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {activeClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fields["Brand Name"]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Ideas Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isClient && <TableHead>Client</TableHead>}
                  <TableHead>Test Description</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Goals</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>GEOs</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIdeas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isClient ? 7 : 8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Lightbulb className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No test ideas found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIdeas.map((idea) => (
                    <TableRow
                      key={idea.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedIdea(idea)
                        setDetailOpen(true)
                      }}
                    >
                      {!isClient && (
                        <TableCell className="font-medium pl-4">
                          <Link
                            href={`/clients/${idea.clientRecordId}`}
                            className="text-teal-700 hover:text-teal-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {idea.clientName}
                          </Link>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{idea.fields["Test Description"]}</span>
                          {idea.fields.Hypothesis && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {idea.fields.Hypothesis}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p className="text-sm">{idea.fields.Hypothesis}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div>{idea.fields.Placement || "-"}</div>
                          {idea.fields["Placement URL"] && (
                            <a
                              href={idea.fields["Placement URL"]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-teal-700 hover:text-teal-600 hover:underline block break-all"
                            >
                              {idea.fields["Placement URL"]}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {idea.fields["Primary Goals"] ? (
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(idea.fields["Primary Goals"]) ? idea.fields["Primary Goals"] : String(idea.fields["Primary Goals"]).split(",")).map((g) => (
                              <Badge key={g.trim()} variant="outline" className="text-xs">
                                {g.trim()}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{idea.fields.Devices || "All"}</TableCell>
                      <TableCell className="text-sm">{idea.fields.GEOs || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {typeof idea.fields["Created By"] === "object" && idea.fields["Created By"]?.name ? idea.fields["Created By"].name : (idea.fields["Created By"] || "-")}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        {!isClient && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIdeaToConvert(idea)
                              setConvertModalOpen(true)
                            }}
                            className="bg-transparent"
                          >
                            <Zap className="h-3.5 w-3.5 mr-1" />
                            Convert
                          </Button>
                        )}
                        {idea.fields["Sync to Schedule"] && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={idea.fields["Sync to Schedule"]}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Sync to Schedule</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Idea Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedIdea?.fields["Test Description"] || "Test Idea Details"}</DialogTitle>
            </DialogHeader>
            {selectedIdea && <IdeaDetailPanel idea={selectedIdea} />}
          </DialogContent>
        </Dialog>

      {/* Create Modal */}
      <CreateTestIdeaModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        clients={clients}
        isClient={isClient}
        userClientId={currentUser?.clientRecordId}
        onSuccess={() => {
          mutateIdeas()
        }}
      />

      {/* Convert to Experiment Modal */}
      {ideaToConvert && (
        <ConvertToExperimentModal
          isOpen={convertModalOpen}
          onOpenChange={setConvertModalOpen}
          idea={ideaToConvert}
          clientId={ideaToConvert.fields.Client?.[0] || ""}
          batches={batches.filter((b) => b.fields.Client?.includes(ideaToConvert.fields.Client?.[0] || ""))}
          teamMembers={team}
          clientStrategist={ideaToConvert.fields.Client?.[0] ? 
            clients.find((c) => c.id === ideaToConvert.fields.Client?.[0])?.fields.Strategist?.[0] 
            : undefined}
          clientDesigner={ideaToConvert.fields.Client?.[0] ? 
            clients.find((c) => c.id === ideaToConvert.fields.Client?.[0])?.fields.Designer?.[0]
            : undefined}
          clientDeveloper={ideaToConvert.fields.Client?.[0] ? 
            clients.find((c) => c.id === ideaToConvert.fields.Client?.[0])?.fields.Developer?.[0]
            : undefined}
          clientQA={ideaToConvert.fields.Client?.[0] ? 
            clients.find((c) => c.id === ideaToConvert.fields.Client?.[0])?.fields.QA?.[0]
            : undefined}
          onSuccess={() => {
            mutateIdeas()
            setConvertModalOpen(false)
          }}
        />
      )}
      </div>
    </TooltipProvider>
  )
}

function IdeaDetailPanel({ idea }: { idea: AirtableRecord<ExperimentIdeaFields> }) {
  const f = idea.fields

  const links = [
    { label: "Design Brief", url: f["Design Brief"] },
    { label: "Dev Brief", url: f["Development Brief"] },
    { label: "Media/Links", url: f["Media/Links"] },
    { label: "Figma", url: f["FIGMA Url"] },
    { label: "Walkthrough", url: f["Walkthrough Video URL"] },
    { label: "Placement URL", url: f["Placement URL"] },
  ].filter((l) => l.url)

  return (
    <div className="flex flex-col gap-5">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2">
        {f.Placement && <Badge variant="secondary">{f.Placement}</Badge>}
        {f.Devices && <Badge variant="outline">{f.Devices}</Badge>}
        {f["Variants Weight"] && <Badge variant="outline">Split: {f["Variants Weight"]}</Badge>}
        {f.GEOs && <Badge variant="outline">{f.GEOs}</Badge>}
        {f["Created By"] && (
          <Badge variant="secondary" className="bg-teal-50 text-teal-700">
            By: {typeof f["Created By"] === "object" && f["Created By"]?.name ? f["Created By"].name : f["Created By"]}
          </Badge>
        )}
      </div>

      {f.Hypothesis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hypothesis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{f.Hypothesis}</p>
          </CardContent>
        </Card>
      )}

      {f.Rationale && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rationale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{f.Rationale}</p>
          </CardContent>
        </Card>
      )}

      {f["Primary Goals"] && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Primary Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
{(Array.isArray(f["Primary Goals"]) ? f["Primary Goals"] : String(f["Primary Goals"]).split(",")).map((g) => (
                          <Badge key={g.trim()} variant="secondary">
                            {g.trim()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {links.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Resources</h4>
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="bg-transparent gap-1.5">
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
