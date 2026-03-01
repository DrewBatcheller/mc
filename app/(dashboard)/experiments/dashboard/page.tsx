"use client"

import { useState } from "react"
import { ExperimentStatCards } from "@/components/experiments/experiment-stat-cards"
import { UpcomingBatches } from "@/components/experiments/upcoming-batches"
import { RecentlyEndedTests } from "@/components/experiments/recently-ended-tests"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"

export default function ExperimentsDashboardPage() {
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null)

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Experiments Dashboard
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Real-time view of all experiments and their performance metrics
        </p>
      </div>

      <ExperimentStatCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingBatches onExperimentClick={setSelectedExperiment} />
        <RecentlyEndedTests onExperimentClick={setSelectedExperiment} />
      </div>

      {selectedExperiment && (
        <ExperimentDetailsModal
          isOpen={!!selectedExperiment}
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
        />
      )}
    </>
  )
}
