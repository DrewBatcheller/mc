"use client"

import { cn } from "@/lib/utils"
import { ExternalLink, Search } from "lucide-react"
import { useState, useMemo } from "react"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"

export function LiveTests() {
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All Clients")

  const { data: rawExps, isLoading } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Brand Name', 'Brand Name (from Brand Name)', 'Launch Date', 'Strategist', 'Developer'],
    filterExtra: '{Test Status} = "Live - Collecting Data"',
    sort: [{ field: 'Launch Date', direction: 'desc' }],
  })

  const { data: rawVariants } = useAirtable('variants', {
    fields: ['Variant Name', 'Traffic %', 'Experiment Name', 'Record ID (from Experiment Name)'],
  })

  const experiments = useMemo(() => (rawExps ?? []).map(r => {
    const client = Array.isArray(r.fields['Brand Name (from Brand Name)'])
      ? (r.fields['Brand Name (from Brand Name)'] as string[])[0]
      : String(r.fields['Brand Name'] ?? '')
    const variants = (rawVariants ?? []).filter(v => {
      const linked = v.fields['Record ID (from Experiment Name)']
      return Array.isArray(linked) ? linked.includes(r.id) : linked === r.id
    })
    return {
      id: r.id,
      name: String(r.fields['Test Description'] ?? ''),
      client,
      launchDate: String(r.fields['Launch Date'] ?? ''),
      strategist: Array.isArray(r.fields['Strategist']) ? (r.fields['Strategist'] as string[]).join(', ') : '',
      variants: variants.map(v => ({
        name: String(v.fields['Variant Name'] ?? 'Variant'),
        trafficPct: Number(v.fields['Traffic %'] ?? 50),
        status: 'Running' as const,
      })),
    }
  }), [rawExps, rawVariants])

  const clients = useMemo(() => ['All Clients', ...Array.from(new Set(experiments.map(e => e.client).filter(Boolean)))], [experiments])

  const filtered = useMemo(() => experiments.filter(e => {
    if (clientFilter !== 'All Clients' && e.client !== clientFilter) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.client.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [experiments, clientFilter, search])

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
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">{v.status}</span>
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
