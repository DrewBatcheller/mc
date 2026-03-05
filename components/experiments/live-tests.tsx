"use client"

import { cn } from "@/lib/utils"
import { ExternalLink, Search } from "lucide-react"
import { useState, useMemo } from "react"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"

// Variants table stores Traffic % as e.g. "25%" — strip the symbol before parsing
const parsePct = (v: unknown): number =>
  parseFloat(String(v ?? '').replace(/%/g, '').trim()) || 0

export function LiveTests() {
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All Clients")

  // ── Step 1: Fetch live experiments ───────────────────────────────────────────
  const { data: rawExps, isLoading: expsLoading } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Brand Name (from Brand Name)', 'Launch Date'],
    filterExtra: '{Test Status} = "Live - Collecting Data"',
    sort: [{ field: 'Launch Date', direction: 'desc' }],
  })

  // ── Step 2: Build name-based variant filter ───────────────────────────────────
  // Airtable filterByFormula evaluates linked fields by their primary field value
  // (the display name), not record IDs. The Variants table has a lookup field
  // "Test Description (from Experiments)" that stores the experiment's name —
  // use that to scope the variant fetch to only these experiments.
  const experimentNames = useMemo(
    () => (rawExps ?? []).map(r => String(r.fields['Test Description'] ?? '')).filter(Boolean),
    [rawExps]
  )

  const variantFilter = useMemo(() => {
    if (!experimentNames.length) return undefined
    const clauses = experimentNames.map(name => {
      const safe = name.replace(/'/g, "\\'")
      return `{Test Description (from Experiments)} = '${safe}'`
    })
    return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(', ')})`
  }, [experimentNames])

  // ── Step 3: Fetch variants scoped to these experiments ────────────────────────
  const { data: rawVariants, isLoading: variantsLoading } = useAirtable('variants', {
    fields: ['Variant Name', 'Status', 'Traffic %', 'Test Description (from Experiments)'],
    filterExtra: variantFilter,
    enabled: experimentNames.length > 0,
  })

  // ── Step 4: Group variants back to their parent experiment ────────────────────
  const experiments = useMemo(() => {
    if (!rawExps) return []

    // Build name → experiment id map for grouping
    const nameToId: Record<string, string> = {}
    for (const r of rawExps) {
      const name = String(r.fields['Test Description'] ?? '')
      if (name) nameToId[name] = r.id
    }

    // Group variants by parent experiment id
    const variantsByExp: Record<string, Array<{ name: string; trafficPct: number; status: string }>> = {}
    for (const v of rawVariants ?? []) {
      const expName = String(v.fields['Test Description (from Experiments)'] ?? '')
      const expId = nameToId[expName]
      if (!expId) continue
      if (!variantsByExp[expId]) variantsByExp[expId] = []
      variantsByExp[expId].push({
        name:       String(v.fields['Variant Name'] ?? 'Variant'),
        trafficPct: parsePct(v.fields['Traffic %']),
        status:     String(v.fields['Status'] ?? 'Running'),
      })
    }

    return rawExps.map(r => {
      const brandArr = r.fields['Brand Name (from Brand Name)']
      const client = Array.isArray(brandArr) ? String(brandArr[0] ?? '') : String(brandArr ?? '')
      return {
        id:         r.id,
        name:       String(r.fields['Test Description'] ?? ''),
        client,
        launchDate: String(r.fields['Launch Date'] ?? ''),
        variants:   variantsByExp[r.id] ?? [],
      }
    })
  }, [rawExps, rawVariants])

  const clients = useMemo(
    () => ['All Clients', ...Array.from(new Set(experiments.map(e => e.client).filter(Boolean)))],
    [experiments]
  )

  const filtered = useMemo(() => experiments.filter(e => {
    if (clientFilter !== 'All Clients' && e.client !== clientFilter) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.client.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [experiments, clientFilter, search])

  const isLoading = expsLoading || (experimentNames.length > 0 && variantsLoading)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <SelectField value={clientFilter} onChange={setClientFilter} options={clients} />
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search experiments..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">No live tests found</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(exp => (
            <div key={exp.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{exp.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{exp.client}</span>
                    {exp.launchDate && <span className="text-[11px] text-muted-foreground">• Started {exp.launchDate}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border bg-sky-50 text-sky-700 border-sky-200">Live</span>
                  <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-accent/20">
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Variant</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Traffic %</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exp.variants.length > 0 ? exp.variants.map((v, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground">{v.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{v.trafficPct}%</td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                            v.status === 'Running'
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : v.status === 'Paused'
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-center text-muted-foreground text-[12px]">No variant data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
