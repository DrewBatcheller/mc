"use client"

import { useState } from "react"
import { useUser } from "@/contexts/UserContext"
import { ClientIdeasTable } from "@/components/clients/client-ideas-table"

export default function ClientTestIdeasPage() {
  const { user } = useUser()
  const [expanded, setExpanded] = useState(false)
  const clientName = user?.name || "Client"

  const description =
    "The experimentation backlog. Review hypotheses and strategic rationales for proposed tests. Each idea includes placement details, primary conversion goals, and traffic weighting to help prioritize which experiments to launch next."

  return (
    <>
      <div>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-2">
          <span className="hover:text-foreground transition-colors cursor-pointer">{clientName}</span>
          <span>/</span>
          <span className="text-foreground font-medium">Test Ideas</span>
        </div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Test Ideas
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5 max-w-4xl">
          {expanded ? description : `${description.slice(0, 80)}...`}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-foreground font-medium ml-1 hover:underline"
          >
            {expanded ? "Less" : "More"}
          </button>
        </p>
      </div>

      <ClientIdeasTable />
    </>
  )
}
