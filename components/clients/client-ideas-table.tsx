"use client"

import { useState, useMemo, Fragment } from "react"
import { Search, Plus, ArrowUpDown, ChevronDown, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { NewIdeaModal } from "./new-idea-modal"
import { SyncIdeaModal } from "./sync-idea-modal"

interface ClientIdea {
  testDescription: string
  hypothesis: string
  rationale: string
  placement: string
  placementUrl: string
  primaryGoals: string[]
  weighting: string
  devices: string
  geos: string
  priority: string
}

const ideas: ClientIdea[] = [
  {
    testDescription: '"Love the Taste or It\'s Free" Guarantee',
    hypothesis: 'If we add a specific "Taste-Match" badge near the ATC, then CVR will increase by addressing the primary barrier to protein purchases: taste anxiety.',
    rationale: 'Users hesitate to buy large bags of new flavors. A specific taste guarantee removes the psychological risk of being stuck with a chalky protein powder they can\'t return.',
    placement: "PDP ATC Area",
    placementUrl: "https://vitahustle.com/products/one-superf",
    primaryGoals: ["CVR", "ATC", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "5",
  },
  {
    testDescription: "Updated Contextual Delivery Date",
    hypothesis: 'If we add "Order in X hours to receive in [State] by [Date]," then CVR will increase by creating urgency and removing logistics anxiety.',
    rationale: "Knowing exactly when a replenishment product will arrive is a massive conversion lever for users running low on supply.",
    placement: "Under ATC",
    placementUrl: "https://vitahustle.com/products/one-superf",
    primaryGoals: ["CVR", "SCVR", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "4",
  },
  {
    testDescription: "Move OTP Below ATC",
    hypothesis: 'If we move the "One-Time Purchase" option to a text link below the main Add to Cart button, then Subscription CVR will increase by making subscription the default path.',
    rationale: 'High growth brands use this to prioritize recurring revenue. It frames the subscription as the "standard" way to buy while keeping the one-time option accessible.',
    placement: "Buybox (Toggles)",
    placementUrl: "https://vitahustle.com/products/one-superf",
    primaryGoals: ["CVR", "AOV", "SCVR", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "5",
  },
  {
    testDescription: "In Cart Subscription Switcher",
    hypothesis: 'If we add a toggle in the cart drawer to "Switch to Subscribe & Save," then Subscription CVR will increase by capturing users swayed by final price savings.',
    rationale: 'Seeing the total price in the cart is the "moment of truth." A 20% discount here is a powerful final nudge.',
    placement: "Slide-out Cart Drawer",
    placementUrl: "https://vitahustle.com",
    primaryGoals: ["CVR", "SCVR", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "3",
  },
  {
    testDescription: "Tiered Quantity Breaks (1, 2, 3 Bags)",
    hypothesis: 'If we replace the static quantity selectors with a "Build a Bundle" experience and a dynamic gamification bar that unlocks tiered discounts (10% off at 3 bags, 15% off at 4+), then AOV will increase.',
    rationale: 'The current buybox lacks a clear "reward" for adding more bags beyond the $50 shipping threshold. By introducing a progress bar that visualizes savings, users feel motivated to add more.',
    placement: "Above ATC Button",
    placementUrl: "https://vitahustle.com/products/one-superf",
    primaryGoals: ["AOV", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "4",
  },
  {
    testDescription: "Sitewide Progress Bar: Tiered Reward Incentive",
    hypothesis: "If we implement a new dynamic announcement bar that tracks progress toward Free Shipping and a Free Shaker, then AOV and CVR will increase by creating a persistent visual incentive.",
    rationale: "Without an announcement bar, users may not realize they are close to a value threshold (like Free Shipping at 2 bags) until they reach the checkout.",
    placement: "Site-wide Header / Top",
    placementUrl: "https://vitahustle.com",
    primaryGoals: ["CVR", "AOV", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "3",
  },
  {
    testDescription: "Price Per Serving & Total Savings Visualization",
    hypothesis: 'If we emphasize the "$2.66/serving" cost and show "You Save $10.00" in high contrast green, then SCVR will increase by making the value undeniable.',
    rationale: 'Breaking down large lump sums into a "Daily Ritual" cost triggers rational value logic, making the purchase feel like a smaller daily investment.',
    placement: "Purchase Options / Buybox",
    placementUrl: "https://vitahustle.com/products/one-superf",
    primaryGoals: ["CVR", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "2",
  },
  {
    testDescription: "Cart Drawer Cross-Sell & Impulse Add-ons",
    hypothesis: 'If we add a "Frequently Bought Together" section in the cart drawer with low-friction items, then AOV will increase via impulse purchases.',
    rationale: "Once a user commits to a $50 bag, adding a $10 shaker or smaller accessory feels like a minor marginal cost that doesn't require heavy consideration.",
    placement: "Cart Drawer / Slide-out Cart",
    placementUrl: "https://vitahustle.com/cart",
    primaryGoals: ["AOV", "ATC", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "4",
  },
  {
    testDescription: "PDP Taste Validation Video Carousel",
    hypothesis: 'If we implement a video testimonial carousel specifically showcasing people drinking the shake, then CVR will increase by removing "Taste Anxiety" at the point of purchase.',
    rationale: "Users at the bottom of the funnel are often hesitant about texture and flavor. Seeing authentic video reviews of customers enjoying the product is more persuasive than text reviews.",
    placement: "Below the Buybox",
    placementUrl: "https://vitahustle.com/products/one-superf",
    primaryGoals: ["CVR", "ATC", "RPV"],
    weighting: "50/50",
    devices: "All Devices",
    geos: "United States",
    priority: "5",
  },
]

const goalColors: Record<string, string> = {
  CVR: "bg-sky-50 text-sky-700 border-sky-200",
  ATC: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RPV: "bg-violet-50 text-violet-700 border-violet-200",
  AOV: "bg-amber-50 text-amber-700 border-amber-200",
  SCVR: "bg-indigo-50 text-indigo-700 border-indigo-200",
}

type SortKey = "testDescription" | "placement" | "devices" | "geos"

const columns: { key: SortKey | null; label: string }[] = [
  { key: null, label: "" },
  { key: "testDescription", label: "Test Description" },
  { key: "placement", label: "Placement" },
  { key: null, label: "Primary Goals" },
  { key: null, label: "Priority" },
]

export function ClientIdeasTable() {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("testDescription")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncIdea, setSyncIdea] = useState<ClientIdea | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleCreateIdea = (data: Record<string, unknown>) => {
    console.log("New idea created:", data)
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = useMemo(() => {
    let list = ideas.map((idea, i) => ({ ...idea, _idx: i }))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.testDescription.toLowerCase().includes(q) ||
          i.hypothesis.toLowerCase().includes(q) ||
          i.rationale.toLowerCase().includes(q) ||
          i.placement.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [search, sortKey, sortDir])

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search test ideas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 rounded-lg bg-foreground text-card px-4 text-[13px] font-medium hover:bg-foreground/90 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            New Idea
          </button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={cn(
                      "px-4 py-3 text-[12px] font-medium text-muted-foreground whitespace-nowrap text-left",
                      i === 0 && "w-10 px-0 pl-4"
                    )}
                  >
                    {col.key ? (
                      <button
                        onClick={() => handleSort(col.key!)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                      >
                        {col.label}
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3 transition-colors",
                            sortKey === col.key
                              ? "text-foreground"
                              : "text-muted-foreground/30 group-hover:text-muted-foreground"
                          )}
                        />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((idea) => {
                const isExpanded = expandedRows.has(idea._idx)
                return (
                  <Fragment key={idea._idx}>
                    {/* Main row */}
                    <tr
                      onClick={() => toggleRow(idea._idx)}
                      className="border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/30 transition-colors"
                    >
                      <td className="w-10 px-0 pl-4 py-3.5 align-middle">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium text-foreground align-middle max-w-[260px]">
                        <span className="block truncate">{idea.testDescription}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap align-middle">
                        {idea.placement}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {idea.primaryGoals.map((g) => (
                            <span
                              key={g}
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                goalColors[g] ?? "bg-accent text-foreground border-border"
                              )}
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {idea.priority ? (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-2 w-4 rounded-sm",
                                  i < Number(idea.priority)
                                    ? Number(idea.priority) >= 4
                                      ? "bg-emerald-500"
                                      : Number(idea.priority) >= 3
                                        ? "bg-amber-400"
                                        : "bg-rose-400"
                                    : "bg-muted"
                                )}
                              />
                            ))}
                            <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">{idea.priority}/5</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <tr className="border-b border-border">
                        <td colSpan={columns.length} className="bg-accent/20 px-5 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl pl-6">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Hypothesis
                              </span>
                              <p className="text-[13px] text-foreground leading-relaxed">
                                {idea.hypothesis}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Rationale
                              </span>
                              <p className="text-[13px] text-foreground leading-relaxed">
                                {idea.rationale}
                              </p>
                            </div>
                          </div>
                          {idea.placementUrl && (
                            <div className="mt-4 pl-6 flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                URL
                              </span>
                              <a
                                href={idea.placementUrl.startsWith("http") ? idea.placementUrl : `https://${idea.placementUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors inline-flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {idea.placementUrl}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                    No test ideas found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      <NewIdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateIdea}
      />

      {syncIdea && (
        <SyncIdeaModal
          isOpen={syncModalOpen}
          onClose={() => {
            setSyncModalOpen(false)
            setSyncIdea(null)
          }}
          idea={syncIdea}
        />
      )}
    </>
  )
}
