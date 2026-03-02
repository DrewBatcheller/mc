'use client'

import { FileText, Calendar } from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { ContentCard } from '@/components/shared/content-card'
import { useMemo, useState } from 'react'
import { ExperimentDetailsModal } from '@/components/experiments/experiment-details-modal'
import { Badge } from '@/components/ui/badge'

export function ClientUpcomingExperiments() {
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null)
  
  const { data: experiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Launch Date', 'End Date', 'Hypothesis', 'Rationale', 'Placement', 'Placement URL', 'Devices', 'GEOs', 'Revenue Added (MRR) (Regular Format)', 'Deployed', 'Describe what happened & what we learned', 'Next Steps (Action)', 'Control ImageE', 'Variant ImageE', 'PTA Result Image', 'Post-Test Analysis (Loom)', 'Category Primary Goals', 'Record ID (from Brand Name)'],
  })

  const upcomingExperiments = useMemo(() => {
    if (!experiments) {
      return []
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const filtered = experiments.filter(e => {
      const status = String(e.fields['Test Status'] || '')
      const launchDate = e.fields['Launch Date'] ? new Date(String(e.fields['Launch Date'])) : null
      
      if (launchDate) {
        launchDate.setHours(0, 0, 0, 0)
      }
      
      const isPending = status === 'Pending'
      const isInProgress = status.includes('In Progress')
      const isLive = status.includes('Live')
      const hasFutureLaunchDate = launchDate && launchDate > today
      
      const isUpcoming = isPending || isInProgress || isLive || hasFutureLaunchDate
      return isUpcoming
    })
    
    return filtered.slice(0, 5)
  }, [experiments])

  function getImageUrl(field: any): string | undefined {
    if (Array.isArray(field) && field.length > 0) {
      return field[0].url || field[0]
    }
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
    const experimentData = {
      name: String(exp.fields['Test Description'] || ''),
      description: String(exp.fields['Test Description'] || ''),
      status: String(exp.fields['Test Status'] || ''),
      placement: String(exp.fields['Placement'] || ''),
      placementUrl: String(exp.fields['Placement URL'] || ''),
      devices: String(exp.fields['Devices'] || ''),
      geos: String(exp.fields['GEOs'] || ''),
      hypothesis: String(exp.fields['Hypothesis'] || ''),
      rationale: String(exp.fields['Rationale'] || ''),
      primaryGoals: exp.fields['Category Primary Goals'] ? String(exp.fields['Category Primary Goals']).split(',').map(g => g.trim()) : [],
      revenueAddedMrr: formatMrr(typeof exp.fields['Revenue Added (MRR) (Regular Format)'] === 'number' ? exp.fields['Revenue Added (MRR) (Regular Format)'] : 0),
      deployed: exp.fields['Deployed'] === true,
      launchDate: String(exp.fields['Launch Date'] || ''),
      endDate: String(exp.fields['End Date'] || ''),
      whatHappened: String(exp.fields['Describe what happened & what we learned'] || ''),
      nextSteps: String(exp.fields['Next Steps (Action)'] || ''),
      controlImage: getImageUrl(exp.fields['Control ImageE']),
      variantImage: getImageUrl(exp.fields['Variant ImageE']),
      resultImage: getImageUrl(exp.fields['PTA Result Image']),
      resultVideo: getImageUrl(exp.fields['Post-Test Analysis (Loom)']),
      variants: "0",
      revenue: "$0",
    }
    setSelectedExperiment(experimentData)
  }

  return (
    <>
      <ContentCard title="Upcoming Experiments">
        <div className="px-5 py-10 flex flex-col items-center justify-center gap-3">
          {upcomingExperiments.length === 0 ? (
            <>
              <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] text-muted-foreground">
                No upcoming experiments
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {upcomingExperiments.map(exp => {
                const hypothesis = String(exp.fields['Hypothesis'] || '')
                const rationale = String(exp.fields['Rationale'] || '')
                const combined = [hypothesis, rationale].filter(Boolean).join(' • ')
                const status = String(exp.fields['Test Status'] || '')
                
                return (
                  <button
                    key={exp.id}
                    onClick={() => handleExperimentClick(exp)}
                    className="p-4 border border-border rounded-lg hover:border-foreground/30 hover:bg-accent/50 transition-all text-left"
                  >
                    {/* Header with title and status badge */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-medium text-sm text-foreground line-clamp-2">{exp.fields['Test Description']}</h4>
                      <Badge variant="outline" className="whitespace-nowrap text-[11px]">{status}</Badge>
                    </div>

                    {/* Hypothesis and Rationale combined */}
                    {combined && (
                      <p className="text-[12px] text-muted-foreground mb-2 line-clamp-2">{combined}</p>
                    )}

                    {/* Footer with dates */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
                      {exp.fields['Launch Date'] && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Launch: {String(exp.fields['Launch Date'])}</span>
                        </div>
                      )}
                      {exp.fields['End Date'] && (
                        <span className="text-right">End: {String(exp.fields['End Date'])}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </ContentCard>

      {/* Experiment Details Modal */}
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
