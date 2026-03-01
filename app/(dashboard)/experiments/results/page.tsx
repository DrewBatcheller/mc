import { ResultsGrid } from "@/components/experiments/results-grid"

export default function ResultsPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Experiment Results
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Browse completed experiments and their outcomes
        </p>
      </div>

      <ResultsGrid />
    </>
  )
}
