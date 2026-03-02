"use client"

import { useState } from "react"
import { UpcomingTasksTable } from "@/components/team-member/upcoming-tasks-table"
import { InProgressTasksTable } from "@/components/team-member/in-progress-tasks-table"
import { TeamSchedule } from "@/components/team/team-schedule"
import { TaskSubmissionModal } from "@/components/team/task-submission-modal"
import { ManagementTaskModal, LaunchTestsModal, SubmitStrategyModal } from "@/components/team/specialized-task-modals"
import { useUser } from "@/contexts/UserContext"

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

export default function TeamDashboardPage() {
  const { user } = useUser()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Team members only see their own tasks - no filters
  const userFilter = user?.name || "Unknown"

  return (
    <>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            My Tasks
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Track your upcoming and in-progress work
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingTasksTable
          onTaskClick={setSelectedTask}
          memberFilter={userFilter}
          deptFilter="All Departments"
          statusFilter="All Status"
        />
        <InProgressTasksTable
          onTaskClick={setSelectedTask}
          memberFilter={userFilter}
          deptFilter="All Departments"
          statusFilter="All Status"
        />
      </div>

      <TeamSchedule
        memberFilter={userFilter}
        deptFilter="All Departments"
        statusFilter="All Status"
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
