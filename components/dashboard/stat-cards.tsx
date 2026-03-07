'use client'

import { Users, FlaskConical, FolderKanban, TrendingUp } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"

function buildClientFilter(clientIds: string[]): string | undefined {
  if (!clientIds.length) return undefined
  if (clientIds.length === 1) return `{Record ID (from Brand Name)} = "${clientIds[0]}"`
  const parts = clientIds.map(id => `{Record ID (from Brand Name)} = "${id}"`)
  return `OR(${parts.join(', ')})`
}

export function StatCards({ clientIds = [] }: { clientIds?: string[] }) {
  const clientFilter = buildClientFilter(clientIds)

  const { data: clientRecords, isLoading: cL } = useAirtable('clients', {
    fields: ['Client Status', 'Total Tests Run', 'Successful Tests'],
  })
  const { data: experimentRecords, isLoading: eL } = useAirtable('experiments', {
    fields: ['Test Status'],
    filterExtra: clientFilter,
  })
  const { data: batchRecords, isLoading: bL } = useAirtable('batches', {
    fields: ['All Tests Status'],
  })

  const isLoading = cL || eL || bL

  const totalClients = clientIds.length > 0 ? clientIds.length : (clientRecords?.length ?? 0)
  const activeClients = clientIds.length > 0
    ? clientIds.length
    : (clientRecords?.filter(r => r.fields['Client Status'] === 'Active').length ?? 0)

  const totalExperiments = experimentRecords?.length ?? 0
  const liveExperiments = experimentRecords?.filter(r => String(r.fields['Test Status'] ?? '') === 'Live - Collecting Data').length ?? 0

  const totalBatches = batchRecords?.length ?? 0
  const activeBatches = batchRecords?.filter(r => {
    const s = String(r.fields['All Tests Status'] ?? '')
    return s === 'Live - Collecting Data' || s === 'Pending' || s === 'Mixed'
  }).length ?? 0

  const completedExps = experimentRecords?.filter(r => {
    const s = String(r.fields['Test Status'] ?? '')
    return s === 'Successful' || s === 'Unsuccessful' || s === 'Inconclusive'
  }) ?? []
  const successfulExps = experimentRecords?.filter(r => String(r.fields['Test Status'] ?? '') === 'Successful') ?? []
  const avgWinRate = completedExps.length > 0
    ? Math.round((successfulExps.length / completedExps.length) * 100)
    : 0

  const stats = [
    { label: "Total Clients", value: isLoading ? '—' : String(totalClients), sub: isLoading ? 'Loading…' : `${activeClients} active`, icon: Users },
    { label: "Total Experiments", value: isLoading ? '—' : String(totalExperiments), sub: isLoading ? 'Loading…' : `${liveExperiments} live`, icon: FlaskConical },
    { label: "Active Batches", value: isLoading ? '—' : String(activeBatches), sub: isLoading ? 'Loading…' : `of ${totalBatches} total`, icon: FolderKanban },
    { label: "Avg Win Rate", value: isLoading ? '—' : `${avgWinRate}%`, sub: isLoading ? 'Loading…' : `from ${completedExps.length} completed`, icon: TrendingUp },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <MetricCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
