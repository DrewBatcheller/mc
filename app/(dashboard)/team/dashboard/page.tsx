"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { UpcomingTasksTable } from "@/components/team-member/upcoming-tasks-table"
import { InProgressTasksTable } from "@/components/team-member/in-progress-tasks-table"
import { TeamSchedule } from "@/components/team/team-schedule"
import { TaskSubmissionModal } from "@/components/team/task-submission-modal"
import { ManagementTaskModal, LaunchTestsModal, SubmitStrategyModal } from "@/components/team/specialized-task-modals"

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

export default function TeamMemberDashboardPage() {
  const [selectedMember, setSelectedMember] = useState("All Members")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Team Member Dashboard
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Focus on your assigned tasks and upcoming deadlines
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:bg-muted/50 transition-colors"
          >
            <span className="text-muted-foreground text-[13px]">Team Member:</span>
            <span className="text-[13px] font-medium text-foreground">{selectedMember}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
              {TEAM_MEMBERS.map((member) => (
                <button
                  key={member}
                  onClick={() => {
                    setSelectedMember(member)
                    setDropdownOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-muted/50 transition-colors"
                >
                  {member}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingTasksTable onTaskClick={setSelectedTask} />
        <InProgressTasksTable onTaskClick={setSelectedTask} />
      </div>

      <TeamSchedule />

      {/* Task Modals */}
      {selectedTask && (
        <>
          {/* Management tasks show details only */}
          {selectedTask.department === "Management" && (
            <ManagementTaskModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
          
          {/* Tests Running launches tests with confirmation */}
          {selectedTask.title === "Tests Running" && (
            <LaunchTestsModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
          
          {/* Submit Strategy adds test ideas and notifies client */}
          {selectedTask.title === "Submit Strategy" && (
            <SubmitStrategyModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
          
          {/* Other task types with experiments use standard submission modal */}
          {selectedTask.experiments && 
           selectedTask.department !== "Management" && 
           selectedTask.title !== "Tests Running" &&
           selectedTask.title !== "Submit Strategy" && (
            <TaskSubmissionModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
            />
          )}
        </>
      )}
    </>
  )
}
