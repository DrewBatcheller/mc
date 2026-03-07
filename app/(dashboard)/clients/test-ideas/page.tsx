import { ClientIdeasTable } from "@/components/clients/client-ideas-table"

export default function ClientTestIdeasPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Test Ideas</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          The experimentation backlog. Review hypotheses and strategic rationales for proposed tests. Each idea includes placement details, primary conversion goals, and traffic weighting to help prioritize which experiments to launch next.
        </p>
      </div>

      <ClientIdeasTable />
    </>
  )
}
