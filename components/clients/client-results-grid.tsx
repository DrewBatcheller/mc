"use client"

import { useState, useMemo, useCallback } from "react"
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
import { ExperimentDetailsModal } from "../experiments/experiment-details-modal"

const RESULT_IMG = "https://i.imgur.com/u50b3Yy.png"

type Status = "Successful" | "Unsuccessful" | "Inconclusive"

interface Result {
  name: string
  status: Status
  revenueAdded: number
  placement: string
  device: string
  geos: string
  launchDate: string
  endDate: string
  rationale: string
  goals: string[]
  deployed: boolean
  controlLabel: string
  variantLabel: string
}

const results: Result[] = [
  { name: "Free Shipping Topbar", status: "Successful", revenueAdded: 22000, placement: "Site-wide Header", device: "All Devices", geos: "US, CA", launchDate: "Feb 2, 2024", endDate: "Feb 16, 2024", rationale: "A topbar promoting free shipping thresholds incentivizes larger purchases, aiming to boost average order value.", goals: ["CVR"], deployed: true, controlLabel: "Original Page", variantLabel: "Variant Page" },
  { name: "Update Mobile Menu Navigation", status: "Successful", revenueAdded: 0, placement: "Mobile Menu", device: "Mobile", geos: "US", launchDate: "Jan 20, 2024", endDate: "Feb 5, 2024", rationale: "Restructuring the mobile menu to aid navigation with grouped categories and visual icons.", goals: ["CVR", "RPV"], deployed: false, controlLabel: "Original Menu", variantLabel: "Redesigned Menu" },
  { name: "Slim Down PDP", status: "Unsuccessful", revenueAdded: 0, placement: "Product Page", device: "All Devices", geos: "US, CA, AU", launchDate: "Jan 15, 2024", endDate: "Feb 1, 2024", rationale: "Reducing clutter on the PDP to create a cleaner, more focused purchase experience.", goals: ["CVR", "ATC"], deployed: false, controlLabel: "Current PDP", variantLabel: "Minimal PDP" },
  { name: "Increase PDP Legibility Shorts", status: "Successful", revenueAdded: 5900, placement: "Product Page", device: "All Devices", geos: "US, CA", launchDate: "Jan 8, 2024", endDate: "Jan 25, 2024", rationale: "Improving typography and spacing on the PDP to increase readability and conversion.", goals: ["CVR", "ATC", "RPV"], deployed: true, controlLabel: "Current Layout", variantLabel: "Improved Layout" },
  { name: "Cart Redesign: UVPs", status: "Successful", revenueAdded: 11400, placement: "Cart Page", device: "All Devices", geos: "US", launchDate: "Dec 28, 2023", endDate: "Jan 15, 2024", rationale: "Adding unique value propositions to the cart page to reinforce purchase confidence.", goals: ["CVR", "AOV"], deployed: true, controlLabel: "Original Cart", variantLabel: "UVP Cart" },
  { name: "Separate CTA on Homepage", status: "Successful", revenueAdded: 29200, placement: "Homepage", device: "All Devices", geos: "US, CA, GB, AU", launchDate: "Dec 15, 2023", endDate: "Jan 10, 2024", rationale: "Separating primary and secondary CTAs on the homepage to improve click-through clarity.", goals: ["CVR", "RPV"], deployed: true, controlLabel: "Combined CTAs", variantLabel: "Separated CTAs" },
  { name: "Instagram Story-Style Highlights", status: "Unsuccessful", revenueAdded: 0, placement: "Homepage", device: "All Devices", geos: "US", launchDate: "Dec 5, 2023", endDate: "Jan 2, 2024", rationale: "Adding Instagram-style story highlights on the homepage to drive product discovery.", goals: ["CVR"], deployed: false, controlLabel: "Standard Banner", variantLabel: "Story Highlights" },
  { name: "Anchor ATC Button with Badges", status: "Inconclusive", revenueAdded: 0, placement: "Product Page", device: "Mobile", geos: "US", launchDate: "Nov 28, 2023", endDate: "Dec 26, 2023", rationale: "Making the ATC button sticky with trust badges to increase mobile conversion.", goals: ["ATC", "CVR", "RPV"], deployed: false, controlLabel: "Static ATC", variantLabel: "Sticky ATC + Badges" },
  { name: "Redesign Reposition UVPs Max 3", status: "Successful", revenueAdded: 67900, placement: "Product Page", device: "All Devices", geos: "US, CA, GB, AU", launchDate: "Sep 5, 2023", endDate: "Oct 3, 2023", rationale: "Redesigning and limiting UVPs to max 3 for clearer messaging and stronger conversion.", goals: ["CVR", "ATC", "RPV", "AOV"], deployed: true, controlLabel: "5+ UVPs", variantLabel: "Top 3 UVPs" },
  { name: "Savings Presentation (You Saved $X)", status: "Successful", revenueAdded: 6800, placement: "Cart Page", device: "All Devices", geos: "US, CA", launchDate: "Aug 28, 2023", endDate: "Sep 25, 2023", rationale: "Showing dynamic savings amount in the cart to reinforce the value of the purchase.", goals: ["CVR", "AOV"], deployed: true, controlLabel: "No Savings", variantLabel: "Savings Display" },
]

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; bg: string; border: string; dot: string }> = {
  Successful: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  Unsuccessful: { icon: XCircle, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500" },
  Inconclusive: { icon: HelpCircle, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
}

const accentStrip: Record<Status, string> = {
  Successful: "bg-emerald-500",
  Unsuccessful: "bg-rose-400",
  Inconclusive: "bg-amber-400",
}

const goalColors: Record<string, string> = {
  CVR: "bg-sky-100 text-sky-700 border-sky-200",
  ATC: "bg-violet-100 text-violet-700 border-violet-200",
  RPV: "bg-teal-100 text-teal-700 border-teal-200",
  AOV: "bg-amber-100 text-amber-700 border-amber-200",
}

const allStatuses: ("All Results" | Status)[] = ["All Results", "Successful", "Unsuccessful", "Inconclusive"]

function formatRevenue(n: number) {
  if (n === 0) return "$0.0K"
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

// Convert Result to Experiment interface for modal compatibility
function convertResultToExperiment(result: Result): any {
  return {
    name: result.name,
    description: result.rationale,
    status: result.status,
    placement: result.placement,
    devices: result.device,
    geos: result.geos,
    variants: "2",
    revenue: formatRevenue(result.revenueAdded),
    primaryGoals: result.goals,
    rationale: result.rationale,
    revenueAddedMrr: formatRevenue(result.revenueAdded),
    deployed: result.deployed,
    launchDate: result.launchDate,
    endDate: result.endDate,
  }
}

/* ============================================================
   Main Grid
   ============================================================ */
export function ClientResultsGrid() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [status, setStatus] = useState<"All Results" | Status>("All Results")
  const [search, setSearch] = useState("")
  const [selectedResult, setSelectedResult] = useState<Result | null>(null)

  const handleClose = useCallback(() => setSelectedResult(null), [])

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (status !== "All Results" && r.status !== status) return false
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [status, search])

  const counts = useMemo(() => ({
    total: filtered.length,
    successful: filtered.filter((r) => r.status === "Successful").length,
    unsuccessful: filtered.filter((r) => r.status === "Unsuccessful").length,
    inconclusive: filtered.filter((r) => r.status === "Inconclusive").length,
    totalRevenue: filtered.reduce((sum, r) => sum + r.revenueAdded, 0),
  }), [filtered])

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
            Revenue added: <span className="font-semibold text-emerald-600">{formatRevenue(counts.totalRevenue)}</span>
          </span>
        </div>

        {/* Toolbar -- no client filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <SelectField value={status} onChange={(v) => setStatus(v as typeof status)} options={allStatuses} />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search experiments..."
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

        {/* Grid view */}
        {view === "grid" && (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {filtered.map((r, i) => {
              const cfg = statusConfig[r.status]
              return (
                <button
                  key={i}
                  onClick={() => setSelectedResult(r)}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-all group text-left"
                >
                  <div className="h-36 bg-accent/20 overflow-hidden">
                    <img
                      src={RESULT_IMG}
                      alt={r.name}
                      className="h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", cfg.bg, cfg.color, cfg.border)}>
                        {r.status}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{r.name}</h3>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {r.goals.map((g) => (
                        <span key={g} className={cn("text-[10px] font-semibold px-1.5 py-px rounded border", goalColors[g] || "bg-accent text-foreground border-border")}>
                          {g}
                        </span>
                      ))}
                    </div>
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
        {view === "list" && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Experiment", "Status", "Goals", "Placement", "Device", "Revenue Added", "Duration"].map((h) => (
                      <th key={h} className={cn("px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-left", h === "Revenue Added" && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const cfg = statusConfig[r.status]
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelectedResult(r)}
                        className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground max-w-[300px]">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-14 rounded-md border border-border overflow-hidden bg-accent/30 shrink-0">
                              <img src={RESULT_IMG} alt={r.name} className="h-full w-full object-cover object-top" />
                            </div>
                            <span className="line-clamp-1">{r.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border inline-block", cfg.bg, cfg.color, cfg.border)}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1">
                            {r.goals.map((g) => (
                              <span key={g} className={cn("text-[10px] font-semibold px-1.5 py-px rounded border", goalColors[g] || "bg-accent text-foreground border-border")}>
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
                          {r.launchDate.split(",")[0]} - {r.endDate.split(",")[0]}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-[13px] text-muted-foreground">No results match your filters.</p>
          </div>
        )}
      </div>

      {selectedResult && (
        <ExperimentDetailsModal 
          isOpen={!!selectedResult}
          experiment={convertResultToExperiment(selectedResult)} 
          onClose={handleClose} 
        />
      )}
    </>
  )
}
