'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useAirtable } from '@/hooks/use-airtable'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Experiment {
  id: string
  name: string
  status: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: string
  revenue: string
  endDate?: string
}

interface Batch {
  id: string
  launchDate: string
  endDate: string
  status: string
  tests: number
  revenue: string
  experiments: Experiment[]
}

const statusStyles: Record<string, string> = {
  "In Progress": "bg-sky-50 text-sky-700",
  "Live - Collecting Data": "bg-emerald-50 text-emerald-700",
  Successful: "bg-emerald-50 text-emerald-700",
  Unsuccessful: "bg-rose-50 text-rose-700",
  Inconclusive: "bg-amber-50 text-amber-700",
  Pending: "bg-accent text-muted-foreground",
}

const mapBatchStatus = (status: string): string => {
  const s = status?.toLowerCase() || ''
  if (s.includes('live')) return 'Live - Collecting Data'
  if (s.includes('successful')) return 'Successful'
  if (s.includes('unsuccessful')) return 'Unsuccessful'
  if (s.includes('inconclusive')) return 'Inconclusive'
  return 'Pending'
}

export function ClientExperimentsOverview() {
  const { user } = useUser()
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Fetch batches for this client
  const { data: rawBatches } = useAirtable('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)'],
    filterByFormula: user?.role === 'client' ? `{Brand Name} = "${user.name}"` : undefined,
    sort: [{ field: 'Launch Date', direction: 'desc' }],
  })

  // Fetch all experiments
  const { data: rawExperiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Batch', 'Placement', 'Placement URL', 'Devices', 'GEOs', 'Variants', 'Revenue Added (MRR) (Regular Format)', 'End Date'],
  })

  // Transform batches with linked experiments
  const batches = useMemo(() => {
    if (!rawBatches) return []
    
    return rawBatches.map(batchRecord => {
      const batchKey = String(batchRecord.fields['Batch Key'] ?? '')
      const launchDate = batchRecord.fields['Launch Date'] 
        ? new Date(String(batchRecord.fields['Launch Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
      const status = String(batchRecord.fields['All Tests Status'] ?? 'Pending')
      const revenue = String(batchRecord.fields['Revenue Added (MRR)'] ?? '$0')
      const linkedTests = Array.isArray(batchRecord.fields['Linked Test Names']) ? batchRecord.fields['Linked Test Names'] : []
      
      // Find experiments linked to this batch
      const batchExperiments = (rawExperiments ?? [])
        .filter(exp => {
          const expBatches = exp.fields['Batch']
          if (Array.isArray(expBatches)) return expBatches.includes(batchKey)
          return String(expBatches ?? '') === batchKey
        })
        .map(exp => ({
          id: exp.id,
          name: String(exp.fields['Test Description'] ?? ''),
          status: String(exp.fields['Test Status'] ?? 'Pending'),
          placement: String(exp.fields['Placement'] ?? ''),
          placementUrl: exp.fields['Placement URL'] ? String(exp.fields['Placement URL']) : undefined,
          devices: String(exp.fields['Devices'] ?? ''),
          geos: String(exp.fields['GEOs'] ?? ''),
          variants: String(exp.fields['Variants'] ?? '-'),
          revenue: exp.fields['Revenue Added (MRR) (Regular Format)'] ? String(exp.fields['Revenue Added (MRR) (Regular Format)']) : '-',
          endDate: exp.fields['End Date'] ? String(exp.fields['End Date']) : undefined,
        }))

      return {
        id: batchRecord.id,
        launchDate,
        endDate: '', // Batches don't have End Date
        status,
        tests: linkedTests.length,
        revenue,
        experiments: batchExperiments,
      }
    })
  }, [rawBatches, rawExperiments])

  const filteredBatches = useMemo(() => {
    if (!search) return batches
    const q = search.toLowerCase()
    return batches.filter(b => 
      b.launchDate.toLowerCase().includes(q) ||
      b.experiments.some(e => e.name.toLowerCase().includes(q))
    )
  }, [batches, search])

  const isExpanded = (batchId: string) => expandedBatchId === batchId

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search batches or experiments..."
          className="flex-1 px-3 py-2 text-[13px] border border-border rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-accent/30">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-4 py-3 text-[13px] font-medium text-left">Launch Date</th>
              <th className="px-4 py-3 text-[13px] font-medium text-left">Status</th>
              <th className="px-4 py-3 text-[13px] font-medium text-left">Tests</th>
              <th className="px-4 py-3 text-[13px] font-medium text-left">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.map(batch => (
              <tbody key={batch.id}>
                <tr 
                  onClick={() => setExpandedBatchId(isExpanded(batch.id) ? null : batch.id)}
                  className="border-b border-border hover:bg-accent/20 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3">
                    {isExpanded(batch.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium">{batch.launchDate}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[12px] font-medium px-2.5 py-1 rounded-md",
                      statusStyles[mapBatchStatus(batch.status)] || "bg-accent"
                    )}>
                      {mapBatchStatus(batch.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]">{batch.tests}</td>
                  <td className="px-4 py-3 text-[13px] font-medium">{batch.revenue}</td>
                </tr>

                {/* Nested experiments table */}
                {isExpanded(batch.id) && batch.experiments.length > 0 && (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <table className="w-full">
                        <thead className="border-t border-border bg-accent/10">
                          <tr>
                            <th className="px-8 py-2 text-[12px] font-medium text-left">Experiment</th>
                            <th className="px-4 py-2 text-[12px] font-medium text-left">Status</th>
                            <th className="px-4 py-2 text-[12px] font-medium text-left">Placement</th>
                            <th className="px-4 py-2 text-[12px] font-medium text-left">Devices</th>
                            <th className="px-4 py-2 text-[12px] font-medium text-left">GEOs</th>
                            <th className="px-4 py-2 text-[12px] font-medium text-left">Variants</th>
                            <th className="px-4 py-2 text-[12px] font-medium text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.experiments.map(exp => (
                            <tr key={exp.id} className="border-t border-border/50 hover:bg-accent/10">
                              <td className="px-8 py-3 text-[12px]">{exp.name}</td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "text-[11px] font-medium px-2 py-1 rounded",
                                  statusStyles[exp.status] || "bg-accent"
                                )}>
                                  {exp.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[12px]">{exp.placement}</td>
                              <td className="px-4 py-3 text-[12px]">{exp.devices}</td>
                              <td className="px-4 py-3 text-[12px]">{exp.geos}</td>
                              <td className="px-4 py-3 text-[12px]">{exp.variants}</td>
                              <td className="px-4 py-3 text-[12px] text-right font-medium">{exp.revenue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}

                {isExpanded(batch.id) && batch.experiments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                      No experiments in this batch
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </tbody>
        </table>

        {filteredBatches.length === 0 && (
          <div className="p-8 text-center text-[13px] text-muted-foreground">
            No batches found
          </div>
        )}
      </div>
    </div>
  )
}
