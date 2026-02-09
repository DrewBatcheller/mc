"use client"

import { useState, useMemo } from "react"
import { useTeam, useClients } from "@/hooks/v2/use-airtable"
import type { AirtableRecord, TeamFields } from "@/lib/v2/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Mail,
  Building2,
  Calendar,
  Users,
  ArrowLeft,
  ExternalLink,
  X,
} from "lucide-react"

function getInitials(name?: string) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getDeptColor(dept?: string) {
  switch (dept?.toLowerCase()) {
    case "strategy":
      return "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
    case "design":
      return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400"
    case "development":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "qa":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    case "management":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getEmploymentStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "inactive":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    case "on leave":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function TeamContent() {
  const { team, isLoading } = useTeam()
  const { clients } = useClients()
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedMember, setSelectedMember] = useState<AirtableRecord<TeamFields> | null>(null)

  const departments = useMemo(() => {
    const depts = new Set<string>()
    for (const m of team) {
      if (m.fields.Department) depts.add(m.fields.Department)
    }
    return Array.from(depts).sort()
  }, [team])

  const filteredTeam = useMemo(() => {
    let result = team
    if (deptFilter !== "all") {
      result = result.filter((m) => m.fields.Department === deptFilter)
    }
    if (statusFilter !== "all") {
      result = result.filter((m) => {
        const s = m.fields["Employment Status"]?.toLowerCase() || ""
        return s === statusFilter.toLowerCase()
      })
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.fields["Full Name"]?.toLowerCase().includes(q) ||
          m.fields.Email?.toLowerCase().includes(q) ||
          m.fields.Department?.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) =>
      (a.fields["Full Name"] || "").localeCompare(b.fields["Full Name"] || "")
    )
  }, [team, deptFilter, statusFilter, search])

  const clientNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of clients) {
      map[c.id] = c.fields["Brand Name"]
    }
    return map
  }, [clients])

  // Stats
  const activeCount = team.filter(
    (m) => m.fields["Employment Status"]?.toLowerCase() === "active"
  ).length
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of team) {
      const dept = m.fields.Department || "Unassigned"
      counts[dept] = (counts[dept] || 0) + 1
    }
    return counts
  }, [team])

  // Get unique client count for a member
  function getMemberClientCount(member: AirtableRecord<TeamFields>) {
    const clientLinks = [
      ...(member.fields["Dev Client Link"] || []),
      ...(member.fields["Design Client Link"] || []),
      ...(member.fields["Strategist Client Link"] || []),
      ...(member.fields["QA Client Link"] || []),
    ]
    return new Set(clientLinks).size
  }

  function getMemberClients(member: AirtableRecord<TeamFields>) {
    const clientLinks = [
      ...(member.fields["Dev Client Link"] || []),
      ...(member.fields["Design Client Link"] || []),
      ...(member.fields["Strategist Client Link"] || []),
      ...(member.fields["QA Client Link"] || []),
    ]
    return [...new Set(clientLinks)]
  }

  // Get client assignment role map for a member
  function getMemberClientRoles(member: AirtableRecord<TeamFields>) {
    const roles: Record<string, string[]> = {}
    for (const id of member.fields["Dev Client Link"] || []) {
      if (!roles[id]) roles[id] = []
      roles[id].push("Developer")
    }
    for (const id of member.fields["Design Client Link"] || []) {
      if (!roles[id]) roles[id] = []
      roles[id].push("Designer")
    }
    for (const id of member.fields["Strategist Client Link"] || []) {
      if (!roles[id]) roles[id] = []
      roles[id].push("Strategist")
    }
    for (const id of member.fields["QA Client Link"] || []) {
      if (!roles[id]) roles[id] = []
      roles[id].push("QA")
    }
    return roles
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading team...</div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team</h1>
            <p className="text-sm text-muted-foreground">{team.length} team members</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-0">
              <p className="text-sm font-medium text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold text-foreground">{team.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-0">
              <p className="text-sm font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-0">
              <p className="text-sm font-medium text-muted-foreground">Departments</p>
              <p className="text-2xl font-bold text-foreground">{Object.keys(deptCounts).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-0">
              <p className="text-sm font-medium text-muted-foreground">On Leave</p>
              <p className="text-2xl font-bold text-amber-600">
                {team.filter((m) => m.fields["Time Off (Start)"]).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d} ({deptCounts[d] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Team Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                  <TableHead>Time Off</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeam.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No team members found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeam.map((member) => {
                    const photo = member.fields["Profile Photo"]?.[0]
                    const clientCount = getMemberClientCount(member)
                    const empStatus = member.fields["Employment Status"] || "Unknown"
                    const hasTimeOff = !!member.fields["Time Off (Start)"]

                    return (
                      <TableRow
                        key={member.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedMember(member)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={photo?.thumbnails?.small?.url || photo?.url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.fields["Full Name"])}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm text-foreground">
                              {member.fields["Full Name"]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${getDeptColor(member.fields.Department)}`}>
                            {member.fields.Department || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.fields.Email || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.fields.Select || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${getEmploymentStatusColor(empStatus)}`}>
                            {empStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {clientCount > 0 ? clientCount : "-"}
                        </TableCell>
                        <TableCell>
                          {hasTimeOff ? (
                            <span className="text-xs text-amber-600">
                              {member.fields["Time Off (Start)"]}
                              {member.fields["Time Off (End)"] && ` - ${member.fields["Time Off (End)"]}`}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Team Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedMember && (
            <TeamMemberDetailView
              member={selectedMember}
              clientNameMap={clientNameMap}
              getMemberClientRoles={getMemberClientRoles}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function TeamMemberDetailView({
  member,
  clientNameMap,
  getMemberClientRoles,
}: {
  member: AirtableRecord<TeamFields>
  clientNameMap: Record<string, string>
  getMemberClientRoles: (member: AirtableRecord<TeamFields>) => Record<string, string[]>
}) {
  const photo = member.fields["Profile Photo"]?.[0]
  const clientRoles = getMemberClientRoles(member)
  const clientIds = Object.keys(clientRoles)
  const empStatus = member.fields["Employment Status"] || "Unknown"

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={photo?.thumbnails?.large?.url || photo?.url} />
            <AvatarFallback className="text-lg">
              {getInitials(member.fields["Full Name"])}
            </AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle className="text-xl">{member.fields["Full Name"]}</DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${getDeptColor(member.fields.Department)}`}>
                {member.fields.Department || "N/A"}
              </Badge>
              <Badge className={`text-xs ${getEmploymentStatusColor(empStatus)}`}>
                {empStatus}
              </Badge>
              {member.fields.Select && (
                <Badge variant="outline" className="text-xs">{member.fields.Select}</Badge>
              )}
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-5 mt-4">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {member.fields.Email && (
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                  <a
                    href={`mailto:${member.fields.Email}`}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {member.fields.Email}
                  </a>
                </div>
              )}
              {member.fields["Slack Member ID"] && (
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-sm text-muted-foreground">Slack ID</span>
                  <span className="text-sm font-medium text-foreground">{member.fields["Slack Member ID"]}</span>
                </div>
              )}
              {member.fields["Team Member Record ID"] && (
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-sm text-muted-foreground">Record ID</span>
                  <span className="text-sm font-mono text-xs text-muted-foreground">{member.fields["Team Member Record ID"]}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time Off */}
        {member.fields["Time Off (Start)"] && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Time Off: {member.fields["Time Off (Start)"]}
                  {member.fields["Time Off (End)"] && ` - ${member.fields["Time Off (End)"]}`}
                </span>
              </div>
              {member.fields["Time Off (Replacement)"] && (
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  Replacement: {member.fields["Time Off (Replacement)"]}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assigned Clients */}
        {clientIds.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Assigned Clients ({clientIds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Role(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientIds.map((clientId) => (
                    <TableRow key={clientId}>
                      <TableCell className="font-medium text-sm">
                        {clientNameMap[clientId] || clientId.slice(0, 10) + "..."}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {clientRoles[clientId].map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {clientIds.length === 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground text-center">No clients assigned</p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {member.fields.Notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.fields.Notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
