"use client"

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContentCard } from '@/components/shared/content-card'
import { ExperimentDetailsModal } from '@/components/experiments/experiment-details-modal'

type TestStatus = 'Successful' | 'Inconclusive' | 'Unsuccessful'

interface RecentResult {
  name: string
  status: TestStatus
  placement: string
  endDate: string
  revenueAdded: number
  client?: string
  launchDate?: string
  rationale?: string
  goals?: string[]
  device?: string
  geos?: string
  deployed?: boolean
  controlLabel?: string
  variantLabel?: string
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

const results: RecentResult[] = [
  {
    name: 'OTP Under ATC (L/F)',
    status: 'Successful',
    placement: 'Landing Page (Under ATC)',
    endDate: 'January 10, 2026',
    revenueAdded: 45000,
    client: 'Vita Hustle',
    launchDate: 'December 27, 2025',
    rationale: 'Testing one-time purchase offers directly under the add-to-cart button to increase conversion rates on landing pages.',
    goals: ['CVR', 'AOV'],
    device: 'All Devices',
    geos: 'US, CA',
    deployed: true,
    controlLabel: 'Standard ATC',
    variantLabel: 'OTP Below ATC',
  },
  {
    name: 'Vertical Stack Buybox & Gamification',
    status: 'Inconclusive',
    placement: 'PDP Buybox / Flavor Selection Area',
    endDate: 'February 7, 2026',
    revenueAdded: 0,
    client: 'Vita Hustle',
    launchDate: 'January 24, 2026',
    rationale: 'Restructuring the buybox with gamification elements to improve engagement and conversion on product detail pages.',
    goals: ['CVR', 'ATC'],
    device: 'All Devices',
    geos: 'US',
    deployed: false,
    controlLabel: 'Horizontal Buybox',
    variantLabel: 'Vertical Stack + Gamification',
  },
  {
    name: 'Checkout UVP Tests',
    status: 'Unsuccessful',
    placement: 'Checkout Page',
    endDate: 'December 4, 2025',
    revenueAdded: 0,
    client: 'Vita Hustle',
    launchDate: 'November 20, 2025',
    rationale: 'Adding unique value propositions at checkout to reduce cart abandonment and increase completion rates.',
    goals: ['CVR'],
    device: 'All Devices',
    geos: 'US, CA',
    deployed: false,
    controlLabel: 'Standard Checkout',
    variantLabel: 'UVP-Enhanced Checkout',
  },
  {
    name: 'Free Shipping Banner',
    status: 'Successful',
    placement: 'Header',
    endDate: 'January 25, 2026',
    revenueAdded: 22000,
    client: 'Vita Hustle',
    launchDate: 'January 11, 2026',
    rationale: 'Promoting free shipping threshold in a prominent header banner to encourage larger cart sizes and increase average order value.',
    goals: ['AOV', 'CVR'],
    device: 'All Devices',
    geos: 'US, CA, UK',
    deployed: true,
    controlLabel: 'No Banner',
    variantLabel: 'Free Shipping Banner',
  },
]

const RESULTS_PER_PAGE = 2

function formatRevenue(n: number) {
  if (n === 0) return '$0.0K'
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

// Convert RecentResult to Experiment interface for modal compatibility
function convertResultToExperiment(result: RecentResult): any {
  return {
    name: result.name,
    description: result.rationale || '',
    status: result.status,
    placement: result.placement,
    devices: result.device || 'All Devices',
    geos: result.geos || 'US',
    variants: "2",
    revenue: formatRevenue(result.revenueAdded),
    primaryGoals: result.goals || [],
    rationale: result.rationale || '',
    revenueAddedMrr: formatRevenue(result.revenueAdded),
    deployed: result.deployed || false,
    launchDate: result.launchDate || '',
    endDate: result.endDate,
  }
}

export function ClientRecentResults() {
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedResult, setSelectedResult] = useState<RecentResult | null>(null)
  
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE)
  const paginatedResults = useMemo(() => {
    const start = currentPage * RESULTS_PER_PAGE
    return results.slice(start, start + RESULTS_PER_PAGE)
  }, [currentPage])

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
  }

  return (
    <ContentCard title="Recent Experiment Results">
      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        {paginatedResults.map((result) => (
          <div
            key={result.name}
            onClick={() => setSelectedResult(result)}
            className={cn(
              'rounded-lg border border-border p-4 border-l-[3px] flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all',
              cardBorder[result.status]
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-semibold text-foreground">{result.name}</span>
              {result.revenueAdded > 0 && (
                <span className="text-[12px] font-semibold text-emerald-600 whitespace-nowrap">
                  {formatRevenue(result.revenueAdded)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={cn(
                    'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border',
                    statusStyles[result.status]
                  )}
                >
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
      
      {/* Pagination */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">
          {currentPage + 1} of {totalPages || 1}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Result Detail Modal */}
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
