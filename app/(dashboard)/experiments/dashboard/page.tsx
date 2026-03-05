"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ChevronDown, Users } from "lucide-react"
import { useAirtable } from "@/hooks/use-airtable"
import { ExperimentStatCards } from "@/components/experiments/experiment-stat-cards"
import { UpcomingBatches } from "@/components/experiments/upcoming-batches"
import { RecentlyEndedTests } from "@/components/experiments/recently-ended-tests"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"
import { BatchDetailsModal } from "@/components/experiments/batch-details-modal"
import { cn } from "@/lib/utils"
import type { AirtableRecord } from "@/lib/types"

interface ClientOption {
  id: string
  name: string
  status: string
}

function ClientFilter({
  clients,
  selectedId,
  onSelect,
}: {
  clients: ClientOption[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selected = clients.find(c => c.id === selectedId)
  const label = selected ? selected.name : "All Clients"

  // Active clients first, then inactive — each group sorted alphabetically
  const sorted = useMemo(() => [
    ...clients.filter(c => c.status === "Active").sort((a, b) => a.name.localeCompare(b.name)),
    ...clients.filter(c => c.status !== "Active").sort((a, b) => a.name.localeCompare(b.name)),
  ], [clients])

  const hasActive   = sorted.some(c => c.status === "Active")
  const hasInactive = sorted.some(c => c.status !== "Active")

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-[13px] hover:bg-accent/40 transition-colors"
      >
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn("font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
          {/* All Clients option */}
          <button
            onClick={() => { onSelect(null); setOpen(false) }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-accent/40 transition-colors text-left border-b border-border",
              !selectedId && "bg-accent font-medium text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>All Clients</span>
          </button>

          <div className="max-h-60 overflow-y-auto">
            {/* Active clients */}
            {hasActive && (
              <>
                {sorted.filter(c => c.status === "Active").map(c => (
                  <button
                    key={c.id}
                    onClick={() => { onSelect(c.id); setOpen(false) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-accent/40 transition-colors text-left",
                      c.id === selectedId && "bg-accent font-medium text-foreground"
                    )}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] text-emerald-600 font-medium ml-2 shrink-0">Active</span>
                  </button>
                ))}
              </>
            )}

            {/* Divider between active and inactive */}
            {hasActive && hasInactive && (
              <div className="px-3 py-1 text-[11px] text-muted-foreground/60 uppercase tracking-wide border-t border-border bg-muted/30">
                Inactive
              </div>
            )}

            {/* Inactive clients */}
            {sorted.filter(c => c.status !== "Active").map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); setOpen(false) }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-accent/40 transition-colors text-left",
                  c.id === selectedId && "bg-accent font-medium text-foreground"
                )}
              >
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExperimentsDashboardPage() {
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null)
  const [selectedBatch, setSelectedBatch] = useState<AirtableRecord | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const { data: clientRecords } = useAirtable("clients", {
    fields: ["Brand Name", "Client Status"],
    sort: [{ field: "Brand Name", direction: "asc" }],
  })

  const clients: ClientOption[] = useMemo(
    () => (clientRecords ?? []).map(r => ({
      id: r.id,
      name: String(r.fields["Brand Name"] ?? ""),
      status: String(r.fields["Client Status"] ?? ""),
    })),
    [clientRecords]
  )

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {selectedClient ? `${selectedClient.name} — Experiments` : "Experiments Dashboard"}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {selectedClient
              ? "Filtered to this client's experiments and batches."
              : "Real-time view of all experiments and their performance metrics"}
          </p>
        </div>
        <ClientFilter
          clients={clients}
          selectedId={selectedClientId}
          onSelect={setSelectedClientId}
        />
      </div>

      <ExperimentStatCards clientId={selectedClientId ?? undefined} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingBatches onBatchClick={setSelectedBatch} clientId={selectedClientId ?? undefined} />
        <RecentlyEndedTests onExperimentClick={setSelectedExperiment} clientId={selectedClientId ?? undefined} />
      </div>

      {selectedBatch && (
        <BatchDetailsModal
          isOpen={!!selectedBatch}
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {selectedExperiment && (
        <ExperimentDetailsModal
          isOpen={!!selectedExperiment}
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
        />
      )}
    </>
  )
}
