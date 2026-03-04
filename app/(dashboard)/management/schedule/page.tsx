"use client"

import { useState } from "react"
import { TeamSchedule } from "@/components/team/team-schedule"
import { TaskModal } from "@/components/team/task-modal"
import { ManagementTaskModal, SubmitStrategyModal, PTAModal } from "@/components/team/specialized-task-modals"
import type { ScheduleTask } from "@/components/team-member/upcoming-tasks-table"

function taskName(t: ScheduleTask) {
  return t.teamFacingName || t.title || ""
}

export default function ManagementSchedulePage() {
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null)

  const isManagement = selectedTask?.department === "Management"
  const isSubmitStrategy = !!selectedTask && taskName(selectedTask) === "Submit Strategy"
  const isPTA = !!selectedTask && selectedTask.department === "Strategy" &&
    taskName(selectedTask).includes("Post-Test Analysis")

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Schedule</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          View and manage team tasks across different views.
        </p>
      </div>

      <TeamSchedule onTaskClick={setSelectedTask} />

      {selectedTask && (
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
      )}
    </div>
  )
}
