'use client'

import { FileText } from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { ContentCard } from '@/components/shared/content-card'
import { useMemo } from 'react'

export function ClientUpcomingExperiments() {
  const { data: experiments } = useAirtable('experiments', {
    fields: ['Test Description', 'Test Status', 'Launch Date'],
  })

  const upcomingExperiments = useMemo(() => {
    if (!experiments) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return experiments
      .filter(e => {
        // Include experiments that are Pending, In Progress (any variant), or have a future launch date
        const status = String(e.fields['Test Status'] || '')
        const launchDate = e.fields['Launch Date'] ? new Date(String(e.fields['Launch Date'])) : null
        
        if (launchDate) {
          launchDate.setHours(0, 0, 0, 0)
        }
        
        const isPending = status === 'Pending'
        const isInProgress = status.includes('In Progress')
        const hasFutureLaunchDate = launchDate && launchDate > today
        
        return isPending || isInProgress || hasFutureLaunchDate
      })
      .slice(0, 5)
  }, [experiments])

  return (
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
            {upcomingExperiments.map(exp => (
              <div key={exp.id} className="p-3 border border-border rounded-lg">
                <p className="font-medium text-sm">{exp.fields['Test Description']}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-muted-foreground">{exp.fields['Test Status']}</p>
                  {exp.fields['Launch Date'] && (
                    <p className="text-xs text-muted-foreground">Launch: {String(exp.fields['Launch Date'])}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ContentCard>
  )
}
