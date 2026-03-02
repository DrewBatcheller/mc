'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useAirtable } from '@/hooks/use-airtable'
import { ExperimentDetailsModal } from '@/components/experiments/experiment-details-modal'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'

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
}

interface Batch {
  id: string
  launchDate: string
  finishDate: string
  status: string
  tests: number
  experiments: Experiment[]
}

const statusStyles: Record<string, string> = {
  'Pending': 'bg-accent text-muted-foreground',
  'In Progress': 'bg-sky-50 text-sky-700',
  'Live': 'bg-emerald-50 text-emerald-700',
  'Completed': 'bg-emerald-50 text-emerald-700',
}

const mapBatchStatus = (status: string): string => {
  const s = String(status || '').toLowerCase()
  if (s.includes('live') || s.includes('live - collecting')) return 'Live'
  if (s.includes('successful') || s.includes('unsuccessful') || s.includes('inconclusive') || s.includes('blocked')) return 'Completed'
  if (s.includes('in progress')) return 'In Progress'
  return 'Pending'
}

export function ClientExperimentsOverview() {
  const { user } = useUser()
  const [search, setSearch] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch batches for this client
  const { data: rawBatches } = useAirtable('batches', {
    fields: ['Batch Key', 'Brand Name', 'Launch Date', 'PTA (Scheduled Finish)', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)'],
    filterByFormula: user?.role === 'client' ? `{Brand Name} = "${user.name}"` : undefined,
    sort: [{ field: 'Launch Date', direction: 'desc' }],
  })

  // Fetch experiments
  const { data: rawExperiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Batch', 'Placement', 'Placement URL', 'Devices', 'GEOs', 'Variants (Link)', 'Revenue Added (MRR) (Regular Format)', 'End Date'],
  })

  // Transform into batches with nested experiments
  const batches = useMemo(() => {
    if (!rawBatches) return []
    
    return rawBatches.map(b => {
      const batchKey = String(b.fields['Batch Key'] ?? '')
      const launchDate = b.fields['Launch Date'] 
        ? new Date(String(b.fields['Launch Date'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
      const finishDate = b.fields['PTA (Scheduled Finish)']
        ? new Date(String(b.fields['PTA (Scheduled Finish)'])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
      const status = String(b.fields['All Tests Status'] ?? 'Pending')
      const linkedTests = Array.isArray(b.fields['Linked Test Names']) ? b.fields['Linked Test Names'] : []

      // Find experiments for this batch
      const batchExperiments = (rawExperiments ?? [])
        .filter(exp => {
          const expBatches = exp.fields['Batch']
          if (Array.isArray(expBatches)) {
            return expBatches.includes(batchKey)
          }
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
          variants: exp.fields['Variants (Link)'] 
            ? (Array.isArray(exp.fields['Variants (Link)']) ? exp.fields['Variants (Link)'].length : 1).toString()
            : '-',
          revenue: exp.fields['Revenue Added (MRR) (Regular Format)'] ? String(exp.fields['Revenue Added (MRR) (Regular Format)']) : '-',
        }))

      return {
        id: b.id,
        launchDate,
        finishDate,
        status,
        tests: linkedTests.length,
        experiments: batchExperiments,
      }
    })
  }, [rawBatches, rawExperiments])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return batches
    const q = search.toLowerCase()
    return batches.filter(b => 
      b.launchDate.toLowerCase().includes(q) ||
      b.experiments.some(e => e.name.toLowerCase().includes(q))
    )
  }, [batches, search])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Experiment Batches</h1>
        <p className="text-sm text-muted-foreground mt-1">View all your experiment batches and their associated tests</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search batches, experiments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Launch Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Finish Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tests</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((batch, idx) => {
              const isExpanded = expandedIdx === idx
              return (
                <div key={batch.id} className="contents">
                  <tr 
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      {batch.experiments.length > 0 && (
                        isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3">{batch.launchDate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{batch.finishDate}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded', statusStyles[mapBatchStatus(batch.status)])}>
                        {mapBatchStatus(batch.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{batch.tests}</td>
                  </tr>

                  {/* Nested experiments table */}
                  {isExpanded && batch.experiments.length > 0 && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="bg-muted/30 border-t border-border">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium">Experiment</th>
                                <th className="px-4 py-2 text-left font-medium">Placement</th>
                                <th className="px-4 py-2 text-left font-medium">Devices</th>
                                <th className="px-4 py-2 text-left font-medium">GEOs</th>
                                <th className="px-4 py-2 text-left font-medium">Variants</th>
                                <th className="px-4 py-2 text-left font-medium">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {batch.experiments.map((exp) => (
                                <tr 
                                  key={exp.id}
                                  onClick={() => { setSelectedExperiment(exp); setIsModalOpen(true) }}
                                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                                >
                                  <td className="px-4 py-2">{exp.name}</td>
                                  <td className="px-4 py-2">
                                    {exp.placementUrl ? (
                                      <a href={exp.placementUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {exp.placement}
                                      </a>
                                    ) : (
                                      exp.placement
                                    )}
                                  </td>
                                  <td className="px-4 py-2">{exp.devices}</td>
                                  <td className="px-4 py-2">{exp.geos}</td>
                                  <td className="px-4 py-2">{exp.variants}</td>
                                  <td className="px-4 py-2 font-medium">{exp.revenue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </div>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No batches found
          </div>
        )}
      </div>

      {/* Modal */}
      <ExperimentDetailsModal 
        isOpen={isModalOpen}
        experiment={selectedExperiment}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
