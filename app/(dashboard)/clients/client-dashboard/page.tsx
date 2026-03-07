'use client'

import { useUser } from '@/contexts/UserContext'
import { ClientDashboardStats } from '@/components/clients/client-dashboard-stats'
import { ClientUpcomingLiveExperiments } from '@/components/clients/client-upcoming-experiments'
import { ClientRecentResults } from '@/components/clients/client-recent-results'
import { ClientTimeline } from '@/components/clients/client-timeline'

export default function ClientCRODashboardPage() {
  const { user } = useUser()
  const clientName = user?.name || 'Client'

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          {clientName} Dashboard
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          The central command for your CRO program. Monitor high-level KPIs including total revenue added, success rates, and active production status.
        </p>
      </div>

      <ClientDashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClientUpcomingLiveExperiments />
        <ClientRecentResults />
      </div>

      <ClientTimeline />
    </>
  )
}
