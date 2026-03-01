import { ClientResultsGrid } from '@/components/clients/client-results-grid'

export default function ClientResultsPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Experiment Results
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Browse completed experiments with their outcomes, revenue impact, and detailed breakdowns.
        </p>
      </div>

      <ClientResultsGrid />
    </>
  )
}
