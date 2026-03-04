"use client"

import { useState, useMemo } from "react"
import { UpcomingTasksTable } from "@/components/team-member/upcoming-tasks-table"
import { InProgressTasksTable } from "@/components/team-member/in-progress-tasks-table"
import { TeamSchedule } from "@/components/team/team-schedule"
import { TaskModal } from "@/components/team/task-modal"
import { ManagementTaskModal, SubmitStrategyModal, PTAModal } from "@/components/team/specialized-task-modals"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"
import type { ScheduleTask } from "@/components/team-member/upcoming-tasks-table"

function taskName(t: ScheduleTask) {
  return t.teamFacingName || t.title || ""
}

const DEPARTMENTS = ["All Departments", "Management", "Strategy", "Design", "Development", "QA"]
const STATUSES = ["All Status", "Pending", "In Progress", "Overdue", "Complete"]

export default function ManagementTeamDashboardPage() {
  const [memberFilter, setMemberFilter] = useState("All Members")
  const [deptFilter, setDeptFilter] = useState("All Departments")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null)

  /* Fetch live team members for the member filter dropdown */
  const { data: rawTeam } = useAirtable<Record<string, unknown>>('team', {
    sort: [{ field: 'Full Name', direction: 'asc' }],
  })

  const teamMemberOptions = useMemo(() => {
    const names = (rawTeam ?? [])
      .filter(r => (r.fields['Employment Status'] as string) === 'Active')
      .map(r => (r.fields['Full Name'] as string) ?? '')
      .filter(Boolean)
    return ['All Members', ...names]
  }, [rawTeam])

  return (
    <>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Team Member Dashboard
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Monitor and manage team tasks across all members
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectField value={memberFilter} onChange={setMemberFilter} options={teamMemberOptions} />
          <SelectField value={deptFilter} onChange={setDeptFilter} options={DEPARTMENTS} />
          <SelectField value={statusFilter} onChange={setStatusFilter} options={STATUSES} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingTasksTable
          onTaskClick={setSelectedTask}
          memberFilter={memberFilter}
          deptFilter={deptFilter}
          statusFilter={statusFilter}
        />
        <InProgressTasksTable
          onTaskClick={setSelectedTask}
          memberFilter={memberFilter}
          deptFilter={deptFilter}
          statusFilter={statusFilter}
        />
      </div>

      <TeamSchedule
        memberFilter={memberFilter}
        deptFilter={deptFilter}
        statusFilter={statusFilter}
        onTaskClick={setSelectedTask}
      />

      {selectedTask && (() => {
        const isManagement = selectedTask.department === "Management"
        const isSubmitStrategy = taskName(selectedTask) === "Submit Strategy"
        const isPTA = selectedTask.department === "Strategy" &&
          taskName(selectedTask).includes("Post-Test Analysis")
        return (
          <>
            {isManagement && (
              <ManagementTaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
            )}
            {!isManagement && isSubmitStrategy && (
              <SubmitStrategyModal task={selectedTask} onClose={() => setSelectedTask(null)} />
            )}
            {!isManagement && !isSubmitStrategy && isPTA && (
              <PTAModal task={selectedTask} onClose={() => setSelectedTask(null)} />
            )}
            {!isManagement && !isSubmitStrategy && !isPTA && (
              <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
            )}
          </>
        )
      })()}
    </>
  )
}
