"use client"

import { cn } from "@/lib/utils"
import { ChevronDown, ExternalLink, Search } from "lucide-react"
import { useState, useMemo } from "react"
import { useAirtable } from "@/hooks/use-airtable"

// ── Field parsers ──────────────────────────────────────────────────────────────
// Airtable returns numeric fields as strings with % and $ symbols

const parsePct = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0
  const str = String(v)
  const num = parseFloat(str.replace(/%/g, "").trim()) || 0
  // If the string already had a % symbol, the number is already in percent form
  if (str.includes("%")) return num
  // Raw decimal from Airtable percent field — scale to whole percent
  if (num > 0 && num <= 1) return Math.round(num * 100)
  return num
}

const parseDollar = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0
  return parseFloat(String(v).replace(/[$,]/g, "").trim()) || 0
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface ParsedVariant {
  name: string
  status: string
  trafficPct: number
  visitors: number
  conversions: number
  revenue: number
  revenueImpPct: number
  aov: number
  crPct: number
  crImpPct: number
  crConfidence: number
  rpv: number
  rpvImpPct: number
  rpvConfidence: number
  previewUrl?: string
}

interface ParsedExperiment {
  id: string
  name: string
  launchDate: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: ParsedVariant[]
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 90
      ? "bg-emerald-500"
      : value >= 60
      ? "bg-emerald-400"
      : value >= 30
      ? "bg-amber-400"
      : "bg-muted-foreground/30"
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[12px] text-muted-foreground tabular-nums">{value}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Running: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Paused: "bg-amber-50 text-amber-700 border-amber-200",
    Winner: "bg-sky-50 text-sky-700 border-sky-200",
  }
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", styles[status] ?? styles.Running)}>
      {status}
    </span>
  )
}

const cols = [
  { label: "Variant", align: "left" as const },
  { label: "Traffic %", align: "center" as const },
  { label: "Visitors", align: "right" as const },
  { label: "Conversions", align: "right" as const },
  { label: "Revenue", align: "right" as const },
  { label: "Rev. Imp %", align: "right" as const },
  { label: "AOV", align: "right" as const },
  { label: "CR %", align: "right" as const },
  { label: "CR Imp %", align: "right" as const },
  { label: "CR Confidence", align: "left" as const },
  { label: "RPV", align: "right" as const },
  { label: "RPV Imp %", align: "right" as const },
  { label: "RPV Confidence", align: "left" as const },
  { label: "", align: "center" as const },
]

// ── Main component ─────────────────────────────────────────────────────────────
export function ClientLiveTests() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState("")

  // ── Step 1: Fetch live experiments (role-filter auto-scopes to client) ──────
  const { data: rawExperiments, isLoading: experimentsLoading } = useAirtable("experiments", {
    filterExtra: '{Test Status} = "Live - Collecting Data"',
    fields: [
      "Test Description",
      "Launch Date",
      "Placement",
      "Placement URL",
      "Devices",
      "GEOs",
    ],
    sort: [{ field: "Launch Date", direction: "desc" }],
    revalidateOnFocus: false,
  })

  // ── Step 2: Build variant filter using experiment names ──────────────────────
  // In Airtable formula context, linked record fields ({Experiments}) serialize
  // as the linked records' primary field values (names), NOT record IDs.
  // The "Test Description (from Experiments)" lookup field stores this value
  // directly, so we filter variants by matching experiment names.
  const experimentNames = useMemo(
    () =>
      rawExperiments
        ?.map((r) => (r.fields["Test Description"] as string) ?? "")
        .filter(Boolean) ?? [],
    [rawExperiments]
  )

  const variantFilter = useMemo(() => {
    if (!experimentNames.length) return undefined
    // Escape single quotes inside names so the formula stays valid
    const clauses = experimentNames.map((name) => {
      const safe = name.replace(/'/g, "\\'")
      return `{Test Description (from Experiments)} = '${safe}'`
    })
    return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(", ")})`
  }, [experimentNames])

  // ── Step 3: Fetch variants scoped to those experiments ───────────────────────
  const { data: rawVariants, isLoading: variantsLoading } = useAirtable("variants", {
    enabled: experimentNames.length > 0,
    filterExtra: variantFilter,
    fields: [
      "Variant Name",
      "Status",
      "Test Description (from Experiments)", // used for grouping back to experiment
      "Preview URL",
      "Traffic %",
      "Visitors",
      "Conversions",
      "Revenue",
      "Revenue Improvement %",
      "AOV",
      "CR %",
      "CR Improvement %",
      "CR Improvement Confidence",
      "RPV",
      "RPV Improvement %",
      "RPV Improvement Confidence",
    ],
    revalidateOnFocus: false,
  })

  // ── Step 4: Group variants under parent experiments ──────────────────────────
  const experiments = useMemo((): ParsedExperiment[] => {
    if (!rawExperiments) return []

    // Build name → experiment record ID map for grouping
    const nameToId: Record<string, string> = {}
    for (const eRec of rawExperiments) {
      const name = (eRec.fields["Test Description"] as string) ?? ""
      if (name) nameToId[name] = eRec.id
    }

    const variantsByExp: Record<string, ParsedVariant[]> = {}

    if (rawVariants) {
      for (const vRec of rawVariants) {
        const vf = vRec.fields
        // "Test Description (from Experiments)" is a lookup of the linked
        // experiment's primary field — use it to find the parent experiment ID
        const expName = (vf["Test Description (from Experiments)"] as string) ?? ""
        const expId = nameToId[expName]
        if (!expId) continue

        const variant: ParsedVariant = {
          name: (vf["Variant Name"] as string) || "Unnamed",
          status: (vf["Status"] as string) || "Running",
          trafficPct: parsePct(vf["Traffic %"]),
          visitors: (vf["Visitors"] as number) || 0,
          conversions: (vf["Conversions"] as number) || 0,
          revenue: parseDollar(vf["Revenue"]),
          revenueImpPct: parsePct(vf["Revenue Improvement %"]),
          aov: parseDollar(vf["AOV"]),
          crPct: parsePct(vf["CR %"]),
          crImpPct: parsePct(vf["CR Improvement %"]),
          crConfidence: parsePct(vf["CR Improvement Confidence"]),
          rpv: parseDollar(vf["RPV"]),
          rpvImpPct: parsePct(vf["RPV Improvement %"]),
          rpvConfidence: parsePct(vf["RPV Improvement Confidence"]),
          previewUrl: (vf["Preview URL"] as string) || undefined,
        }

        if (!variantsByExp[expId]) variantsByExp[expId] = []
        variantsByExp[expId].push(variant)
      }
    }

    return rawExperiments.map((eRec) => {
      const ef = eRec.fields
      return {
        id: eRec.id,
        name: (ef["Test Description"] as string) || "Unnamed Experiment",
        launchDate: (ef["Launch Date"] as string) || "",
        placement: (ef["Placement"] as string) || "",
        placementUrl: (ef["Placement URL"] as string) || undefined,
        devices: Array.isArray(ef["Devices"])
          ? (ef["Devices"] as string[]).join(", ")
          : (ef["Devices"] as string) || "",
        geos: Array.isArray(ef["GEOs"])
          ? (ef["GEOs"] as string[]).join(", ")
          : (ef["GEOs"] as string) || "",
        variants: variantsByExp[eRec.id] ?? [],
      }
    })
  }, [rawExperiments, rawVariants])

  const filtered = useMemo(() => {
    if (!search) return experiments
    const q = search.toLowerCase()
    return experiments.filter((e) => e.name.toLowerCase().includes(q))
  }, [experiments, search])

  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }))

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const isLoading = experimentsLoading || (experimentNames.length > 0 && variantsLoading)

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search experiments..."
            className="w-full h-9 pl-9 pr-3 text-[13px] rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {isLoading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-[13px] text-muted-foreground">Loading live experiments...</p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-[13px] text-muted-foreground">
            {search ? "No experiments match your search" : "No live experiments at this time"}
          </p>
        </div>
      )}

      {!isLoading &&
        filtered.map((exp) => {
          const isCollapsed = collapsed[exp.id]
          return (
            <div key={exp.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Experiment header */}
              <button
                onClick={() => toggle(exp.id)}
                className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                    isCollapsed && "-rotate-90"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-muted-foreground">Experiment</span>
                  <p className="text-sm font-medium text-foreground">{exp.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {exp.placement && (
                      <span className="text-[11px] text-muted-foreground">{exp.placement}</span>
                    )}
                    {exp.placementUrl && (
                      <a
                        href={exp.placementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-sky-600 flex items-center gap-0.5 hover:underline"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Preview
                      </a>
                    )}
                    {exp.devices && (
                      <span className="text-[11px] text-muted-foreground">{exp.devices}</span>
                    )}
                    {exp.geos && (
                      <span className="text-[11px] text-muted-foreground">{exp.geos}</span>
                    )}
                    {exp.launchDate && (
                      <span className="text-[11px] text-muted-foreground">
                        Launched {exp.launchDate}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[12px] text-muted-foreground tabular-nums shrink-0">
                  {exp.variants.length} variant{exp.variants.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Variant table */}
              {!isCollapsed && exp.variants.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px]">
                    <thead>
                      <tr className="border-t border-border">
                        {cols.map((col) => (
                          <th
                            key={col.label}
                            className={cn(
                              "px-3 py-2.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap",
                              col.align === "right"
                                ? "text-right"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left"
                            )}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exp.variants.map((v, vi) => (
                        <tr
                          key={vi}
                          className={cn(
                            "border-t border-border transition-colors hover:bg-accent/30",
                            vi % 2 === 1 && "bg-accent/15"
                          )}
                        >
                          <td className="px-3 py-3 text-[13px] text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={v.status} />
                              <span className="font-medium">{v.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[13px] text-foreground text-center tabular-nums">
                            {v.trafficPct}%
                          </td>
                          <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                            {v.visitors.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                            {v.conversions.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                            {fmt(v.revenue)}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-right tabular-nums">
                            {v.revenueImpPct > 0 ? (
                              <span className="text-emerald-600 font-medium">
                                +{v.revenueImpPct.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                            {fmt(v.aov)}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                            {v.crPct.toFixed(2)}%
                          </td>
                          <td className="px-3 py-3 text-[13px] text-right tabular-nums">
                            {v.crImpPct > 0 ? (
                              <span className="text-emerald-600 font-medium">
                                +{v.crImpPct.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {v.crConfidence > 0 ? (
                              <ConfidenceBar value={v.crConfidence} />
                            ) : (
                              <span className="text-[12px] text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                            {fmt(v.rpv)}
                          </td>
                          <td className="px-3 py-3 text-[13px] text-right tabular-nums">
                            {v.rpvImpPct > 0 ? (
                              <span className="text-muted-foreground">+{v.rpvImpPct.toFixed(2)}%</span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {v.rpvConfidence > 0 ? (
                              <ConfidenceBar value={v.rpvConfidence} />
                            ) : (
                              <span className="text-[12px] text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {v.previewUrl ? (
                              <a
                                href={v.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 border border-sky-200 rounded-md px-2.5 py-1"
                              >
                                Preview
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* No variants state */}
              {!isCollapsed && exp.variants.length === 0 && (
                <div className="border-t border-border px-5 py-4 text-[13px] text-muted-foreground">
                  No variant data available yet
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
