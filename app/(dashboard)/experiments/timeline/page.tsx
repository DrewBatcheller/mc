import { ExperimentsTimeline } from "@/components/experiments/experiments-timeline"

export default function TimelinePage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Timeline
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Visual production lifecycle. Track batches across clients, hover for details, and click any batch to explore its experiments.
        </p>
      </div>

      <ExperimentsTimeline />
    </>
  )
}
