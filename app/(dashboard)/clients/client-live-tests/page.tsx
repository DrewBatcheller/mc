import { ClientLiveTests } from '@/components/clients/client-live-tests'

export default function ClientLiveTestsPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Live Tests
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Monitor currently running experiments with real-time variant performance data.
        </p>
      </div>

      <ClientLiveTests />
    </>
  )
}
