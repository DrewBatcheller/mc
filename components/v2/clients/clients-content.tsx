'use client';

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useClients, useBatches, useTeam, useContacts } from "@/hooks/v2/use-airtable"
import { useUser } from "@/contexts/v2/user-context"
import type { AirtableRecord, ClientFields } from "@/lib/v2/types"
import { truncate, formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StandardMetricCard } from "@/components/v2/standard-metric-card"
import { getClientStatusColor } from "@/lib/v2/badge-colors"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Building2,
  Globe,
  ExternalLink,
  FlaskConical,
  TrendingUp,
  Users,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ClientsAnalytics } from "./clients-analytics"


// Note: getStatusColor removed - use getClientStatusColor from badge-colors.ts instead

function getSentimentColor(sentiment?: unknown) {
  const val = Array.isArray(sentiment) ? sentiment[0] : typeof sentiment === "object" && sentiment !== null ? String(sentiment) : sentiment
  switch (typeof val === "string" ? val.toLowerCase() : undefined) {
    case "happy":
    case "great":
      return "bg-emerald-100 text-emerald-700"
    case "neutral":
    case "okay":
      return "bg-sky-50 text-sky-700"
    case "unhappy":
    case "at risk":
      return "bg-red-100 text-red-700"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function ClientsContent() {
  const router = useRouter()
  const { currentUser } = useUser()
  const { clients, isLoading: loadingClients } = useClients()
  const { batches } = useBatches()
  const { team } = useTeam()
  const { contacts } = useContacts()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [activeTab, setActiveTab] = useState("clients")

  const isManagement = currentUser?.role === "management"

  // Build batch count per client
  const clientBatchCount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of batches) {
      const clientIds = b.fields.Client || []
      for (const cid of clientIds) {
        map[cid] = (map[cid] || 0) + 1
      }
    }
    return map
  }, [batches])

  // Build contact count per client
  const clientContactCount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of contacts) {
      const clientIds = c.fields.Clients || []
      for (const cid of clientIds) {
        map[cid] = (map[cid] || 0) + 1
      }
    }
    return map
  }, [contacts])

  // Team member name map
  const teamNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of team) {
      map[t.id] = t.fields["Full Name"] || ""
    }
    return map
  }, [team])

  const filteredClients = useMemo(() => {
    let result = clients

    if (statusFilter !== "all") {
      result = result.filter((c) => {
        const s = c.fields["Client Status"]?.toLowerCase() || c.fields.Status?.toLowerCase() || ""
        return s === statusFilter.toLowerCase()
      })
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.fields["Brand Name"]?.toLowerCase().includes(q) ||
          c.fields.Website?.toLowerCase().includes(q) ||
          (Array.isArray(c.fields["Full Name (from Strategist)"]) ? c.fields["Full Name (from Strategist)"][0] : c.fields["Full Name (from Strategist)"])?.toLowerCase().includes(q) ||
          (Array.isArray(c.fields["Full Name (from Designer)"]) ? c.fields["Full Name (from Designer)"][0] : c.fields["Full Name (from Designer)"])?.toLowerCase().includes(q) ||
          (Array.isArray(c.fields["Full Name (from Developer)"]) ? c.fields["Full Name (from Developer)"][0] : c.fields["Full Name (from Developer)"])?.toLowerCase().includes(q)
      )
    }

    return result.sort((a, b) =>
      (a.fields["Brand Name"] || "").localeCompare(b.fields["Brand Name"] || "")
    )
  }, [clients, statusFilter, search])

  // Stats
  const activeCount = clients.filter((c) => {
    const s = c.fields["Client Status"]?.toLowerCase() || c.fields.Status?.toLowerCase() || ""
    return s === "active"
  }).length
  const pausedCount = clients.filter((c) => {
    const s = c.fields["Client Status"]?.toLowerCase() || c.fields.Status?.toLowerCase() || ""
    return s === "paused"
  }).length

  if (loadingClients) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading clients...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StandardMetricCard label="Total" value={clients.length} />
        <StandardMetricCard label="Active" value={activeCount} color="emerald" />
        <StandardMetricCard label="Paused" value={pausedCount} color="amber" />
        <StandardMetricCard label="Total Batches" value={batches.length} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="mt-6">
          {/* Filters */}
          <div className="py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name, website, team..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clients Table */}
          <Card className="mt-2">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Brand Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Strategist</TableHead>
                    <TableHead>Designer</TableHead>
                    <TableHead>Developer</TableHead>
                    <TableHead>QA</TableHead>
                    <TableHead className="text-right">Tests</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No clients found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => {
                      const status = client.fields["Client Status"] || client.fields.Status || "Unknown"
                      const batchCount = clientBatchCount[client.id] || 0
                      const totalTests = client.fields["Total Tests Run"] || 0
                      const winRate = client.fields["Test Win Rate (%)"]
                      const revenue = client.fields["Revenue Added (MRR) (K Format ) Rollup (from Experiments)"]

                      return (
                        <TableRow 
                          key={client.id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">
                              {client.fields.Avatar?.[0]?.url && (
                                <Image
                                  src={client.fields.Avatar[0].url || "/placeholder.svg"}
                                  alt={client.fields["Brand Name"]}
                                  width={32}
                                  height={32}
                                  className="rounded-md object-cover flex-shrink-0"
                                />
                              )}
                              <span className="font-medium text-sm text-foreground">
                                {client.fields["Brand Name"]}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${getClientStatusColor(status)}`}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {client.fields["Plan Type"] || "-"}
                          </TableCell>
                          <TableCell>
                            {client.fields.Sentiment ? (
                              <Badge className={`text-xs ${getSentimentColor(client.fields.Sentiment)}`}>
                                {Array.isArray(client.fields.Sentiment) ? client.fields.Sentiment[0] : String(client.fields.Sentiment)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(Array.isArray(client.fields["Full Name (from Strategist)"]) ? client.fields["Full Name (from Strategist)"][0] : client.fields["Full Name (from Strategist)"]) || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(Array.isArray(client.fields["Full Name (from Designer)"]) ? client.fields["Full Name (from Designer)"][0] : client.fields["Full Name (from Designer)"]) || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(Array.isArray(client.fields["Full Name (from Developer)"]) ? client.fields["Full Name (from Developer)"][0] : client.fields["Full Name (from Developer)"]) || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(Array.isArray(client.fields["Full Name (from QA)"]) ? client.fields["Full Name (from QA)"][0] : client.fields["Full Name (from QA)"]) || "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {totalTests > 0 ? totalTests : "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {winRate ? (
                              <span className={winRate > 50 ? "text-emerald-600 font-medium" : "text-foreground"}>
                                {Number(winRate).toFixed(2)}%
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {batchCount > 0 ? batchCount : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {revenue ? `$${formatCurrency(revenue)}` : "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <ClientsAnalytics clients={clients} team={team} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
