"use client"

import { useState } from "react"
import { UpcomingTasksTable } from "@/components/team-member/upcoming-tasks-table"
import { InProgressTasksTable } from "@/components/team-member/in-progress-tasks-table"
import { TeamSchedule } from "@/components/team/team-schedule"
import { TaskSubmissionModal } from "@/components/team/task-submission-modal"
import { ManagementTaskModal, LaunchTestsModal, SubmitStrategyModal } from "@/components/team/specialized-task-modals"
import { SelectField } from "@/components/shared/select-field"

interface Task {
  title: string
  client: string
  department: string
  dueDate: string
  status: "Pending" | "Overdue" | "Complete"
  assigned: string
  batchId?: string
  experiments?: { id: string; name: string; figmaUrl?: string; convertId?: string; qaApproved?: boolean; qaReportUrl?: string }[]
}

const TEAM_MEMBERS = ["All Members", "Alex M.", "Jordan T.", "Sam R.", "Casey P."]
const DEPARTMENTS = ["All Departments", "Management", "Strategy", "Design", "Development", "QA"]
const STATUSES = ["All Status", "Pending", "Overdue", "Complete"]

export default function ManagementTeamDashboardPage() {
  const [memberFilter, setMemberFilter] = useState("All Members")
  const [deptFilter, setDeptFilter] = useState("All Departments")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

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
          <SelectField value={memberFilter} onChange={setMemberFilter} options={TEAM_MEMBERS} />
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
      />

      {selectedTask && (
        <>
          {selectedTask.department === "Management" && (
            <ManagementTaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
          )}
          {selectedTask.title === "Tests Running" && (
            <LaunchTestsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
          )}
          {selectedTask.title === "Submit Strategy" && (
            <SubmitStrategyModal task={selectedTask} onClose={() => setSelectedTask(null)} />
          )}
          {selectedTask.experiments &&
            selectedTask.department !== "Management" &&
            selectedTask.title !== "Tests Running" &&
            selectedTask.title !== "Submit Strategy" && (
              <TaskSubmissionModal task={selectedTask} onClose={() => setSelectedTask(null)} />
            )}
        </>
      )}
    </>
  )
}
