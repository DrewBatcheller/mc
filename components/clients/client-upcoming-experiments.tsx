'use client'

import { FileText } from 'lucide-react'
import { ContentCard } from '@/components/shared/content-card'

export function ClientUpcomingExperiments() {
  const experiments: any[] = []

  return (
    <ContentCard title="Upcoming Experiments">
      <div className="px-5 py-10 flex flex-col items-center justify-center gap-3">
        {experiments.length === 0 ? (
          <>
            <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-[13px] text-muted-foreground">
              No records exist or match the current filters.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {/* Future experiment items would go here */}
          </div>
        )}
      </div>
    </ContentCard>
  )
}
