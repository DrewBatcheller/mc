'use client'

import { FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { ContentCard } from '@/components/shared/content-card'
import { useMemo, useState } from 'react'
import { ExperimentDetailsModal } from '@/components/experiments/experiment-details-modal'
import { cn } from '@/lib/utils'

const RESULTS_PER_PAGE = 2

type ExperimentStatus = 'Pending' | 'In Progress - Design' | 'In Progress - Development' | 'In Progress - QA' | 'Live - Collecting Data' | string

function getStatusStyle(status: string): string {
  if (status === 'Pending') return 'bg-amber-50 border-amber-200 text-amber-700'
  if (status.includes('In Progress')) return 'bg-blue-50 border-blue-200 text-blue-700'
  if (status.includes('Live')) return 'bg-blue-50 border-blue-200 text-blue-700'
  return 'bg-gray-50 border-gray-200 text-gray-700'
}

function getCardBorder(status: string): string {
  if (status === 'Pending') return 'border-l-amber-400'
  if (status.includes('In Progress')) return 'border-l-blue-400'
  if (status.includes('Live')) return 'border-l-blue-400'
  return 'border-l-gray-400'
}

export function ClientUpcomingLiveExperiments({ clientId }: { clientId?: string }) {
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(0)

  const clientFilter = clientId
    ? `{Record ID (from Brand Name)} = "${clientId}"`
    : undefined

  const { data: experiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Launch Date', 'End Date', 'Hypothesis', 'Rationale', 'Placement', 'Placement URL', 'Devices', 'GEOs', 'Revenue Added (MRR) (Regular Format)', 'Deployed', 'Describe what happened & what we learned', 'Next Steps (Action)', 'Control Image', 'Variant Image', 'PTA Result Image', 'Post-Test Analysis (Loom)', 'Category Primary Goals', 'Record ID (from Brand Name)'],
    filterExtra: clientFilter,
  })

  const upcomingExperiments = useMemo(() => {
    if (!experiments) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return experiments.filter(e => {
      const status = String(e.fields['Test Status'] || '')
      const launchDate = e.fields['Launch Date'] ? new Date(String(e.fields['Launch Date'])) : null
      if (launchDate) launchDate.setHours(0, 0, 0, 0)

      return status === 'Pending' || status.includes('In Progress') || status.includes('Live') || (launchDate && launchDate > today)
    })
  }, [experiments])

  const totalPages = Math.ceil(upcomingExperiments.length / RESULTS_PER_PAGE)
  const paginatedExperiments = useMemo(() => {
    const start = currentPage * RESULTS_PER_PAGE
    return upcomingExperiments.slice(start, start + RESULTS_PER_PAGE)
  }, [currentPage, upcomingExperiments])

  function getImageUrl(field: any): string | undefined {
    if (Array.isArray(field) && field.length > 0) return field[0].url || field[0]
    if (typeof field === 'string') return field
    return undefined
  }

  function formatMrr(value: number | undefined): string {
    if (value === undefined || value === 0) return "$0"
    if (value >= 1000000) return "$" + (value / 1000000).toFixed(1) + "M"
    if (value >= 1000) return "$" + (value / 1000).toFixed(1) + "K"
    return "$" + value.toLocaleString()
  }

  function handleExperimentClick(exp: any) {
    setSelectedExperiment({
      name: String(exp.fields['Test Description'] || ''),
      description: String(exp.fields['Test Description'] || ''),
      status: String(exp.fields['Test Status'] || ''),
      placement: String(exp.fields['Placement'] || ''),
      placementUrl: String(exp.fields['Placement URL'] || ''),
      devices: String(exp.fields['Devices'] || ''),
      geos: String(exp.fields['GEOs'] || ''),
      hypothesis: String(exp.fields['Hypothesis'] || ''),
      rationale: String(exp.fields['Rationale'] || ''),
      primaryGoals: exp.fields['Category Primary Goals'] ? String(exp.fields['Category Primary Goals']).split(',').map((g: string) => g.trim()) : [],
      revenueAddedMrr: formatMrr(typeof exp.fields['Revenue Added (MRR) (Regular Format)'] === 'number' ? exp.fields['Revenue Added (MRR) (Regular Format)'] : 0),
      deployed: exp.fields['Deployed'] === true,
      launchDate: String(exp.fields['Launch Date'] || ''),
      endDate: String(exp.fields['End Date'] || ''),
      whatHappened: String(exp.fields['Describe what happened & what we learned'] || ''),
      nextSteps: String(exp.fields['Next Steps (Action)'] || ''),
      controlImage: getImageUrl(exp.fields['Control Image']),
      variantImage: getImageUrl(exp.fields['Variant Image']),
      resultImage: getImageUrl(exp.fields['PTA Result Image']),
      resultVideo: getImageUrl(exp.fields['Post-Test Analysis (Loom)']),
      variants: "0",
      revenue: "$0",
    })
  }

  return (
    <>
      <ContentCard title="Upcoming & Live Experiments">
        <div className="flex flex-col">
          {upcomingExperiments.length === 0 ? (
            <div className="px-5 py-10 flex flex-col items-center justify-center gap-3">
              <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] text-muted-foreground">No upcoming experiments</p>
            </div>
          ) : (
            <>
              <div className="flex-1 px-5 py-4 flex flex-col gap-3">
                {paginatedExperiments.map(exp => {
                  const status = String(exp.fields['Test Status'] || '')
                  return (
                    <div
                      key={exp.id}
                      onClick={() => handleExperimentClick(exp)}
                      className={cn(
                        'rounded-lg border border-border border-l-[3px] p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all',
                        getCardBorder(status)
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-semibold text-foreground flex-1">{String(exp.fields['Test Description'] || '')}</span>
                        <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap', getStatusStyle(status))}>
                          {status}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-[12px]">
                        {!!exp.fields['Hypothesis'] && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-muted-foreground shrink-0">Hypothesis:</span>
                            <span className="text-foreground line-clamp-1">{String(exp.fields['Hypothesis'] || '')}</span>
                          </div>
                        )}
                        {!!exp.fields['Rationale'] && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-muted-foreground shrink-0">Rationale:</span>
                            <span className="text-foreground line-clamp-1">{String(exp.fields['Rationale'] || '')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Launch:</span>
                            <span className="text-foreground font-medium">{String(exp.fields['Launch Date'] || '')}</span>
                          </div>
                          {!!exp.fields['End Date'] && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">End:</span>
                              <span className="text-foreground font-medium">{String(exp.fields['End Date'])}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">
                  {upcomingExperiments.length > 0 ? currentPage + 1 : 0} of {totalPages || 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </ContentCard>

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
