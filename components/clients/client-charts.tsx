"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { ArrowUpRight } from "lucide-react"

/* ── shared ── */
const tip = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid hsl(220, 13%, 91%)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  backgroundColor: "white",
}

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

/* ─────────────────────────────────────────────
   1. Clients Onboarded Over Time (area chart)
   ───────────────────────────────────────────── */
const onboardData = [
  { month: "Jan 2023", clients: 2 },
  { month: "Apr 2023", clients: 1 },
  { month: "Jul 2023", clients: 4 },
  { month: "Oct 2023", clients: 2 },
  { month: "Jan 2024", clients: 5 },
  { month: "Apr 2024", clients: 1 },
  { month: "Jul 2024", clients: 3 },
  { month: "Oct 2024", clients: 2 },
  { month: "Jan 2025", clients: 3 },
  { month: "Apr 2025", clients: 4 },
  { month: "Jul 2025", clients: 2 },
  { month: "Sep 2025", clients: 3 },
]

export function ClientsOnboardedChart() {
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={onboardData}>
              <defs>
                <linearGradient id="fillOnboard" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={8} interval={2} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={30} />
              <Tooltip contentStyle={tip} />
              <Area type="monotone" dataKey="clients" name="Clients" stroke="hsl(220, 70%, 50%)" strokeWidth={1.5} fill="url(#fillOnboard)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   2. Clients Churned Over Time (area chart)
   ───────────────────────────────────────────── */
const churnData = [
  { month: "Sep 2023", clients: 1 },
  { month: "Dec 2023", clients: 2 },
  { month: "Mar 2024", clients: 1 },
  { month: "Jun 2024", clients: 3 },
  { month: "Sep 2024", clients: 2 },
  { month: "Dec 2024", clients: 1 },
  { month: "Mar 2025", clients: 4 },
  { month: "Jun 2025", clients: 2 },
]

export function ClientsChurnedChart() {
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={churnData}>
              <defs>
                <linearGradient id="fillChurn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 50%, 65%)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(0, 50%, 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={8} interval={1} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={30} />
              <Tooltip contentStyle={tip} />
              <Area type="monotone" dataKey="clients" name="Clients" stroke="hsl(0, 50%, 65%)" strokeWidth={1.5} fill="url(#fillChurn)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   3. Client Churn Reasons (pie -- same pattern as finance category charts)
   ───────────────────────────────────────────── */
const churnReasons = [
  { name: "Market Shift", value: 16.7, color: "hsl(38, 92%, 50%)" },
  { name: "Not an ICP", value: 20.8, color: "hsl(142, 72%, 40%)" },
  { name: "Unrealistic Expectations", value: 12.5, color: "hsl(195, 70%, 50%)" },
  { name: "Budget Issues", value: 12.5, color: "hsl(340, 60%, 50%)" },
  { name: "Switched to Competitor", value: 16.7, color: "hsl(262, 52%, 47%)" },
  { name: "Internal Changes", value: 8.3, color: "hsl(15, 65%, 50%)" },
  { name: "Bad Experience", value: 4.2, color: "hsl(200, 55%, 60%)" },
  { name: "Lack of Results", value: 8.3, color: "hsl(175, 60%, 42%)" },
]

export function ChurnReasonsChart() {
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
          {churnReasons.map((e) => (
            <div key={e.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              <span className="text-muted-foreground">{e.name} <span className="text-foreground font-medium">{e.value}%</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   4. MRR by Plan Type (bar -- clean single bar like finance)
   ───────────────────────────────────────────── */
const mrrData = [
  { type: "1 Test", value: 12000 },
  { type: "2 Tests", value: 24000 },
  { type: "3 Tests", value: 18000 },
  { type: "Course", value: 5000 },
]

export function MrrByPlanTypeChart() {
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mrrData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={44} tickFormatter={formatDollar} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]} />
              <Bar dataKey="value" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} name="Total MRR" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   5. Client Retention (area chart -- replaces random sentiment + clients by plan)
   ───────────────────────────────────────────── */
const retentionData = [
  { month: "Jan 2024", rate: 92 },
  { month: "Mar 2024", rate: 88 },
  { month: "May 2024", rate: 90 },
  { month: "Jul 2024", rate: 85 },
  { month: "Sep 2024", rate: 87 },
  { month: "Nov 2024", rate: 82 },
  { month: "Jan 2025", rate: 84 },
  { month: "Mar 2025", rate: 80 },
  { month: "May 2025", rate: 83 },
  { month: "Jul 2025", rate: 86 },
  { month: "Sep 2025", rate: 84 },
]

export function ClientRetentionChart() {
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={retentionData}>
              <defs>
                <linearGradient id="fillRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 45%, 55%)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(142, 45%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dy={8} interval={2} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} dx={-4} width={36} domain={[70, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [`${v}%`, "Retention"]} />
              <Area type="monotone" dataKey="rate" name="Retention Rate" stroke="hsl(142, 45%, 55%)" strokeWidth={1.5} fill="url(#fillRetention)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   6. Revenue by Client (bar chart -- top 8 clients)
   ───────────────────────────────────────────── */
const revenueByClient = [
  { client: "Goose Creek", value: 156000 },
  { client: "Primal Queen", value: 136189 },
  { client: "Perfect White", value: 75560 },
  { client: "Blox Boom", value: 64000 },
  { client: "Kitty Spout", value: 61000 },
  { client: "Arrowhead", value: 60850 },
  { client: "Gatsby", value: 55250 },
  { client: "Infinite Age", value: 52300 },
]

export function RevenueByClientChart() {
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByClient} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} tickFormatter={formatDollar} />
              <YAxis type="category" dataKey="client" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(220, 8%, 46%)" }} width={80} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, undefined]} />
              <Bar dataKey="value" fill="hsl(220, 55%, 62%)" radius={[0, 4, 4, 0]} name="Total Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
