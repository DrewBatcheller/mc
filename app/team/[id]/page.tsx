"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, Phone, Users, CheckCircle, Clock, Target, Calendar, Briefcase } from "lucide-react"
import Image from "next/image"
import { getTeamMembers } from "@/lib/team-data"
import { getClientsData } from "@/lib/clients-data"
import { getDevelopmentTasksData, getTasksByTeamMember } from "@/lib/development-data"
import { getDevelopmentHoursData, getTotalHoursForTeamMember } from "@/lib/development-hours-data"
import { OverdueTasksSummary } from "@/components/dashboard/overdue-tasks-summary"
import { StandardMetricCard } from "@/components/v2/standard-metric-card"
import { useMemo, useState, useEffect } from "react"

const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.528 2.528 0 0 1 2.522-2.523h2.52v2.523zM6.313 15.165a2.528 2.528 0 0 1 2.521-2.523 2.528 2.528 0 0 1 2.521 2.523v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.528 2.528 0 0 1-2.52-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
)

// Mock user permissions - in a real app, this would come from your auth context
const mockUserPermissions = {
  teamAccess: {
    view: true,
    manage: true,
    viewSalaries: true,
    edit: true,
  },
}

export default function TeamMemberPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const [tasks, setTasks] = useState<any[]>([])
  const [hours, setHours] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const teamMembers = useMemo(() => getTeamMembers(), [])
  const clients = useMemo(() => getClientsData(), [])

  const member = useMemo(() => teamMembers.find((m) => m.id === memberId), [teamMembers, memberId])

  useEffect(() => {
    const loadedTasks = getDevelopmentTasksData()
    const loadedHours = getDevelopmentHoursData()
    setTasks(loadedTasks)
    setHours(loadedHours)
    setIsLoading(false)
  }, [])

  const assignedClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.assignedDeveloper === memberId ||
          client.assignedDesigner === memberId ||
          client.assignedStrategist === memberId ||
          client.assignedQA === memberId,
      ),
    [clients, memberId],
  )

  const activeClients = useMemo(() => assignedClients.filter((client) => client.status === "Active"), [assignedClients])

  const developmentStats = useMemo(() => {
    if (isLoading) return { activeTasks: 0, completedTasks: 0, totalHours: 0 }

    const memberTasks = getTasksByTeamMember(memberId)
    const activeTasks = memberTasks.filter((task) => task.status === "developmentProject").length
    const completedTasks = memberTasks.filter((task) => task.status === "completedProject").length
    const totalHours = getTotalHoursForTeamMember(memberId)

    return { activeTasks, completedTasks, totalHours }
  }, [memberId, tasks, hours, isLoading])

  const assignedClientIds = useMemo(() => assignedClients.map((client) => client.id), [assignedClients])

  if (!member) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => router.back()} className="mr-2 cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold">Team Member Not Found</h1>
          </div>
          <p>The requested team member could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.back()} className="mr-2 cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold">Team Member Profile</h1>
            </div>
            {mockUserPermissions.teamAccess.edit && (
              <Button variant="outline" asChild className="cursor-pointer bg-transparent">
                <Link href={`/team/${member.id}/edit`}>Edit Profile</Link>
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 relative rounded-full overflow-hidden">
                      <Image
                        src={member.avatar || "/placeholder.svg"}
                        alt={member.name}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-2xl font-bold">{member.name}</h2>
                    <p className="text-lg text-muted-foreground mb-2">{member.role}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                        {member.department}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="h-4 w-4 mr-2" />
                          <a href={`mailto:${member.email}`} className="hover:underline cursor-pointer">
                            {member.email}
                          </a>
                        </div>
                        {member.phone && (
                          <div className="flex items-center text-muted-foreground">
                            <Phone className="h-4 w-4 mr-2" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center text-muted-foreground">
                          <SlackIcon className="h-4 w-4 mr-2" />
                          <span>{member.slackMemberId}</span>
                        </div>
                        {member.calendlyUrl && (
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            <a
                              href={member.calendlyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline cursor-pointer"
                            >
                              Schedule Meeting
                            </a>
                          </div>
                        )}
                        <div className="flex items-center text-muted-foreground">
                          <Briefcase className="h-4 w-4 mr-2" />
                          <span>Current Workload: {member.currentWorkload} tests</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Employee ID</span>
                          <span className="font-medium">EMP-{member.id.padStart(3, "0")}</span>
                        </div>
                        {member.bio && (
                          <div>
                            <span className="text-muted-foreground">Bio</span>
                            <p className="text-sm mt-1">{member.bio}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-3">
                <StandardMetricCard label="Active Clients" value={activeClients.length} />
                <StandardMetricCard label="Active Tasks" value={developmentStats.activeTasks} />
                <StandardMetricCard label="Completed Tasks" value={developmentStats.completedTasks} color="emerald" />
                <StandardMetricCard label="Total Hours" value={`${developmentStats.totalHours.toFixed(1)}h`} />
              </div>

              <OverdueTasksSummary clientIds={assignedClientIds} maxItems={5} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assigned Clients ({assignedClients.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {assignedClients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedClients.map((client) => {
                      const role =
                        client.assignedDeveloper === memberId
                          ? "Developer"
                          : client.assignedDesigner === memberId
                            ? "Designer"
                            : client.assignedStrategist === memberId
                              ? "Strategist"
                              : "QA"

                      return (
                        <div key={client.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{client.brand}</h4>
                            <Badge variant={client.status === "Active" ? "default" : "secondary"} className="text-xs">
                              {client.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{client.name}</p>
                          <div className="flex items-center justify-between text-sm">
                            <Badge variant="outline" className="text-xs">
                              {role}
                            </Badge>
                            <span className="font-medium">${(client.monthlyPrice || 0).toLocaleString()}/mo</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="flex-1 cursor-pointer bg-transparent"
                            >
                              <Link href={`/clients/${client.id}`}>View Client</Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No clients assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
