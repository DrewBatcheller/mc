import { IdeasTable } from "@/components/experiments/ideas-table"

export default function IdeasPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Test Ideas
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage and track your experiment ideas
        </p>
      </div>

      <IdeasTable />
    </>
  )
}

