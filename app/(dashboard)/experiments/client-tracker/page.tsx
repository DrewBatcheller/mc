import { ClientTracker } from "@/components/experiments/client-tracker"

export default function ClientTrackerPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Client Tracker
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Monitor experiment performance across all clients and variants in real-time.
        </p>
      </div>

      <ClientTracker />
    </>
  )
}
