"use client"

import { useState } from "react"
import { UpcomingTasksTable } from "@/components/team-member/upcoming-tasks-table"
import { InProgressTasksTable } from "@/components/team-member/in-progress-tasks-table"
import { TeamSchedule } from "@/components/team/team-schedule"
import { TaskModal } from "@/components/team/task-modal"
import { ManagementTaskModal, SubmitStrategyModal, PTAModal } from "@/components/team/specialized-task-modals"
import { useUser } from "@/contexts/UserContext"
import type { ScheduleTask } from "@/components/team-member/upcoming-tasks-table"

function taskName(t: ScheduleTask) {
  return t.teamFacingName || t.title || ""
}

export default function TeamDashboardPage() {
  const { user } = useUser()
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null)

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
        badgeMode="status"
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
