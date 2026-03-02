"use client"

import { ClientIdeasTable } from "@/components/clients/client-ideas-table"

export default function ClientTestIdeasPage() {
  const clientName = "Test Ideas"

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          {clientName}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5 max-w-4xl">
          The experimentation backlog. Review hypotheses and strategic rationales for proposed tests. Each idea includes placement details, primary conversion goals, and traffic weighting to help prioritize which experiments to launch next.
        </p>
      </div>

      <ClientIdeasTable />
    </>
  )
}
