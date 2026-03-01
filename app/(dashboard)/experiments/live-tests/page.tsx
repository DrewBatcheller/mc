import { LiveTests } from "@/components/experiments/live-tests"

export default function LiveTestsPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Live Tests
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Monitor currently running experiments and their variant performance
        </p>
      </div>

      <LiveTests />
    </>
  )
}
