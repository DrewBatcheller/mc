"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Star, ChevronDown, ChevronUp, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"

interface Client {
  brand: string
  status: "Active" | "Inactive"
  notes: string
  sentiment: number | null
  totalPaid: number
  monthlyPrice: number
  planType: string
}

export const clients: Client[] = [
  { brand: "Goose Creek Candles", status: "Active", notes: "-", sentiment: 5, totalPaid: 156000, monthlyPrice: 5000, planType: "-" },
  { brand: "Primal Queen", status: "Inactive", notes: "-", sentiment: null, totalPaid: 136189, monthlyPrice: 5000, planType: "3 Tests" },
  { brand: "Perfect White Tee", status: "Active", notes: "-", sentiment: 5, totalPaid: 75560, monthlyPrice: 6000, planType: "3 Tests" },
  { brand: "Blox Boom", status: "Inactive", notes: "-", sentiment: null, totalPaid: 64000, monthlyPrice: 10000, planType: "3 Tests" },
  { brand: "Kitty Spout", status: "Inactive", notes: "-", sentiment: null, totalPaid: 61000, monthlyPrice: 6000, planType: "2 Tests" },
  { brand: "Arrowhead", status: "Inactive", notes: "-", sentiment: null, totalPaid: 60850, monthlyPrice: 3000, planType: "2 Tests" },
  { brand: "Gatsby", status: "Inactive", notes: "-", sentiment: null, totalPaid: 55250, monthlyPrice: 5000, planType: "2 Tests" },
  { brand: "Infinite Age", status: "Inactive", notes: "-", sentiment: null, totalPaid: 52300, monthlyPrice: 4500, planType: "2 Tests" },
  { brand: "Hashtash", status: "Inactive", notes: "-", sentiment: null, totalPaid: 41000, monthlyPrice: 5000, planType: "2 Tests" },
  { brand: "LiveSozy", status: "Inactive", notes: "-", sentiment: null, totalPaid: 40440, monthlyPrice: 4800, planType: "2 Tests" },
  { brand: "Vita Hustle", status: "Active", notes: "-", sentiment: 4, totalPaid: 38200, monthlyPrice: 6000, planType: "3 Tests" },
  { brand: "Cosara", status: "Active", notes: "-", sentiment: 4, totalPaid: 35000, monthlyPrice: 5000, planType: "2 Tests" },
  { brand: "Dr Woof Apparel", status: "Active", notes: "-", sentiment: 3, totalPaid: 28000, monthlyPrice: 4000, planType: "2 Tests" },
  { brand: "Moon Nude", status: "Inactive", notes: "-", sentiment: null, totalPaid: 24000, monthlyPrice: 5000, planType: "2 Tests" },
  { brand: "Purusha People", status: "Active", notes: "-", sentiment: 4, totalPaid: 22000, monthlyPrice: 5000, planType: "3 Tests" },
]

type SortKey = "brand" | "totalPaid" | "monthlyPrice"

const statusCfg = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-amber-50 text-amber-700 border-amber-200",
}

const planCfg: Record<string, string> = {
  "2 Tests": "bg-sky-50 text-sky-700 border-sky-200",
  "3 Tests": "bg-violet-50 text-violet-700 border-violet-200",
  Course: "bg-amber-50 text-amber-700 border-amber-200",
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i < count ? "fill-amber-400 text-amber-400" : "text-border fill-transparent")}
        />
      ))}
    </div>
  )
}

export function ClientsTable() {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>("totalPaid")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [statusFilter, setStatusFilter] = useState<string>("All Status")
  const [planFilter, setPlanFilter] = useState<string>("All Plans")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const sorted = useMemo(() => {
    let filtered = [...clients]
    
    // Apply status filter
    if (statusFilter !== "All Status") {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }
    
    // Apply plan type filter
    if (planFilter !== "All Plans") {
      filtered = filtered.filter((c) => c.planType === planFilter)
    }
    
    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((c) => c.brand.toLowerCase().includes(query))
    }
    
    // Sort
    return filtered.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [sortKey, sortDir, statusFilter, planFilter, searchQuery])

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("desc") }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronDown className="h-3 w-3 opacity-30" />

  const allStatuses = ["All Status", "Active", "Inactive"]
  const allPlans = ["All Plans", "2 Tests", "3 Tests", "Course"]

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-accent/20">
        <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
        <SelectField value={planFilter} onChange={setPlanFilter} options={allPlans} />

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by brand name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-foreground text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {[
                { label: "Brand Name", key: "brand" as SortKey, align: "text-left" },
                { label: "Client Status", key: null, align: "text-left" },
                { label: "Notes", key: null, align: "text-left" },
                { label: "Sentiment", key: null, align: "text-left" },
                { label: "TotalPaid", key: "totalPaid" as SortKey, align: "text-right" },
                { label: "Monthly Price", key: "monthlyPrice" as SortKey, align: "text-right" },
                { label: "Plan Type", key: null, align: "text-left" },
              ].map((col, ci) => (
                <th
                  key={ci}
                  className={cn(
                    "px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap",
                    col.align,
                    col.key && "cursor-pointer select-none hover:text-foreground transition-colors"
                  )}
                  onClick={() => col.key && toggle(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.key && <SortIcon k={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr 
                key={c.brand} 
                onClick={() => router.push(`/clients/directory?client=${c.id}`)}
                className={cn("border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors cursor-pointer", i % 2 === 1 && "bg-accent/10")}
              >
                <td className="px-4 py-3 font-medium text-foreground">{c.brand}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", statusCfg[c.status])}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.notes}</td>
                <td className="px-4 py-3">
                  {c.sentiment ? <Stars count={c.sentiment} /> : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">${c.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">${c.monthlyPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  {c.planType !== "-" ? (
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border", planCfg[c.planType] || "bg-accent text-foreground border-border")}>{c.planType}</span>
                  ) : <span className="text-muted-foreground">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
