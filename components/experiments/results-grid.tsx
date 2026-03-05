"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { ExperimentDetailsModal } from "./experiment-details-modal"
import { useAirtable } from "@/hooks/use-airtable"

type Status = "Successful" | "Unsuccessful" | "Inconclusive"

interface Result {
  id: string
  name: string
  client: string
  status: Status
  revenueAdded: number
  placement: string
  placementUrl?: string
  device: string
  geos: string
  launchDate: string
  endDate: string
  rationale: string
  goals: string[]
  deployed: boolean
  hypothesis?: string
  whatHappened?: string
  nextSteps?: string
  controlImage?: string
  variantImage?: string
  resultImage?: string
  resultVideo?: string
  thumbnailUrl?: string
}

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; bg: string; border: string; dot: string }> = {
  Successful:   { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500" },
  Unsuccessful: { icon: XCircle,      color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200",    dot: "bg-rose-500"    },
  Inconclusive: { icon: HelpCircle,   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500"   },
}

const goalColors: Record<string, string> = {
  CVR: "bg-sky-100 text-sky-700 border-sky-200",
  ATC: "bg-violet-100 text-violet-700 border-violet-200",
  RPV: "bg-teal-100 text-teal-700 border-teal-200",
  AOV: "bg-amber-100 text-amber-700 border-amber-200",
}

const allStatuses: ("All" | Status)[] = ["All", "Successful", "Unsuccessful", "Inconclusive"]

function formatRevenue(n: number) {
  if (n === 0) return "$0.0K"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

// Airtable attachment fields return an array of objects; extract the best URL
function getAttachmentUrl(field: unknown): string | undefined {
  if (!field || !Array.isArray(field) || field.length === 0) return undefined
  const att = field[0] as Record<string, unknown>
  const thumbs = att.thumbnails as Record<string, { url: string }> | undefined
  return (thumbs?.large?.url ?? att.url) as string | undefined
}

// Map our Result to the shape ExperimentDetailsModal expects
function toModalExperiment(r: Result) {
  return {
    name:            r.name,
    description:     r.rationale,
    status:          r.status,
    placement:       r.placement,
    placementUrl:    r.placementUrl,
    devices:         r.device,
    geos:            r.geos,
    variants:        "2",
    revenue:         formatRevenue(r.revenueAdded),
    primaryGoals:    r.goals,
    hypothesis:      r.hypothesis,
    rationale:       r.rationale,
    revenueAddedMrr: r.revenueAdded ? String(r.revenueAdded) : undefined,
    deployed:        r.deployed,
    launchDate:      r.launchDate,
    endDate:         r.endDate,
    whatHappened:    r.whatHappened,
    nextSteps:       r.nextSteps,
    controlImage:    r.controlImage,
    variantImage:    r.variantImage,
    resultImage:     r.resultImage,
    resultVideo:     r.resultVideo,
  }
}

/* ============================================================
   Main Grid
   ============================================================ */
export function ResultsGrid({
  initialClientName,
  hideClientFilter,
}: {
  initialClientName?: string
  hideClientFilter?: boolean
} = {}) {
  const [view, setView]                   = useState<"grid" | "list">("grid")
  const [statusFilter, setStatusFilter]   = useState<"All" | Status>("All")
  const [clientFilter, setClientFilter]   = useState(initialClientName ?? "All Clients")
  const [search, setSearch]               = useState("")
  const [selectedResult, setSelectedResult] = useState<Result | null>(null)

  // Sync client filter when parent navigates between clients
  useEffect(() => {
    setClientFilter(initialClientName ?? "All Clients")
  }, [initialClientName])

  const handleClose = useCallback(() => setSelectedResult(null), [])

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const { data: rawExperiments, isLoading } = useAirtable("experiments", {
    filterExtra: 'OR({Test Status} = "Successful", {Test Status} = "Unsuccessful", {Test Status} = "Inconclusive")',
    fields: [
      "Test Description",
      "Test Status",
      "Brand Name (from Brand Name)",
      "Revenue Added (MRR) (Regular Format)",
      "Placement",
      "Placement URL",
      "Devices",
      "GEOs",
      "Launch Date",
      "End Date",
      "Rationale",
      "Category Primary Goals",
      "Deployed",
      "Hypothesis",
      "Describe what happened & what we learned",
      "Next Steps (Action)",
      "Control Image",
      "Variant Image",
      "PTA Result Image",
      "Post-Test Analysis (Loom)",
    ],
    sort: [{ field: "End Date", direction: "desc" }],
    revalidateOnFocus: false,
  })

  // ── Mapper ───────────────────────────────────────────────────────────────────
  const results = useMemo((): Result[] => {
    if (!rawExperiments) return []
    return rawExperiments
      .map((record) => {
        const f = record.fields
        const rawStatus = f["Test Status"] as string
        if (!["Successful", "Unsuccessful", "Inconclusive"].includes(rawStatus)) return null

        const rev = f["Revenue Added (MRR) (Regular Format)"]
        const revenueAdded =
          typeof rev === "number"
            ? rev
            : parseFloat(String(rev ?? "0").replace(/[$,]/g, "")) || 0

        const brandArr = f["Brand Name (from Brand Name)"]
        const client = Array.isArray(brandArr) ? String(brandArr[0] ?? "") : String(brandArr ?? "")

        return {
          id:           record.id,
          name:         (f["Test Description"] as string) || "Unnamed",
          client,
          status:       rawStatus as Status,
          revenueAdded,
          placement:    (f["Placement"] as string) || "",
          placementUrl: (f["Placement URL"] as string) || undefined,
          device: Array.isArray(f["Devices"])
            ? (f["Devices"] as string[]).join(", ")
            : (f["Devices"] as string) || "",
          geos: Array.isArray(f["GEOs"])
            ? (f["GEOs"] as string[]).join(", ")
            : (f["GEOs"] as string) || "",
          launchDate:   (f["Launch Date"] as string) || "",
          endDate:      (f["End Date"] as string) || "",
          rationale:    (f["Rationale"] as string) || "",
          goals: Array.isArray(f["Category Primary Goals"])
            ? (f["Category Primary Goals"] as string[])
            : [],
          deployed:     Boolean(f["Deployed"]),
          hypothesis:   (f["Hypothesis"] as string) || undefined,
          whatHappened: (f["Describe what happened & what we learned"] as string) || undefined,
          nextSteps:    (f["Next Steps (Action)"] as string) || undefined,
          controlImage: getAttachmentUrl(f["Control Image"]),
          variantImage: getAttachmentUrl(f["Variant Image"]),
          resultImage:  getAttachmentUrl(f["PTA Result Image"]),
          resultVideo:  (f["Post-Test Analysis (Loom)"] as string) || undefined,
          thumbnailUrl:
            getAttachmentUrl(f["PTA Result Image"]) ??
            getAttachmentUrl(f["Control Image"]),
        } satisfies Result
      })
      .filter((r): r is Result => r !== null)
  }, [rawExperiments])

  // ── Client list (admin only) ──────────────────────────────────────────────────
  const clients = useMemo(
    () => ["All Clients", ...Array.from(new Set(results.map((r) => r.client).filter(Boolean)))],
    [results]
  )

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => results.filter((r) => {
    if (statusFilter !== "All" && r.status !== statusFilter) return false
    if (clientFilter !== "All Clients" && r.client !== clientFilter) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.client.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [results, statusFilter, clientFilter, search])

  // ── Summary counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    total:        filtered.length,
    successful:   filtered.filter((r) => r.status === "Successful").length,
    unsuccessful: filtered.filter((r) => r.status === "Unsuccessful").length,
    inconclusive: filtered.filter((r) => r.status === "Inconclusive").length,
    totalRevenue: filtered.reduce((sum, r) => sum + r.revenueAdded, 0),
  }), [filtered])

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-[13px] text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Summary strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{counts.total}</span> results
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-foreground">{counts.successful}</span> wins
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="font-medium text-foreground">{counts.unsuccessful}</span> losses
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-medium text-foreground">{counts.inconclusive}</span> inconclusive
          </span>
          <span className="text-muted-foreground sm:ml-auto">
            Revenue added:{" "}
            <span className="font-semibold text-emerald-600">{formatRevenue(counts.totalRevenue)}</span>
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <SelectField
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={allStatuses}
          />
          {!hideClientFilter && (
            <SelectField value={clientFilter} onChange={setClientFilter} options={clients} />
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search results..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "h-9 w-9 flex items-center justify-center transition-colors",
                view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "h-9 w-9 flex items-center justify-center transition-colors border-l border-border",
                view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-[13px] text-muted-foreground">No results match your filters.</p>
          </div>
        )}

        {/* Grid view */}
        {view === "grid" && filtered.length > 0 && (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {filtered.map((r) => {
              const cfg = statusConfig[r.status]
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedResult(r)}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-all group text-left"
                >
                  {/* Thumbnail — real image from Airtable, empty panel if none */}
                  <div className="h-36 bg-accent/20 overflow-hidden">
                    {r.thumbnailUrl ? (
                      <img
                        src={r.thumbnailUrl}
                        alt={r.name}
                        className="h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", cfg.bg, cfg.color, cfg.border)}>
                        {r.status}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{r.name}</h3>
                      {r.client && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.client}</p>
                      )}
                    </div>
                    {r.goals.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {r.goals.map((g) => (
                          <span
                            key={g}
                            className={cn("text-[10px] font-semibold px-1.5 py-px rounded border", goalColors[g] || "bg-accent text-foreground border-border")}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">Revenue Added</span>
                        <span className={cn("text-[14px] font-semibold tabular-nums", r.revenueAdded > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {formatRevenue(r.revenueAdded)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground">Placement</span>
                        <span className="text-[12px] font-medium text-foreground">{r.placement}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* List view */}
        {view === "list" && filtered.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Experiment",
                      ...(!hideClientFilter ? ["Client"] : []),
                      "Status", "Goals", "Placement", "Device", "Revenue Added", "Duration"
                    ].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-left",
                          h === "Revenue Added" && "text-right"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const cfg = statusConfig[r.status]
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedResult(r)}
                        className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground max-w-[300px]">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-14 rounded-md border border-border overflow-hidden bg-accent/30 shrink-0">
                              {r.thumbnailUrl && (
                                <img
                                  src={r.thumbnailUrl}
                                  alt={r.name}
                                  className="h-full w-full object-cover object-top"
                                />
                              )}
                            </div>
                            <span className="line-clamp-1">{r.name}</span>
                          </div>
                        </td>
                        {!hideClientFilter && (
                          <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">{r.client}</td>
                        )}
                        <td className="px-4 py-3.5">
                          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border inline-block", cfg.bg, cfg.color, cfg.border)}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1">
                            {r.goals.map((g) => (
                              <span
                                key={g}
                                className={cn("text-[10px] font-semibold px-1.5 py-px rounded border", goalColors[g] || "bg-accent text-foreground border-border")}
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">{r.placement}</td>
                        <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">{r.device}</td>
                        <td className={cn("px-4 py-3.5 text-[13px] font-medium tabular-nums text-right whitespace-nowrap", r.revenueAdded > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {formatRevenue(r.revenueAdded)}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap tabular-nums">
                          {r.launchDate} – {r.endDate}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedResult && (
        <ExperimentDetailsModal
          isOpen={!!selectedResult}
          experiment={toModalExperiment(selectedResult)}
          onClose={handleClose}
        />
      )}
    </>
  )
}
