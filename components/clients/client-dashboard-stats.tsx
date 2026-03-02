'use client'

import { useAirtable } from '@/hooks/use-airtable'
import { MetricCard } from '@/components/shared/metric-card'
import { useMemo } from 'react'

export function ClientDashboardStats() {
  const { data: experiments } = useAirtable('experiments')
  const { data: variants } = useAirtable('variants')

  const stats = useMemo(() => {
    if (!experiments || !variants) {
      return {
        totalExperiments: 0,
        scheduledExperiments: 0,
        liveExperiments: 0,
        unsuccessfulExperiments: 0,
        successfulExperiments: 0,
        totalRevenueAdded: 0,
      }
    }

    const totalExperiments = experiments.length
    const liveExperiments = experiments.filter(e => e.fields['Test Status'] === 'Live').length
    const scheduledExperiments = experiments.filter(e => e.fields['Test Status'] === 'Scheduled').length
    
    // Successful experiments are those with Test Status of 'Successful' or Outcome field of 'Successful'/'Win'
    const successfulExperiments = experiments.filter(e => {
      const testStatus = String(e.fields['Test Status'] || '')
      const outcome = String(e.fields['Outcome'] || '')
      return testStatus === 'Successful' || outcome === 'Successful' || outcome === 'Win'
    }).length
    
    // Unsuccessful are those with 'Unsuccessful', 'Loss', or 'Inconclusive'
    const unsuccessfulExperiments = experiments.filter(e => {
      const testStatus = String(e.fields['Test Status'] || '')
      const outcome = String(e.fields['Outcome'] || '')
      return testStatus === 'Unsuccessful' || testStatus === 'Inconclusive' || outcome === 'Unsuccessful' || outcome === 'Loss' || outcome === 'Inconclusive'
    }).length

    const totalRevenueAdded = experiments.reduce((sum, exp) => {
      const revenue = exp.fields['Revenue Added (MRR) (Regular Format)']
      return sum + (typeof revenue === 'number' ? revenue : 0)
    }, 0)

    return {
      totalExperiments,
      scheduledExperiments,
      liveExperiments,
      unsuccessfulExperiments,
      successfulExperiments,
      totalRevenueAdded,
    }
  }, [experiments, variants])

  const row1 = [
    {
      label: 'Total Experiments',
      value: String(stats.totalExperiments),
      sub: 'The cumulative count of all CRO tests launched to date.',
      className: 'border-l-[3px] border-l-sky-400',
    },
    {
      label: 'Scheduled Experiments',
      value: String(stats.scheduledExperiments),
      sub: 'Validated test ideas currently in the queue for production.',
      className: 'border-l-[3px] border-l-emerald-400',
    },
    {
      label: 'Live Experiments',
      value: String(stats.liveExperiments),
      sub: 'Tests currently active and collecting data on the site.',
      className: 'border-l-[3px] border-l-emerald-400',
    },
  ]

  const row2 = [
    {
      label: 'Unsuccessful Experiments',
      value: String(stats.unsuccessfulExperiments),
      sub: 'Total number of tests that resulted in a loss or were inconclusive.',
      className: 'border-l-[3px] border-l-rose-400',
    },
    {
      label: 'Successful Experiments',
      value: String(stats.successfulExperiments),
      sub: 'Winning variations that outperformed the control and were pushed to production.',
      className: 'border-l-[3px] border-l-emerald-400',
    },
    {
      label: 'Total Revenue Added',
      value: stats.totalRevenueAdded,
      currency: true,
      sub: 'Estimated incremental Monthly Recurring Revenue ($MRR) generated from winning experiments.',
      className: 'border-l-[3px] border-l-emerald-400',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {row1.map((s) => <MetricCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {row2.map((s) => <MetricCard key={s.label} {...s} />)}
      </div>
    </div>
  )
}
