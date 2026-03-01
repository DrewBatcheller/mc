import { MetricCard } from '@/components/shared/metric-card'

const row1 = [
  {
    label: 'Total Experiments',
    value: '5',
    sub: 'The cumulative count of all CRO tests launched to date.',
    className: 'border-l-[3px] border-l-sky-400',
  },
  {
    label: 'Scheduled Experiments',
    value: '0',
    sub: 'Validated test ideas currently in the queue for production.',
    className: 'border-l-[3px] border-l-emerald-400',
  },
  {
    label: 'Live Experiments',
    value: '0',
    sub: 'Tests currently active and collecting data on the site.',
    className: 'border-l-[3px] border-l-emerald-400',
  },
]

const row2 = [
  {
    label: 'Unsuccessful Experiments',
    value: '3',
    sub: 'Total number of tests that resulted in a loss or were inconclusive.',
    className: 'border-l-[3px] border-l-rose-400',
  },
  {
    label: 'Successful Experiments',
    value: '2',
    sub: 'Winning variations that outperformed the control and were pushed to production.',
    className: 'border-l-[3px] border-l-emerald-400',
  },
  {
    label: 'Total Revenue Added',
    value: 27791.90,
    currency: true,
    sub: 'Estimated incremental Monthly Recurring Revenue ($MRR) generated from winning experiments.',
    className: 'border-l-[3px] border-l-emerald-400',
  },
]

export function ClientDashboardStats() {
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
