'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { StatCards } from "@/components/dashboard/stat-cards"
import { RecentExperiments } from "@/components/dashboard/recent-experiments"
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks"
import { ActivityChart } from "@/components/dashboard/activity-chart"

export default function DashboardPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return
    
    // Team members should go to their team dashboard
    if (user.role === 'team') {
      router.replace('/team')
      return
    }
    
    // Sales should go to sales overview
    if (user.role === 'sales') {
      router.replace('/sales/overview')
      return
    }
    
    // Clients should go to their dashboard
    if (user.role === 'client') {
      router.replace('/clients/client-dashboard')
      return
    }
    
    // Management and Strategy see the main dashboard (this page)
  }, [user, isLoading, router])

  // Only show dashboard content for management/strategy users
  if (user?.role === 'team' || user?.role === 'sales' || user?.role === 'client') {
    return null
  }

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Overview of your experiments, clients, and business metrics
        </p>
      </div>

      <StatCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityChart />
        <RecentExperiments />
      </div>

      <UpcomingTasks />
    </>
  )
}
