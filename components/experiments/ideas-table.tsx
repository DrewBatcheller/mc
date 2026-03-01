"use client"

import { useState, useMemo, Fragment } from "react"
import { Search, Plus, ArrowUpDown, ChevronDown, ExternalLink, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { NewIdeaModal } from "./new-idea-modal"
import { SyncIdeaModal } from "./sync-idea-modal"

interface Idea {
  client: string
  name: string
  hypothesis: string
  rationale: string
  placementLabel: string
  placementUrl: string
  goals: string[]
  devices: string
  geos: string
  priority: string
  createdBy: string
}

const ideas: Idea[] = [
  { client: "The Ayurveda Experience", name: "Dermatologist/Practitioner Authority Block", hypothesis: "Adding an authoritative expert voice will increase the \"Believability\" of product claims and drive higher CVR.", rationale: "Users are skeptical of brand claims alone. A third-party expert endorsement adds credibility and reduces purchase hesitation for skincare products.", placementLabel: "Between \"How it Works\" section and User Reviews", placementUrl: "https://theayurvedaexperience.com/pages/firm-focus-neck-mask-a", goals: ["CVR", "RPV"], devices: "All Devices", geos: "US CA AU", priority: "3", createdBy: "Jayden Gray" },
  { client: "Vita Hustle", name: "\"Love the Taste or It's Free\" Guarantee", hypothesis: "If we add a specific \"Taste-Match\" badge near the ATC, then CVR will increase by addressing the primary barrier to protein purchases: taste anxiety.", rationale: "Users hesitate to buy large bags of new flavors. A specific taste guarantee removes the psychological risk of being stuck with a chalky protein powder they can't return.", placementLabel: "PDP ATC Area", placementUrl: "https://vitahustle.com/products/one-superfood-protein-shake-strawberry?flavor=chocolate", goals: ["CVR", "ATC", "RPV"], devices: "All Devices", geos: "US", priority: "5", createdBy: "Jayden Gray" },
  { client: "Fake Brand", name: "Replace sticky \"Add to Cart\" copy", hypothesis: "Replacing the sticky \"Add to Cart\" button with a floating one that follows the user will increase mobile CVR by keeping the primary action always visible.", rationale: "On long PDPs, users scroll past the ATC button and lose the conversion prompt. A persistent floating CTA keeps the purchase action always within reach.", placementLabel: "Bottom Screen Floating Sticky", placementUrl: "www.placementurl.com", goals: ["CVR"], devices: "Desktop", geos: "CA", priority: "2", createdBy: "Jayden Gray" },
  { client: "Cosara", name: "First-Person vs. Second-Person Button Copy", hypothesis: "If we change CTA copy to first-person (\"I Want Triple Stimulation\"), then ATC rate will increase by creating stronger psychological ownership.", rationale: "Research shows first-person CTA copy creates a sense of personal commitment, making users more likely to follow through on the action.", placementLabel: "CTA", placementUrl: "https://cosara.com/pages/upgrade-uk", goals: ["ATC", "CVR"], devices: "All Devices", geos: "US CA GB AU", priority: "4", createdBy: "Jayden Gray" },
  { client: "Vita Hustle", name: "Price Per Serving & Total Savings Visualization", hypothesis: "If we emphasize the \"$2.66/serving\" cost and show \"You Save $10.00\" in high contrast green, then SCVR will increase by making the value undeniable.", rationale: "Breaking down large lump sums into a \"Daily Ritual\" cost triggers rational value logic, making the purchase feel like a smaller daily investment.", placementLabel: "Purchase Options / Buybox", placementUrl: "https://vitahustle.com/products/one-superfood-protein-shake-strawberry?flavor=chocolate", goals: ["CVR", "RPV"], devices: "All Devices", geos: "US", priority: "2", createdBy: "Jayden Gray" },
  { client: "Cosara", name: "Unboxing Privacy Assurance", hypothesis: "If we show a 5-second loop of a plain, unbranded brown box being opened, then CVR will increase by addressing the #1 objection for personal products: privacy.", rationale: "Discreet packaging is a top concern for personal wellness products. Showing the actual unboxing experience removes ambiguity and builds trust.", placementLabel: "Before FAQ", placementUrl: "https://cosara.com/pages/upgrade-uk", goals: ["ATC", "CVR", "RPV"], devices: "All Devices", geos: "US CA GB AU", priority: "4", createdBy: "Jayden Gray" },
  { client: "Unassigned", name: "Change hero CTA button text", hypothesis: "Changing the hero CTA from \"Shop Now\" to \"Get 20% Off Your First Order\" will increase click-through by adding a concrete value proposition.", rationale: "Generic CTAs like \"Shop Now\" don't communicate any benefit. Stating the discount upfront gives users a clear reason to click.", placementLabel: "LP Hero Section", placementUrl: "www.sdfddsfds.com", goals: ["CVR", "RPV"], devices: "All Devices", geos: "AU", priority: "3", createdBy: "Jayden Gray" },
  { client: "The Ayurveda Experience", name: "Menu Hierarchy: Concern-Led Navigation", hypothesis: "Swapping the order of \"Shop by Category\" and \"Shop by Concern\" in the mega-menu will increase product discovery and ATC rate.", rationale: "Most users shop by concern (anti-aging, acne) rather than category (serums, masks). Prioritizing concern-led navigation matches user intent.", placementLabel: "Global Navigation Mega-Menu", placementUrl: "https://theayurvedaexperience.com/", goals: ["CVR", "ATC", "PPV", "CTR"], devices: "All Devices", geos: "US CA AU", priority: "5", createdBy: "Jayden Gray" },
  { client: "Cosara", name: "The \"Momentum\" CTA Injection", hypothesis: "If we insert a CTA block after every primary feature description, then ATC will increase by reducing scroll distance to the next conversion point.", rationale: "Long-form landing pages lose users between sections. Repeated CTAs capture intent at each peak of interest rather than forcing users to scroll back up.", placementLabel: "After Each Primary Section", placementUrl: "https://cosara.com/pages/upgrade-uk", goals: ["ATC", "CVR"], devices: "All Devices", geos: "US CA GB AU", priority: "3", createdBy: "Jayden Gray" },
  { client: "The Ayurveda Experience", name: "Hero Video Background (String-to-Silk)", hypothesis: "Seeing the unique texture in motion will better explain the \"String-to-Silk\" concept and increase engagement with the hero section.", rationale: "The product's unique texture transformation is difficult to convey with static images. Video demonstrates the experience in a way that text cannot.", placementLabel: "Hero section background or side media element", placementUrl: "https://theayurvedaexperience.com/pages/firm-focus-neck-mask-a", goals: ["ATC", "CVR"], devices: "All Devices", geos: "US CA AU", priority: "2", createdBy: "Jayden Gray" },
  { client: "The Ayurveda Experience", name: "AOV-Boosting Shipping Progress Bar", hypothesis: "Replacing static text with a visual progress bar that updates live will increase AOV by making the free-shipping threshold feel achievable.", rationale: "Static \"Free shipping over $X\" text doesn't create urgency. A dynamic progress bar gamifies the experience and motivates users to add more items.", placementLabel: "Top of the Cart page, above product list", placementUrl: "https://theayurvedaexperience.com/cart", goals: ["AOV", "CVR", "RPV"], devices: "All Devices", geos: "US AU", priority: "4", createdBy: "Jayden Gray" },
  { client: "Vita Hustle", name: "Cart Drawer Cross-Sell & Impulse Add-ons", hypothesis: "If we add a \"Frequently Bought Together\" section in the cart drawer with low-friction items, then AOV will increase via impulse purchases.", rationale: "Once a user commits to a $50 bag, adding a $10 shaker or smaller accessory feels like a minor marginal cost that doesn't require heavy consideration.", placementLabel: "Cart Drawer / Slide-out Cart", placementUrl: "https://vitahustle.com/cart", goals: ["AOV", "ATC", "RPV"], devices: "All Devices", geos: "US", priority: "4", createdBy: "Jayden Gray" },
  { client: "Cosara", name: "\"Silent Tech\" Sound Comparison", hypothesis: "If we add a short video or \"sound bar\" comparing a standard device vs. Cosara, then CVR will increase by making the silence benefit tangible.", rationale: "\"Quiet\" is an abstract claim. An audio or visual comparison makes the benefit concrete and memorable, differentiating from competitors.", placementLabel: "Under Comparison Chart", placementUrl: "https://cosara.com/pages/upgrade-uk", goals: ["ATC", "CVR", "RPV"], devices: "All Devices", geos: "US CA GB AU", priority: "2", createdBy: "Jayden Gray" },
  { client: "Cosara", name: "Expanded Mobile Search Input", hypothesis: "If we replace the small magnifying glass icon with a full-width search bar on mobile, then product discovery and CVR will increase.", rationale: "A small icon requires an extra tap and reduces search visibility. A full-width input encourages search behavior, which typically converts 2-3x higher.", placementLabel: "Site-Wide (Search)", placementUrl: "https://cosara.com/", goals: ["ATC", "CVR", "AOV", "RPV"], devices: "Mobile", geos: "US CA GB AU", priority: "3", createdBy: "Jayden Gray" },
  { client: "Vita Hustle", name: "In-Cart Subscription Switcher", hypothesis: "If we add a toggle in the cart drawer to \"Switch to Subscribe & Save,\" then Subscription CVR will increase by capturing users swayed by final price savings.", rationale: "Seeing the total price in the cart is the \"moment of truth.\" A 20% discount here is a powerful final nudge toward subscription.", placementLabel: "Slide-out Cart Drawer", placementUrl: "https://vitahustle.com/", goals: ["CVR", "SCVR", "RPV"], devices: "All Devices", geos: "US", priority: "5", createdBy: "Jayden Gray" },
  { client: "Vita Hustle", name: "Move OTP Below ATC", hypothesis: "If we move the \"One-Time Purchase\" option to a text link below the main Add to Cart button, then Subscription CVR will increase by making subscription the default path.", rationale: "High growth brands use this to prioritize recurring revenue. It frames the subscription as the \"standard\" way to buy while keeping the one-time option accessible.", placementLabel: "Buybox (Toggles)", placementUrl: "https://vitahustle.com/products/one-superfood-protein-shake-strawberry?flavor=chocolate", goals: ["CVR", "AOV", "SCVR", "RPV"], devices: "All Devices", geos: "US", priority: "5", createdBy: "Jayden Gray" },
  { client: "Dr Woof Apparel", name: "Quantity Reward Offer Test (Gift vs. Discount)", hypothesis: "Testing a \"Buy 4, Get 1 Free\" or \"Free Shipping\" offer against the current baseline to determine which incentive structure best lifts AOV.", rationale: "Gift-based incentives (free item) may feel more valuable than equivalent percentage discounts, especially for repeat-purchase products.", placementLabel: "PDP, Cart", placementUrl: "", goals: ["AOV", "Units per Order"], devices: "All", geos: "", priority: "3", createdBy: "Drew Batcheller" },
]

const goalColors: Record<string, string> = {
  CVR: "bg-sky-50 text-sky-700 border-sky-200",
  ATC: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RPV: "bg-violet-50 text-violet-700 border-violet-200",
  AOV: "bg-amber-50 text-amber-700 border-amber-200",
  PPV: "bg-rose-50 text-rose-700 border-rose-200",
  CTR: "bg-teal-50 text-teal-700 border-teal-200",
  SCVR: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Units per Order": "bg-orange-50 text-orange-700 border-orange-200",
}

const clients = ["All Clients", ...Array.from(new Set(ideas.map((i) => i.client))).sort()]

type SortKey = "client" | "name" | "devices" | "geos" | "priority" | "createdBy"

const columns: { key: SortKey | null; label: string }[] = [
  { key: null, label: "" },
  { key: "client", label: "Client" },
  { key: "name", label: "Test Description" },
  { key: null, label: "Placement" },
  { key: null, label: "Primary Goals" },
  { key: "priority", label: "Priority" },
  { key: null, label: "Sync" },
]

export function IdeasTable() {
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All Clients")
  const [sortKey, setSortKey] = useState<SortKey>("client")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncIdea, setSyncIdea] = useState<Idea | null>(null)

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
    if (clientFilter !== "All Clients") list = list.filter((i) => i.client === clientFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.hypothesis.toLowerCase().includes(q) ||
          i.client.toLowerCase().includes(q) ||
          i.placementLabel.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [search, clientFilter, sortKey, sortDir])

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Client</label>
                <SelectField value={clientFilter} onChange={setClientFilter} options={clients} />
              </div>
            </div>

            <div className="flex-1 relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ideas..."
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
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap align-middle">
                          {idea.client}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-foreground align-middle max-w-[260px]">
                          <span className="block truncate">{idea.name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap align-middle">
                          {idea.placementLabel}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {idea.goals.map((g) => (
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
                        <td className="px-4 py-3.5 text-center align-middle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSyncIdea(idea)
                              setSyncModalOpen(true)
                            }}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Convert idea to batch test"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-border">
                          <td colSpan={columns.length} className="bg-accent/20 px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-6">
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
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-5 pl-6 mt-4">
                              {idea.placementUrl && (
                                <div className="flex flex-col gap-1.5 min-w-0">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    URL
                                  </span>
                                  <a
                                    href={idea.placementUrl.startsWith("http") ? idea.placementUrl : `https://${idea.placementUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] text-sky-600 hover:text-sky-700 hover:underline transition-colors inline-flex items-center gap-1 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="truncate">{idea.placementUrl}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                </div>
                              )}
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Weighting
                                </span>
                                <p className="text-[13px] text-foreground">
                                  50/50
                                </p>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Devices
                                </span>
                                <p className="text-[13px] text-foreground">
                                  {idea.devices}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  GEOs
                                </span>
                                <p className="text-[13px] text-foreground">
                                  {idea.geos || "-"}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Created By
                                </span>
                                <p className="text-[13px] text-foreground">
                                  {idea.createdBy}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                      No ideas found
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
