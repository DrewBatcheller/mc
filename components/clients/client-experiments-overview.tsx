"use client"

import { Fragment, useState, useMemo } from "react"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { ExperimentDetailsModal } from "@/components/experiments/experiment-details-modal"

interface Experiment {
  id: string
  name: string
  description?: string
  status: string
  placement: string
  placementUrl?: string
  hypothesis?: string
  rationale?: string
  primaryGoals?: string[]
  devices?: string
  geos?: string
  launchDate?: string
  endDate?: string
  deployed?: boolean
  whatHappened?: string
  nextSteps?: string
  controlImage?: string
  variantImage?: string
  resultImage?: string
  resultVideo?: string
  revenueAddedMrr?: string
  variantData?: any[]
  revenue: number
}

interface Batch {
  id: string
  batchKey: string
  launchDate: string
  status: string
  experiments: Experiment[]
}

const statusStyles: Record<string, string> = {
  "In Progress": "bg-sky-50 text-sky-700",
  Live: "bg-emerald-50 text-emerald-700",
  Mixed: "bg-amber-50 text-amber-700",
  Successful: "bg-emerald-50 text-emerald-700",
  Unsuccessful: "bg-rose-50 text-rose-700",
  Inconclusive: "bg-amber-50 text-amber-700",
}

function formatMrr(value: number | undefined): string {
  if (value === undefined || value === 0) return "$0"
  if (value >= 1000000) return "$" + (value / 1000000).toFixed(1) + "M"
  if (value >= 1000) return "$" + (value / 1000).toFixed(1) + "K"
  return "$" + value.toLocaleString()
}

function getImageUrl(field: any): string | undefined {
  if (Array.isArray(field) && field.length > 0) {
    return field[0].url || field[0]
  }
  if (typeof field === 'string') return field
  return undefined
}

export function ClientExperimentsOverview() {
  const { data: batches } = useAirtable('batches', {
    fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)'],
  })
  
  const { data: experiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Placement URL', 'Revenue Added (MRR) (Regular Format)', 'Batch (Linked)', 'Hypothesis', 'Rationale', 'Category Primary Goals', 'Devices', 'GEOs', 'Launch Date', 'End Date', 'Deployed', 'Describe what happened & what we learned', 'Next Steps (Action)', 'Variants (Link)', 'Variants', 'Control ImageE', 'Variant ImageE', 'PTA Result Image', 'Post-Test Analysis (Loom)'],
  })

  console.log('[v0] ClientExperimentsOverview - batches:', batches?.length || 0, 'experiments:', experiments?.length || 0)

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null)

  const processedBatches = useMemo(() => {
    if (!batches || !experiments) return []
    
    return batches.map(batch => {
      const batchExperiments = experiments.filter(exp => {
        const linkedBatches = exp.fields['Batch (Linked)'] as string[] | undefined
        return linkedBatches?.includes(batch.id)
      }).map(exp => ({
        id: exp.id,
        name: String(exp.fields['Test Description'] || ''),
        description: String(exp.fields['Test Description'] || ''),
        status: String(exp.fields['Test Status'] || 'Unknown'),
        placement: String(exp.fields['Placement'] || ''),
        placementUrl: String(exp.fields['Placement URL'] || ''),
        hypothesis: String(exp.fields['Hypothesis'] || ''),
        rationale: String(exp.fields['Rationale'] || ''),
        primaryGoals: exp.fields['Category Primary Goals'] ? String(exp.fields['Category Primary Goals']).split(',').map(g => g.trim()) : [],
        devices: String(exp.fields['Devices'] || ''),
        geos: String(exp.fields['GEOs'] || ''),
        launchDate: String(exp.fields['Launch Date'] || ''),
        endDate: String(exp.fields['End Date'] || ''),
        deployed: exp.fields['Deployed'] === true,
        whatHappened: String(exp.fields['Describe what happened & what we learned'] || ''),
        nextSteps: String(exp.fields['Next Steps (Action)'] || ''),
        controlImage: getImageUrl(exp.fields['Control ImageE']),
        variantImage: getImageUrl(exp.fields['Variant ImageE']),
        resultImage: getImageUrl(exp.fields['PTA Result Image']),
        resultVideo: getImageUrl(exp.fields['Post-Test Analysis (Loom)']),
        revenueAddedMrr: formatMrr(typeof exp.fields['Revenue Added (MRR) (Regular Format)'] === 'number' ? exp.fields['Revenue Added (MRR) (Regular Format)'] : 0),
        revenue: typeof exp.fields['Revenue Added (MRR) (Regular Format)'] === 'number' ? exp.fields['Revenue Added (MRR) (Regular Format)'] : 0,
      }))

      return {
        id: batch.id,
        batchKey: String(batch.fields['Batch Key'] || ''),
        launchDate: String(batch.fields['Launch Date'] || ''),
        status: String(batch.fields['All Tests Status'] || 'Pending'),
        experiments: batchExperiments,
      }
    })
  }, [batches, experiments])

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev)
      if (next.has(batchId)) next.delete(batchId)
      else next.add(batchId)
      return next
    })
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {processedBatches.map(batch => (
          <div key={batch.id} className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Batch Header */}
            <button
              onClick={() => toggleBatch(batch.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                {expandedBatches.has(batch.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-foreground">{batch.batchKey}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{batch.launchDate} • {batch.experiments.length} test{batch.experiments.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex px-2 py-1 rounded text-xs font-medium border', statusStyles[batch.status] || 'bg-muted text-muted-foreground border-border')}>
                  {batch.status}
                </span>
              </div>
            </button>

            {/* Batch Content */}
            {expandedBatches.has(batch.id) && (
              <div className="border-t border-border px-5 py-3 bg-accent/30 flex flex-col gap-2">
                {batch.experiments.map(exp => (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExperiment(exp)}
                    className="p-3 rounded-lg bg-card border border-border hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{exp.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{exp.placement}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {exp.revenue > 0 && (
                          <span className="text-xs font-semibold text-emerald-600">${(exp.revenue / 1000).toFixed(1)}K</span>
                        )}
                        <span className={cn('inline-flex px-1.5 py-0.5 rounded text-xs font-medium border', statusStyles[exp.status] || 'bg-muted text-muted-foreground border-border')}>
                          {exp.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedExperiment && (
        <ExperimentDetailsModal
          isOpen={!!selectedExperiment}
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
        />
      )}
    </>
  )
}
