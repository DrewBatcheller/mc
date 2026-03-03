"use client"

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAirtable } from '@/hooks/use-airtable'
import { ContentCard } from '@/components/shared/content-card'
import { ExperimentDetailsModal } from '@/components/experiments/experiment-details-modal'

type TestStatus = 'Successful' | 'Inconclusive' | 'Unsuccessful'

interface RecentResult {
  id: string
  name: string
  status: TestStatus
  placement: string
  placementUrl?: string
  endDate: string
  revenueAdded: number
  launchDate?: string
  rationale?: string
  hypothesis?: string
  goals?: string[]
  devices?: string
  geos?: string
  deployed?: boolean
  whatHappened?: string
  nextSteps?: string
  controlImage?: string
  variantImage?: string
  resultImage?: string
  resultVideo?: string
}

const statusStyles: Record<TestStatus, string> = {
  Successful: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Unsuccessful: 'bg-rose-50 border-rose-200 text-rose-700',
  Inconclusive: 'bg-amber-50 border-amber-200 text-amber-700',
}

const cardBorder: Record<TestStatus, string> = {
  Successful: 'border-l-emerald-400',
  Unsuccessful: 'border-l-rose-400',
  Inconclusive: 'border-l-amber-400',
}

const RESULTS_PER_PAGE = 2

function formatRevenue(n: number) {
  if (n === 0) return '$0.0K'
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function formatMrr(value: number | undefined): string {
  if (value === undefined || value === 0) return "$0"
  if (value >= 1000000) return "$" + (value / 1000000).toFixed(1) + "M"
  if (value >= 1000) return "$" + (value / 1000).toFixed(1) + "K"
  return "$" + value.toLocaleString()
}

function getImageUrl(field: any): string | undefined {
  if (Array.isArray(field) && field.length > 0) return field[0].url || field[0]
  if (typeof field === 'string') return field
  return undefined
}

function convertResultToExperiment(result: RecentResult): any {
  return {
    name: result.name,
    description: result.rationale || '',
    status: result.status,
    placement: result.placement,
    placementUrl: result.placementUrl,
    devices: result.devices || 'All Devices',
    geos: result.geos || 'US',
    primaryGoals: result.goals || [],
    hypothesis: result.hypothesis || '',
    rationale: result.rationale || '',
    revenueAddedMrr: formatMrr(result.revenueAdded),
    deployed: result.deployed,
    launchDate: result.launchDate || '',
    endDate: result.endDate,
    whatHappened: result.whatHappened || '',
    nextSteps: result.nextSteps || '',
    controlImage: result.controlImage,
    variantImage: result.variantImage,
    resultImage: result.resultImage,
    resultVideo: result.resultVideo,
  }
}

export function ClientRecentResults({ clientId }: { clientId?: string }) {
  const clientFilter = clientId
    ? `{Record ID (from Brand Name)} = "${clientId}"`
    : undefined

  const { data: experiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Placement', 'Placement URL', 'End Date', 'Revenue Added (MRR) (Regular Format)', 'Launch Date', 'Hypothesis', 'Rationale', 'Category Primary Goals', 'Devices', 'GEOs', 'Deployed', 'Describe what happened & what we learned', 'Next Steps (Action)', 'Control ImageE', 'Variant ImageE', 'PTA Result Image', 'Post-Test Analysis (Loom)'],
    filterExtra: clientFilter,
  })

  const [currentPage, setCurrentPage] = useState(0)
  const [selectedResult, setSelectedResult] = useState<RecentResult | null>(null)

  const results = useMemo(() => {
    if (!experiments) return []
    return experiments
      .filter(e => e.fields['Test Status'] && ['Successful', 'Unsuccessful', 'Inconclusive'].includes(String(e.fields['Test Status'])))
      .map(e => ({
        id: e.id,
        name: String(e.fields['Test Description'] || ''),
        status: String(e.fields['Test Status']) as TestStatus,
        placement: String(e.fields['Placement'] || ''),
        placementUrl: String(e.fields['Placement URL'] || ''),
        endDate: String(e.fields['End Date'] || ''),
        revenueAdded: typeof e.fields['Revenue Added (MRR) (Regular Format)'] === 'number' ? e.fields['Revenue Added (MRR) (Regular Format)'] : 0,
        launchDate: String(e.fields['Launch Date'] || ''),
        hypothesis: String(e.fields['Hypothesis'] || ''),
        rationale: String(e.fields['Rationale'] || ''),
        goals: e.fields['Category Primary Goals'] ? String(e.fields['Category Primary Goals']).split(',').map((g: string) => g.trim()) : [],
        devices: String(e.fields['Devices'] || ''),
        geos: String(e.fields['GEOs'] || ''),
        deployed: e.fields['Deployed'] === true,
        whatHappened: String(e.fields['Describe what happened & what we learned'] || ''),
        nextSteps: String(e.fields['Next Steps (Action)'] || ''),
        controlImage: getImageUrl(e.fields['Control ImageE']),
        variantImage: getImageUrl(e.fields['Variant ImageE']),
        resultImage: getImageUrl(e.fields['PTA Result Image']),
        resultVideo: getImageUrl(e.fields['Post-Test Analysis (Loom)']),
      }))
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  }, [experiments])

  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE)
  const paginatedResults = useMemo(() => {
    const start = currentPage * RESULTS_PER_PAGE
    return results.slice(start, start + RESULTS_PER_PAGE)
  }, [currentPage, results])

  return (
    <ContentCard title="Recent Experiment Results">
      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        {paginatedResults.map((result) => (
          <div
            key={result.id}
            onClick={() => setSelectedResult(result)}
            className={cn(
              'rounded-lg border border-border p-4 border-l-[3px] flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all',
              cardBorder[result.status]
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-semibold text-foreground">{result.name}</span>
              {result.status === 'Successful' && result.revenueAdded > 0 && (
                <span className="text-[12px] font-semibold text-emerald-600 whitespace-nowrap">
                  {formatRevenue(result.revenueAdded)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Status:</span>
                <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border', statusStyles[result.status])}>
                  {result.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Placement:</span>
                <span className="text-foreground">{result.placement}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">End Date:</span>
                <span className="text-foreground font-medium">{result.endDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">
          {results.length > 0 ? currentPage + 1 : 0} of {totalPages || 1}
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

      {selectedResult && (
        <ExperimentDetailsModal
          isOpen={!!selectedResult}
          experiment={convertResultToExperiment(selectedResult)}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </ContentCard>
  )
}
