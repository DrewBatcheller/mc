"use client"

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

/* ── Expenses Over Time (Area Chart) ── */

function formatDollar(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

const areaColor = "hsl(220, 55%, 62%)"

export function ExpensesOverTimeChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    fields: ['Expense', 'Date'],
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []
    const byMonth: Record<string, number> = {}
    const monthOrder: string[] = []

    for (const r of rawExpenses) {
      const d = String(r.fields['Date'] ?? '')
      if (!d) continue
      const dt = new Date(d)
      const key = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      if (!byMonth[key]) monthOrder.push(key)
      byMonth[key] = (byMonth[key] ?? 0) + parseCurrency(r.fields['Expense'] as string)
    }

    let filtered = monthOrder.map(m => ({ month: m, expenses: byMonth[m] }))
    
    if (dateRange === "Last Month") filtered = filtered.slice(-1)
    else if (dateRange === "Last 3 Months") filtered = filtered.slice(-3)
    else if (dateRange === "Last 6 Months") filtered = filtered.slice(-6)
    else if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      filtered = filtered.filter(d => parseInt(d.month.split(" ")[1]) === year)
    }

    return filtered
  }, [rawExpenses, dateRange])

  const getInterval = () => {
    if (data.length <= 3) return 0
    if (data.length <= 6) return 1
    return 2
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Expenses Over Time
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Monthly expense trend
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="fillExpTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={areaColor} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={areaColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dy={8}
                  interval={getInterval()}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dx={-4}
                  width={44}
                  tickFormatter={formatDollar}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(220, 13%, 91%)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    backgroundColor: "white",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Expenses"]}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke={areaColor}
                  strokeWidth={1.5}
                  fill="url(#fillExpTime)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Category Over Time (Multi-line) ── */

const categoryColors: Record<string, string> = {
  outsourcing: "hsl(195, 65%, 48%)",
  software: "hsl(142, 45%, 55%)",
  operations: "hsl(38, 70%, 55%)",
  accounting: "hsl(262, 45%, 58%)",
  marketing: "hsl(330, 45%, 55%)",
}

const categoryLabels: Record<string, string> = {
  outsourcing: "Outsourcing / Freelancers",
  software: "Software",
  operations: "Operations",
  accounting: "Accounting",
  marketing: "Marketing & Branding",
}

export function ExpensesByCategoryChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    fields: ['Expense', 'Date', 'Category (from Category)'],
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []
    const byMonth: Record<string, Record<string, number>> = {}
    const monthOrder: string[] = []

    for (const r of rawExpenses) {
      const d = String(r.fields['Date'] ?? '')
      const cat = String(r.fields['Category (from Category)'] ?? 'other').toLowerCase().replace(/\s+/g, '')
      if (!d) continue

      const dt = new Date(d)
      const month = `${dt.toLocaleString('default', { month: 'short' })} ${dt.getFullYear()}`
      if (!byMonth[month]) {
        monthOrder.push(month)
        byMonth[month] = {}
      }

      byMonth[month][cat] = (byMonth[month][cat] ?? 0) + parseCurrency(r.fields['Expense'] as string)
    }

    let result = monthOrder.map(m => ({
      month: m,
      ...byMonth[m],
    }))

    if (dateRange === "Last Month") result = result.slice(-1)
    else if (dateRange === "Last 3 Months") result = result.slice(-3)
    else if (dateRange === "Last 6 Months") result = result.slice(-6)
    else if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      result = result.filter(d => parseInt(d.month.split(" ")[1]) === year)
    }

    return result
  }, [rawExpenses, dateRange])

  const getInterval = () => {
    if (data.length <= 3) return 0
    if (data.length <= 6) return 1
    return 2
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Expenses Over Time (By Category)
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Category-level expense trends
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dy={8}
                  interval={getInterval()}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dx={-4}
                  width={44}
                  tickFormatter={formatDollar}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(220, 13%, 91%)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    backgroundColor: "white",
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString()}`,
                    categoryLabels[name] || name,
                  ]}
                />
                {Object.keys(categoryColors).map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={categoryColors[key]}
                    strokeWidth={1.5}
                    fill="none"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[12px]">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: categoryColors[key] }}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Vendor Pie ── */

const vendorColors = [
  "hsl(195, 65%, 48%)",
  "hsl(220, 55%, 62%)",
  "hsl(142, 45%, 55%)",
  "hsl(38, 70%, 55%)",
  "hsl(0, 50%, 65%)",
  "hsl(262, 45%, 58%)",
  "hsl(195, 40%, 65%)",
  "hsl(330, 45%, 55%)",
  "hsl(170, 45%, 50%)",
  "hsl(220, 13%, 72%)",
]

export function ExpensesByVendorPie({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    fields: ['Expense', 'Date', 'Vendor (from Vendor)'],
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []
    
    const byVendor: Record<string, number> = {}
    for (const r of rawExpenses) {
      let vendor = 'Other'
      const vendorValue = r.fields['Vendor (from Vendor)']
      
      if (Array.isArray(vendorValue)) {
        vendor = String(vendorValue[0] ?? 'Other')
      } else if (vendorValue) {
        vendor = String(vendorValue)
      }

      byVendor[vendor] = (byVendor[vendor] ?? 0) + parseCurrency(r.fields['Expense'] as string)
    }

    const result = Object.entries(byVendor)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 9)

    // Add "Other" category for remaining
    const otherValue = Object.values(byVendor).reduce((s, v) => s + v, 0) - result.reduce((s, d) => s + d.value, 0)
    if (otherValue > 0) result.push({ name: 'Other', value: otherValue })

    return result
  }, [rawExpenses])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Total Expenses by Vendor
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Spending distribution by vendor
        </p>
      </div>
      <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="h-[180px] w-[180px] shrink-0">
          {isLoading ? (
            <div className="h-full w-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={85}
                  paddingAngle={0.5}
                  dataKey="value"
                  stroke="white"
                  strokeWidth={1.5}
                >
                  {data.map((_, index) => (
                    <Cell key={`v-${index}`} fill={vendorColors[index % vendorColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(220, 13%, 91%)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    backgroundColor: "white",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-col gap-2 text-[12px] min-w-0">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: vendorColors[i % vendorColors.length] }}
              />
              <span className="text-muted-foreground truncate">
                {entry.name}{" "}
                <span className="text-foreground font-medium">
                  {total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0'}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Category Pie ── */

const catPieColors = [
  "hsl(195, 65%, 48%)",
  "hsl(220, 55%, 62%)",
  "hsl(142, 45%, 55%)",
  "hsl(38, 70%, 55%)",
  "hsl(0, 50%, 65%)",
  "hsl(262, 45%, 58%)",
  "hsl(330, 45%, 55%)",
  "hsl(195, 40%, 65%)",
  "hsl(170, 45%, 50%)",
  "hsl(50, 60%, 50%)",
  "hsl(10, 55%, 55%)",
  "hsl(220, 13%, 72%)",
  "hsl(280, 40%, 58%)",
  "hsl(155, 45%, 52%)",
  "hsl(25, 65%, 55%)",
]

export function ExpensesByCategoryPie({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    fields: ['Expense', 'Date', 'Category (from Category)'],
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []
    
    const byCat: Record<string, number> = {}
    for (const r of rawExpenses) {
      let cat = 'Other'
      const catValue = r.fields['Category (from Category)']
      
      if (Array.isArray(catValue)) {
        cat = String(catValue[0] ?? 'Other')
      } else if (catValue) {
        cat = String(catValue)
      }

      byCat[cat] = (byCat[cat] ?? 0) + parseCurrency(r.fields['Expense'] as string)
    }

    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [rawExpenses])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Total Expenses by Category
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Spending distribution by category
        </p>
      </div>
      <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="h-[180px] w-[180px] shrink-0">
          {isLoading ? (
            <div className="h-full w-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={85}
                  paddingAngle={0.5}
                  dataKey="value"
                  stroke="white"
                  strokeWidth={1.5}
                >
                  {data.map((_, index) => (
                    <Cell key={`c-${index}`} fill={catPieColors[index % catPieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(220, 13%, 91%)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    backgroundColor: "white",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-col gap-2 text-[12px] min-w-0">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: catPieColors[i % catPieColors.length] }}
              />
              <span className="text-muted-foreground truncate">
                {entry.name}{" "}
                <span className="text-foreground font-medium">
                  {total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0'}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Category (Horizontal Bar) ── */

export function ExpensesByCategoryBar({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    fields: ['Expense', 'Date', 'Category (from Category)'],
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []
    
    const byCat: Record<string, number> = {}
    for (const r of rawExpenses) {
      let cat = 'Other'
      const catValue = r.fields['Category (from Category)']
      
      if (Array.isArray(catValue)) {
        cat = String(catValue[0] ?? 'Other')
      } else if (catValue) {
        cat = String(catValue)
      }

      byCat[cat] = (byCat[cat] ?? 0) + parseCurrency(r.fields['Expense'] as string)
    }

    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [rawExpenses])

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Total Expenses by Category
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Ranked by total spend
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[340px]">
          {isLoading ? (
            <div className="h-full bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dx={-4}
                  tickFormatter={formatDollar}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dx={-4}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(220, 13%, 91%)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    backgroundColor: "white",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Expenses"]}
                />
                <Bar dataKey="value" fill={areaColor} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

const areaColor = "hsl(220, 55%, 62%)"

export function ExpensesOverTimeChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const getFilteredData = () => {
    if (dateRange === "All Time") return allExpensesOverTime
    if (dateRange === "Last Month") return allExpensesOverTime.slice(-1)
    if (dateRange === "Last 3 Months") return allExpensesOverTime.slice(-3)
    if (dateRange === "Last 6 Months") return allExpensesOverTime.slice(-6)
    if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      return allExpensesOverTime.filter(d => parseInt(d.month.split(" ")[1]) === year)
    }
    return allExpensesOverTime
  }

  const data = getFilteredData()

  const getInterval = () => {
    if (data.length <= 3) return 0
    if (data.length <= 6) return 1
    return 2
  }
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Expenses Over Time
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Monthly expense trend
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillOutsourcing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={categoryColors.outsourcing} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={categoryColors.outsourcing} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillSoftware" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={categoryColors.software} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={categoryColors.software} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillOperations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={categoryColors.operations} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={categoryColors.operations} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillAccounting" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={categoryColors.accounting} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={categoryColors.accounting} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillOther" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={categoryColors.other} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={categoryColors.other} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dy={8}
                interval={getInterval()}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dx={-4}
                width={44}
                tickFormatter={formatDollar}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Expenses"]}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke={areaColor}
                strokeWidth={1.5}
                fill="url(#fillExpTime)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Category Over Time (Multi-line) ── */

const allCategoryOverTime = [
  { month: "Sep 2022", outsourcing: 1800, software: 600, operations: 900, accounting: 300, other: 600 },
  { month: "Dec 2022", outsourcing: 3200, software: 800, operations: 1200, accounting: 300, other: 1946 },
  { month: "Mar 2023", outsourcing: 4100, software: 1100, operations: 1500, accounting: 600, other: 2500 },
  { month: "Jun 2023", outsourcing: 5600, software: 1400, operations: 1800, accounting: 600, other: 2900 },
  { month: "Sep 2023", outsourcing: 7200, software: 1800, operations: 2100, accounting: 600, other: 3900 },
  { month: "Dec 2023", outsourcing: 8500, software: 2100, operations: 2400, accounting: 600, other: 4600 },
  { month: "Mar 2024", outsourcing: 8200, software: 2200, operations: 2600, accounting: 600, other: 5100 },
  { month: "Jun 2024", outsourcing: 9100, software: 2400, operations: 2800, accounting: 600, other: 5300 },
  { month: "Sep 2024", outsourcing: 12000, software: 2800, operations: 3200, accounting: 600, other: 6900 },
  { month: "Dec 2024", outsourcing: 11200, software: 2600, operations: 3100, accounting: 600, other: 7200 },
  { month: "Mar 2025", outsourcing: 8500, software: 2200, operations: 2600, accounting: 600, other: 4800 },
  { month: "Jun 2025", outsourcing: 9200, software: 2400, operations: 2800, accounting: 600, other: 5200 },
  { month: "Sep 2025", outsourcing: 16800, software: 3200, operations: 4100, accounting: 600, other: 10200 },
  { month: "Dec 2025", outsourcing: 14800, software: 3000, operations: 3800, accounting: 600, other: 9200 },
]

const categoryColors: Record<string, string> = {
  outsourcing: "hsl(195, 65%, 48%)",
  software: "hsl(142, 45%, 55%)",
  operations: "hsl(38, 70%, 55%)",
  accounting: "hsl(262, 45%, 58%)",
  marketing: "hsl(330, 45%, 55%)",
}

const categoryLabels: Record<string, string> = {
  outsourcing: "Outsourcing / Freelancers",
  software: "Software",
  operations: "Operations",
  accounting: "Accounting",
  marketing: "Marketing & Branding",
}

export function ExpensesByCategoryChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const getFilteredData = () => {
    if (dateRange === "All Time") return allCategoryOverTime
    if (dateRange === "Last Month") return allCategoryOverTime.slice(-1)
    if (dateRange === "Last 3 Months") return allCategoryOverTime.slice(-3)
    if (dateRange === "Last 6 Months") return allCategoryOverTime.slice(-6)
    if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      return allCategoryOverTime.filter(d => parseInt(d.month.split(" ")[1]) === year)
    }
    return allCategoryOverTime
  }

  const data = getFilteredData()

  const getInterval = () => {
    if (data.length <= 3) return 0
    if (data.length <= 6) return 1
    return 2
  }
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Expenses Over Time (By Category)
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Category-level expense trends
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dy={8}
                interval={2}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                dx={-4}
                width={44}
                tickFormatter={formatDollar}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`,
                  categoryLabels[name] || name,
                ]}
              />
              {Object.keys(categoryColors).map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={categoryColors[key]}
                  strokeWidth={1.5}
                  fill="none"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[12px]">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: categoryColors[key] }}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Vendor Pie ── */

const vendorData = [
  { name: "ActiveCampaign", value: 4800 },
  { name: "Amazon", value: 2100 },
  { name: "Calendly", value: 1800 },
  { name: "ChatGPT", value: 3200 },
  { name: "Convert.com", value: 12600 },
  { name: "DigitalOcean", value: 2400 },
  { name: "Dropbox", value: 900 },
  { name: "Expandi", value: 1500 },
  { name: "Facebook/Meta", value: 6200 },
  { name: "Other", value: 30800 },
]

const vendorColors = [
  "hsl(195, 65%, 48%)",
  "hsl(220, 55%, 62%)",
  "hsl(142, 45%, 55%)",
  "hsl(38, 70%, 55%)",
  "hsl(0, 50%, 65%)",
  "hsl(262, 45%, 58%)",
  "hsl(195, 40%, 65%)",
  "hsl(330, 45%, 55%)",
  "hsl(170, 45%, 50%)",
  "hsl(220, 13%, 72%)",
]

export function ExpensesByVendorPie({ dateRange = "All Time" }: { dateRange?: string }) {
  // Apply multiplier based on date range for sample data
  const getMultiplier = () => {
    if (dateRange === "All Time") return 1
    if (dateRange === "Last Month") return 0.08
    if (dateRange === "Last 3 Months") return 0.22
    if (dateRange === "Last 6 Months") return 0.45
    return 1
  }

  const multiplier = getMultiplier()
  const scaledVendorData = vendorData.map(d => ({ ...d, value: Math.round(d.value * multiplier) }))
  const total = scaledVendorData.reduce((s, d) => s + d.value, 0)
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Total Expenses by Vendor
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Spending distribution by vendor
        </p>
      </div>
      <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={scaledVendorData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={85}
                paddingAngle={0.5}
                dataKey="value"
                stroke="white"
                strokeWidth={1.5}
              >
                {vendorData.map((_, index) => (
                  <Cell key={`v-${index}`} fill={vendorColors[index % vendorColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 text-[12px] min-w-0">
          {scaledVendorData.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: vendorColors[i % vendorColors.length] }}
              />
              <span className="text-muted-foreground truncate">
                {entry.name}{" "}
                <span className="text-foreground font-medium">
                  {((entry.value / total) * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Category Pie ── */

const categoryPieData = [
  { name: "Outsourcing / Freelancers", value: 198200 },
  { name: "Outsourcing / Freelancers (Development)", value: 82000 },
  { name: "Outsourcing / Freelancers (Strategy)", value: 74000 },
  { name: "Outsourcing / Freelancers (Design)", value: 22000 },
  { name: "Software (Testing Platforms)", value: 45000 },
  { name: "Software", value: 28400 },
  { name: "Marketing & Branding", value: 26000 },
  { name: "Operations", value: 42300 },
  { name: "Accounting", value: 15800 },
  { name: "Equipment / Infrastructure", value: 5800 },
  { name: "Travel", value: 6100 },
  { name: "Interest and Bank Fees", value: 2100 },
  { name: "Legal", value: 3400 },
  { name: "Educational", value: 3800 },
  { name: "Affiliate Payment", value: 5200 },
]

const catPieColors = [
  "hsl(195, 65%, 48%)",
  "hsl(220, 55%, 62%)",
  "hsl(142, 45%, 55%)",
  "hsl(38, 70%, 55%)",
  "hsl(0, 50%, 65%)",
  "hsl(262, 45%, 58%)",
  "hsl(330, 45%, 55%)",
  "hsl(195, 40%, 65%)",
  "hsl(170, 45%, 50%)",
  "hsl(50, 60%, 50%)",
  "hsl(10, 55%, 55%)",
  "hsl(220, 13%, 72%)",
  "hsl(280, 40%, 58%)",
  "hsl(155, 45%, 52%)",
  "hsl(25, 65%, 55%)",
]

export function ExpensesByCategoryPie({ dateRange = "All Time" }: { dateRange?: string }) {
  // Apply multiplier based on date range for sample data
  const getMultiplier = () => {
    if (dateRange === "All Time") return 1
    if (dateRange === "Last Month") return 0.08
    if (dateRange === "Last 3 Months") return 0.22
    if (dateRange === "Last 6 Months") return 0.45
    return 1
  }

  const multiplier = getMultiplier()
  const scaledCategoryData = categoryPieData.map(d => ({ ...d, value: Math.round(d.value * multiplier) }))
  const total = scaledCategoryData.reduce((s, d) => s + d.value, 0)
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Total Expenses by Category
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Spending distribution by category
        </p>
      </div>
      <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={scaledCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={85}
                paddingAngle={0.5}
                dataKey="value"
                stroke="white"
                strokeWidth={1.5}
              >
                {categoryPieData.map((_, index) => (
                  <Cell key={`c-${index}`} fill={catPieColors[index % catPieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 text-[12px] min-w-0">
          {scaledCategoryData.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: catPieColors[i % catPieColors.length] }}
              />
              <span className="text-muted-foreground truncate">
                {entry.name}{" "}
                <span className="text-foreground font-medium">
                  {((entry.value / total) * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Expenses by Category (Horizontal Bar) ── */

const barData = categoryPieData
  .slice()
  .sort((a, b) => b.value - a.value)
  .map((d) => ({ ...d, value: d.value }))

export function ExpensesByCategoryBar({ dateRange = "All Time" }: { dateRange?: string }) {
  // Apply multiplier based on date range for sample data
  const getMultiplier = () => {
    if (dateRange === "All Time") return 1
    if (dateRange === "Last Month") return 0.08
    if (dateRange === "Last 3 Months") return 0.22
    if (dateRange === "Last 6 Months") return 0.45
    return 1
  }

  const multiplier = getMultiplier()
  const scaledCategoryData = categoryPieData.map(d => ({ ...d, value: Math.round(d.value * multiplier) }))
  const barData = scaledCategoryData
    .slice()
    .sort((a, b) => b.value - a.value)
    .map((d) => ({ ...d, value: d.value }))
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Total Expenses by Category
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Ranked by total spend
        </p>
      </div>
      <div className="p-5 pt-4">
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220, 13%, 91%)" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                tickFormatter={formatDollar}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                width={180}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Expenses"]}
              />
              <Bar dataKey="value" fill="hsl(220, 55%, 62%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
