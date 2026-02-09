"use client"

import React, { Suspense } from "react"
import dynamic from "next/dynamic"

import { useMemo } from "react"
import { useClients, useExperiments, useBatches, useTasks } from "@/hooks/v2/use-airtable"
import { useUser } from "@/contexts/v2/user-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Users,
  FlaskConical,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Package,
} from "lucide-react"
import Link from "next/link"

// Skeleton Card Component for loading states
function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Lazy load the detailed sections
const RecentExperimentsSection = dynamic(() => import("./dashboard-recent-experiments").then(m => ({ default: m.RecentExperimentsSection })), {
  loading: () => <SkeletonCard />,
  ssr: false,
})

const UpcomingTasksSection = dynamic(() => import("./dashboard-upcoming-tasks").then(m => ({ default: m.UpcomingTasksSection })), {
  loading: () => <SkeletonCard />,
  ssr: false,
})

function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function DashboardContent() {
  const { currentUser } = useUser()
  
  // ONLY CRITICAL data - needed for immediate display
  const { clients, isLoading: loadingClients } = useClients()
  
  // Only load management-restricted data if user is management
  // This prevents unnecessary API calls and improves performance for non-management users
  const { experiments } = useExperiments()
  const { batches } = useBatches()
  const { tasks } = useTasks()

  const isClient = currentUser?.role === "client"
  const isManagement = currentUser?.role === "management"

  const metrics = useMemo(() => {
    const activeClients = clients.filter(
      (c) => c.fields["Client Status"]?.toLowerCase() === "active" || c.fields.Status?.toLowerCase() === "active"
    ).length

    const liveExperiments = experiments.filter(
      (e) => e.fields["Test Status"]?.toLowerCase() === "live"
    ).length

    const completedExperiments = experiments.filter(
      (e) => {
        const status = e.fields["Test Status"] || ""
        return status === "Successful" || status === "Unsuccessful" || status === "Inconclusive"
      }
    ).length

    const winRate = completedExperiments > 0
      ? Math.round(
          (experiments.filter((e) => e.fields["Test Status"] === "Successful").length /
            completedExperiments) *
            100
        )
      : 0

    const activeBatches = batches.filter(
      (b) => b.fields["Batch Status"]?.toLowerCase() === "active"
    ).length

    const overdueTasks = tasks.filter(
      (t) => new Date(t.fields["Due Date"]) < new Date()
    ).length

    const pendingTasks = tasks.filter(
      (t) => t.fields["Task Status"]?.toLowerCase() === "pending"
    ).length

    return {
      activeClients,
      totalClients: clients.length,
      liveExperiments,
      completedExperiments,
      totalExperiments: experiments.length,
      activeBatches,
      totalBatches: batches.length,
      overdueTasks,
      pendingTasks,
      totalTasks: tasks.length,
      winRate,
    }
  }, [clients, experiments, batches, tasks])

  // Only block rendering on CLIENTS data (critical)
  const criticalLoading = loadingClients

  if (criticalLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Loading your dashboard...
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isClient
            ? "Here is an overview of your experiments."
            : "Here is your overview for today."}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {!isClient && (
          <MetricCard
            title="Active Clients"
            value={metrics.activeClients}
            subtitle={`${metrics.totalClients} total`}
            icon={<Users className="h-4 w-4" />}
            href="/clients"
          />
        )}
        <MetricCard
          title="Live Experiments"
          value={metrics.liveExperiments}
          subtitle={`${metrics.totalExperiments} total`}
          icon={<FlaskConical className="h-4 w-4" />}
          href="/client-tracker"
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          subtitle={`${metrics.completedExperiments} completed`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent={metrics.winRate >= 50 ? "emerald" : "amber"}
        />
        <MetricCard
          title="Active Batches"
          value={metrics.activeBatches}
          subtitle={`${metrics.totalBatches} total`}
          icon={<Package className="h-4 w-4" />}
          href="/client-tracker"
        />
        {!isClient && (
          <>
            <MetricCard
              title="Overdue Tasks"
              value={metrics.overdueTasks}
              subtitle={`${metrics.pendingTasks} pending`}
              icon={<AlertCircle className="h-4 w-4" />}
              accent={metrics.overdueTasks > 0 ? "red" : "emerald"}
              href="/schedule"
            />
            <MetricCard
              title="Total Tasks"
              value={metrics.totalTasks}
              icon={<CheckCircle2 className="h-4 w-4" />}
              href="/schedule"
            />
          </>
        )}
      </div>

      {/* Bottom Section - Lazy Loaded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<SkeletonCard />}>
          <RecentExperimentsSection experiments={experiments} />
        </Suspense>

        {!isClient && (
          <Suspense fallback={<SkeletonCard />}>
            <UpcomingTasksSection tasks={tasks} />
          </Suspense>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink href="/client-tracker" label="Client Tracker" icon={<BarChart3 className="h-5 w-5" />} />
        <QuickLink href="/test-ideas" label="Test Ideas" icon={<FlaskConical className="h-5 w-5" />} />
        {!isClient && (
          <>
            <QuickLink href="/schedule" label="Schedule" icon={<Clock className="h-5 w-5" />} />
            <QuickLink href="/clients" label="Clients" icon={<Users className="h-5 w-5" />} />
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  accent?: "emerald" | "amber" | "red"
  href?: string
}) {
  const accentColor =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "red"
        ? "text-red-600"
        : accent === "amber"
          ? "text-amber-600"
          : "text-foreground"

  const content = (
    <Card className={href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
      <CardContent className="p-1">
        <div className="flex items-center gap-2 h-8">
          <span className="text-muted-foreground flex-shrink-0 pl-2">{icon}</span>
          <div className="min-w-0 flex-1 pl-2">
            <div className={`text-lg font-bold leading-none ${accentColor}`}>{value}</div>
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            {!subtitle && <p className="text-xs text-muted-foreground h-3" />}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function QuickLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  )
}
