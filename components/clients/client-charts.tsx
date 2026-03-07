"use client"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts"
import { ArrowUpRight } from "lucide-react"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

const tip = {
  fontSize: 12, borderRadius: 8,
  border: "1px solid hsl(220, 13%, 91%)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  backgroundColor: "white",
}

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

const COLORS = [
  "hsl(38, 92%, 50%)", "hsl(142, 72%, 40%)", "hsl(195, 70%, 50%)",
  "hsl(340, 60%, 50%)", "hsl(262, 52%, 47%)", "hsl(15, 65%, 50%)",
  "hsl(200, 55%, 60%)", "hsl(175, 60%, 42%)",
]

export function ClientsOnboardedChart() {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Initial Closed Date'],
  })

  const onboardData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of clients ?? []) {
      const d = r.fields['Initial Closed Date'] as string
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      counts[key] = (counts[key] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, clients]) => ({ month, clients }))
  }, [clients])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Clients Onboarded</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">New clients by Initial Closed Date</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="p-5 pt-4">
        <div className="h-[240px]">
          {isLoading ? <div className="h-full bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={onboardData}>
                <defs>
                  <linearGradient id="fillOnboard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={8} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={30} />
                <Tooltip contentStyle={tip} />
                <Area type="monotone" dataKey="clients" name="Clients" stroke="hsl(220, 70%, 50%)" strokeWidth={1.5} fill="url(#fillOnboard)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export function ClientsChurnedChart() {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Client Status', 'Churn Date'],
    filterExtra: '{Client Status} = "Inactive"',
  })

  const churnData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of clients ?? []) {
      const d = r.fields['Churn Date'] as string
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      counts[key] = (counts[key] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, clients]) => ({ month, clients }))
  }, [clients])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Clients Churned</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Churned clients by Closed Date</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="p-5 pt-4">
        <div className="h-[240px]">
          {isLoading ? <div className="h-full bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={churnData}>
                <defs>
                  <linearGradient id="fillChurn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 50%, 65%)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(0, 50%, 65%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={8} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={30} />
                <Tooltip contentStyle={tip} />
                <Area type="monotone" dataKey="clients" name="Clients" stroke="hsl(0, 50%, 65%)" strokeWidth={1.5} fill="url(#fillChurn)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export function ChurnReasonsChart() {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Client Status', 'Churn Reason'],
    filterExtra: 'AND({Client Status} = "Inactive", {Churn Reason} != "")',
  })

  const churnReasons = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of clients ?? []) {
      const reason = String(r.fields['Churn Reason'] ?? 'Unknown')
      counts[reason] = (counts[reason] ?? 0) + 1
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return Object.entries(counts).map(([name, count], i) => ({
      name,
      value: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: COLORS[i % COLORS.length],
    }))
  }, [clients])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Client Churn Reasons</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Proportion of churn reasons</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="p-5 flex flex-col items-center gap-4">
        {isLoading ? <div className="h-[170px] w-[170px] bg-muted animate-pulse rounded-full" /> : (
          <>
            <div className="h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={churnReasons} cx="50%" cy="50%" outerRadius={80} innerRadius={0} paddingAngle={0.5} dataKey="value" stroke="white" strokeWidth={1.5}>
                    {churnReasons.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tip} formatter={(v: number, name: string) => [`${v}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {churnReasons.map(e => (
                <div key={e.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                  <span className="text-muted-foreground">{e.name} <span className="text-foreground font-medium">{e.value}%</span></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function MrrByPlanTypeChart() {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Client Status', 'Plan Type', 'Monthly Price'],
    filterExtra: '{Client Status} = "Active"',
  })

  const mrrData = useMemo(() => {
    const sums: Record<string, number> = {}
    for (const r of clients ?? []) {
      const plan = String(r.fields['Plan Type'] ?? 'Unknown')
      sums[plan] = (sums[plan] ?? 0) + parseCurrency(r.fields['Monthly Price'] as string)
    }
    return Object.entries(sums).map(([type, value]) => ({ type, value }))
  }, [clients])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">MRR by Plan Type</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Total MRR revenue for each Plan Type</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="p-5 pt-4">
        <div className="h-[240px]">
          {isLoading ? <div className="h-full bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={44} tickFormatter={formatDollar} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]} />
                <Bar dataKey="value" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} name="Total MRR" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export function RevenueByClientChart() {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Brand Name', 'TotalPaid'],
    sort: [{ field: 'TotalPaid', direction: 'desc' }],
    maxRecords: 8,
  })

  const revenueByClient = useMemo(() =>
    (clients ?? []).map(r => ({
      client: String(r.fields['Brand Name'] ?? '').split(' ').slice(0, 2).join(' '),
      value: parseCurrency(r.fields['TotalPaid'] as string),
    })), [clients])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Total Revenue by Client</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Top 8 clients by total paid</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="p-5 pt-4">
        <div className="h-[240px]">
          {isLoading ? <div className="h-full bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByClient} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} tickFormatter={formatDollar} />
                <YAxis type="category" dataKey="client" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} width={80} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]} />
                <Bar dataKey="value" fill="hsl(220, 55%, 62%)" radius={[0, 4, 4, 0]} name="Total Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export function ClientRetentionChart() {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Client Status', 'Initial Closed Date', 'Churn Date'],
  })

  const retentionData = useMemo(() => {
    if (!clients?.length) return []
    const dates = (clients ?? []).map(r => r.fields['Initial Closed Date'] as string).filter(Boolean).sort()
    if (!dates.length) return []
    const start = new Date(dates[0])
    const now = new Date()
    const months: { month: string; rate: number }[] = []
    for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const totalByThen = (clients ?? []).filter(r => {
        const cd = r.fields['Initial Closed Date'] as string
        return cd && new Date(cd) <= endOfMonth
      }).length
      const churnedByThen = (clients ?? []).filter(r => {
        const ch = r.fields['Churn Date'] as string
        return ch && new Date(ch) <= endOfMonth
      }).length
      if (totalByThen > 0) {
        months.push({ month: key, rate: Math.round(((totalByThen - churnedByThen) / totalByThen) * 1000) / 10 })
      }
    }
    return months.slice(-12)
  }, [clients])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Client Retention Rate</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Percentage of clients retained month over month</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="p-5 pt-4">
        <div className="h-[240px]">
          {isLoading ? <div className="h-full bg-muted animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retentionData}>
                <defs>
                  <linearGradient id="fillRetention" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 45%, 55%)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(142, 45%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={8} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={36} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [`${v}%`, "Retention"]} />
                <Area type="monotone" dataKey="rate" name="Retention Rate" stroke="hsl(142, 45%, 55%)" strokeWidth={1.5} fill="url(#fillRetention)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
