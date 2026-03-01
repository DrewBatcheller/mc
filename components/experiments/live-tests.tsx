"use client"

import { cn } from "@/lib/utils"
import { ChevronDown, ExternalLink, Search } from "lucide-react"
import { useState, useMemo } from "react"
import { SelectField } from "@/components/shared/select-field"

interface Variant {
  trafficPct: number
  visitors: number
  conversions: number
  revenue: number
  revenueImpPct: number
  aov: number
  crPct: number
  crImpPct: number
  crConfidence: number
  rpvImpPct: number
  rpv: number
  rpvConfidence: number
  status: "Running" | "Paused" | "Winner"
}

interface Experiment {
  name: string
  client: string
  variants: Variant[]
}

const experiments: Experiment[] = [
  {
    name: "Change hero CTA button text",
    client: "Vita Hustle",
    variants: [
      {
        trafficPct: 50, visitors: 2412, conversions: 12, revenue: 21321, revenueImpPct: 5.0,
        aov: 13.0, crPct: 5.0, crImpPct: 4.0, crConfidence: 55, rpvImpPct: 4, rpv: 2.0, rpvConfidence: 99, status: "Running",
      },
      {
        trafficPct: 50, visitors: 12321, conversions: 52, revenue: 12521521, revenueImpPct: 4.0,
        aov: 12.0, crPct: 4.0, crImpPct: 3.0, crConfidence: 97, rpvImpPct: 2, rpv: 3.0, rpvConfidence: 88, status: "Running",
      },
    ],
  },
  {
    name: "Collection page visual navigation bubbles",
    client: "Cosara",
    variants: [
      {
        trafficPct: 50, visitors: 5830, conversions: 34, revenue: 48200, revenueImpPct: 8.2,
        aov: 14.18, crPct: 5.83, crImpPct: 6.1, crConfidence: 72, rpvImpPct: 5, rpv: 2.80, rpvConfidence: 64, status: "Running",
      },
      {
        trafficPct: 50, visitors: 5744, conversions: 28, revenue: 38950, revenueImpPct: 3.1,
        aov: 13.91, crPct: 4.87, crImpPct: 2.4, crConfidence: 41, rpvImpPct: 1, rpv: 2.30, rpvConfidence: 38, status: "Running",
      },
    ],
  },
  {
    name: "High-visibility always-on search header",
    client: "The Ayurveda Experience",
    variants: [
      {
        trafficPct: 50, visitors: 9100, conversions: 65, revenue: 87300, revenueImpPct: 12.4,
        aov: 15.42, crPct: 7.14, crImpPct: 9.2, crConfidence: 91, rpvImpPct: 8, rpv: 3.60, rpvConfidence: 85, status: "Running",
      },
      {
        trafficPct: 50, visitors: 9050, conversions: 41, revenue: 54200, revenueImpPct: 2.8,
        aov: 13.22, crPct: 4.53, crImpPct: 1.5, crConfidence: 28, rpvImpPct: 1, rpv: 2.10, rpvConfidence: 22, status: "Paused",
      },
    ],
  },
  {
    name: "Mobile navigation category tabs",
    client: "Dr Woof Apparel",
    variants: [
      {
        trafficPct: 50, visitors: 3200, conversions: 18, revenue: 15400, revenueImpPct: 3.5,
        aov: 11.50, crPct: 5.63, crImpPct: 2.8, crConfidence: 44, rpvImpPct: 3, rpv: 1.80, rpvConfidence: 39, status: "Running",
      },
      {
        trafficPct: 50, visitors: 3180, conversions: 22, revenue: 19800, revenueImpPct: 6.2,
        aov: 12.10, crPct: 6.92, crImpPct: 5.4, crConfidence: 68, rpvImpPct: 5, rpv: 2.40, rpvConfidence: 61, status: "Running",
      },
    ],
  },
]

const allClients = ["All Clients", ...Array.from(new Set(experiments.map((e) => e.client)))]

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 90 ? "bg-emerald-500" : value >= 60 ? "bg-emerald-400" : value >= 30 ? "bg-amber-400" : "bg-muted-foreground/30"
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
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", styles[status] || styles.Running)}>
      {status}
    </span>
  )
}

const cols = [
  { label: "Traffic %", align: "center" as const },
  { label: "Visitors", align: "right" as const },
  { label: "Conversions", align: "right" as const },
  { label: "Revenue", align: "right" as const },
  { label: "Rev. Imp %", align: "right" as const },
  { label: "AOV", align: "right" as const },
  { label: "CR %", align: "right" as const },
  { label: "CR Imp %", align: "right" as const },
  { label: "CR Confidence", align: "left" as const },
  { label: "RPV Imp %", align: "right" as const },
  { label: "RPV", align: "right" as const },
  { label: "RPV Confidence", align: "left" as const },
  { label: "Status", align: "center" as const },
  { label: "", align: "center" as const },
]

export function LiveTests() {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [selectedClient, setSelectedClient] = useState("All Clients")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    return experiments.filter((exp) => {
      const matchClient = selectedClient === "All Clients" || exp.client === selectedClient
      const matchSearch = !search || exp.name.toLowerCase().includes(search.toLowerCase()) || exp.client.toLowerCase().includes(search.toLowerCase())
      return matchClient && matchSearch
    })
  }, [selectedClient, search])

  const toggle = (i: number) => setCollapsed((p) => ({ ...p, [i]: !p[i] }))

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SelectField value={selectedClient} onChange={setSelectedClient} options={allClients} />
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

      {filtered.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-[13px] text-muted-foreground">No experiments match your filters</p>
        </div>
      )}

      {filtered.map((exp, ei) => {
        const origIdx = experiments.indexOf(exp)
        const isCollapsed = collapsed[origIdx]
        return (
          <div key={origIdx} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggle(origIdx)}
              className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                  isCollapsed && "-rotate-90"
                )}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] text-muted-foreground">Experiment Name</span>
                <p className="text-sm font-medium text-foreground">{exp.name}</p>
              </div>
              <span className="text-[11px] text-muted-foreground bg-accent/60 px-2 py-0.5 rounded-md shrink-0">
                {exp.client}
              </span>
            </button>

            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-t border-border">
                      {cols.map((col) => (
                        <th
                          key={col.label}
                          className={cn(
                            "px-3 py-2.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap",
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
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
                        <td className="px-3 py-3 text-[13px] text-foreground text-center tabular-nums">{v.trafficPct}%</td>
                        <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                          {v.visitors.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">{v.conversions}</td>
                        <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">{fmt(v.revenue)}</td>
                        <td className="px-3 py-3 text-[13px] text-right tabular-nums">
                          <span className="text-emerald-600 font-medium">{v.revenueImpPct.toFixed(2)}%</span>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                          ${v.aov.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                          {v.crPct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-3 text-[13px] text-right tabular-nums">
                          <span className="text-emerald-600 font-medium">{v.crImpPct.toFixed(2)}%</span>
                        </td>
                        <td className="px-3 py-3">
                          <ConfidenceBar value={v.crConfidence} />
                        </td>
                        <td className="px-3 py-3 text-[13px] text-right tabular-nums">
                          <span className="text-muted-foreground">{v.rpvImpPct}%</span>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-foreground text-right tabular-nums">
                          ${v.rpv.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">
                          <ConfidenceBar value={v.rpvConfidence} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 border border-sky-200 rounded-md px-2.5 py-1">
                            Preview
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
