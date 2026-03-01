import { ClientExperimentsOverview } from '@/components/clients/client-experiments-overview'

export default function ClientExperimentsOverviewPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Experiments Overview
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          A complete history of your experiment batches and individual test results.
        </p>
      </div>

      <ClientExperimentsOverview />
    </>
  )
}
