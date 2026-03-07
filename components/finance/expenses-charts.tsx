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
    else if (dateRange === "Last 12 Months") filtered = filtered.slice(-12)
    else if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      filtered = filtered.filter(d => parseInt(d.month.split(" ")[1]) === year)
    }

    return filtered
  }, [rawExpenses, dateRange])

  const interval = Math.max(0, Math.ceil(data.length / 12) - 1)
  const shouldTilt = data.length > 6

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
              <AreaChart data={data} margin={{ bottom: shouldTilt ? 40 : 0 }}>
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
                  dy={shouldTilt ? 0 : 8}
                  angle={shouldTilt ? -45 : 0}
                  textAnchor={shouldTilt ? "end" : "middle"}
                  interval={interval}
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

const dynamicCategoryColors = [
  "hsl(195, 65%, 48%)",
  "hsl(142, 45%, 55%)",
  "hsl(38, 70%, 55%)",
  "hsl(262, 45%, 58%)",
  "hsl(330, 45%, 55%)",
  "hsl(220, 55%, 62%)",
  "hsl(0, 50%, 65%)",
  "hsl(170, 45%, 50%)",
  "hsl(50, 60%, 50%)",
  "hsl(10, 55%, 55%)",
]

export function ExpensesByCategoryChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    sort: [{ field: 'Date', direction: 'asc' }],
  })

  const { data, categories } = useMemo(() => {
    if (!rawExpenses) return { data: [], categories: [] as string[] }

    const byMonth: Record<string, Record<string, number>> = {}
    const monthOrder: string[] = []
    const catSet = new Set<string>()

    for (const r of rawExpenses) {
      const d = String(r.fields['Date'] ?? '')
      if (!d) continue

      const catValue = r.fields['Category (from Category)']
      let cat: string
      if (Array.isArray(catValue) && catValue.length > 0) {
        cat = String(catValue[0])
      } else if (catValue) {
        cat = String(catValue)
      } else {
        cat = 'Uncategorized'
      }
      catSet.add(cat)

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
    else if (dateRange === "Last 12 Months") result = result.slice(-12)
    else if (dateRange.match(/^\d{4}$/)) {
      const year = parseInt(dateRange)
      result = result.filter(row => parseInt(row.month.split(" ")[1]) === year)
    }

    // Compute totals from filtered months to sort/filter categories
    const filteredMonths = new Set(result.map(r => r.month))
    const catTotals: Record<string, number> = {}
    for (const month of filteredMonths) {
      for (const [cat, val] of Object.entries(byMonth[month] ?? {})) {
        catTotals[cat] = (catTotals[cat] ?? 0) + val
      }
    }

    // Limit to top 8 categories by total spend to keep chart readable
    const TOP_N = 8
    const categories = [...catSet]
      .filter(cat => (catTotals[cat] ?? 0) > 0)
      .sort((a, b) => (catTotals[b] ?? 0) - (catTotals[a] ?? 0))
      .slice(0, TOP_N)

    return { data: result, categories }
  }, [rawExpenses, dateRange])

  const interval2 = Math.max(0, Math.ceil(data.length / 12) - 1)
  const shouldTilt2 = data.length > 6

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
              <AreaChart data={data} margin={{ bottom: shouldTilt2 ? 40 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dy={shouldTilt2 ? 0 : 8}
                  angle={shouldTilt2 ? -45 : 0}
                  textAnchor={shouldTilt2 ? "end" : "middle"}
                  interval={interval2}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(220, 8%, 46%)" }}
                  dx={-4}
                  width={44}
                  tickFormatter={formatDollar}
                  domain={[0, 'auto']}
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
                    name,
                  ]}
                />
                {categories.map((cat, i) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={dynamicCategoryColors[i % dynamicCategoryColors.length]}
                    strokeWidth={1.5}
                    fill="none"
                    connectNulls={true}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[12px]">
          {categories.map((cat, i) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: dynamicCategoryColors[i % dynamicCategoryColors.length] }}
              />
              <span className="text-muted-foreground">{cat}</span>
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
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []

    const now = new Date()
    const byVendor: Record<string, number> = {}
    for (const r of rawExpenses) {
      const d = String(r.fields['Date'] ?? '')
      if (d && dateRange !== 'All Time') {
        const rowDate = new Date(d)
        if (dateRange.match(/^\d{4}$/)) {
          if (rowDate.getFullYear().toString() !== dateRange) continue
        } else {
          let threshold = new Date()
          if (dateRange === 'Last Month') threshold = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          else if (dateRange === 'Last 3 Months') threshold = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          else if (dateRange === 'Last 6 Months') threshold = new Date(now.getFullYear(), now.getMonth() - 6, 1)
          else if (dateRange === 'Last 12 Months') threshold = new Date(now.getFullYear() - 1, now.getMonth(), 1)
          if (rowDate < threshold) continue
        }
      }
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
    const topTotal = result.reduce((s, d) => s + d.value, 0)
    const grandTotal = Object.values(byVendor).reduce((s, v) => s + v, 0)
    const otherValue = grandTotal - topTotal
    if (otherValue > 0) result.push({ name: 'Other', value: otherValue })

    return result
  }, [rawExpenses, dateRange])

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
            <div key={`${entry.name}-${i}`} className="flex items-center gap-1.5">
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
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []

    const now = new Date()
    const byCat: Record<string, number> = {}
    for (const r of rawExpenses) {
      const d = String(r.fields['Date'] ?? '')
      if (d && dateRange !== 'All Time') {
        const rowDate = new Date(d)
        if (dateRange.match(/^\d{4}$/)) {
          if (rowDate.getFullYear().toString() !== dateRange) continue
        } else {
          let threshold = new Date()
          if (dateRange === 'Last Month') threshold = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          else if (dateRange === 'Last 3 Months') threshold = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          else if (dateRange === 'Last 6 Months') threshold = new Date(now.getFullYear(), now.getMonth() - 6, 1)
          else if (dateRange === 'Last 12 Months') threshold = new Date(now.getFullYear() - 1, now.getMonth(), 1)
          if (rowDate < threshold) continue
        }
      }
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
  }, [rawExpenses, dateRange])

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
            <div key={`${entry.name}-${i}`} className="flex items-center gap-1.5">
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
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const data = useMemo(() => {
    if (!rawExpenses) return []

    const now = new Date()
    const byCat: Record<string, number> = {}
    for (const r of rawExpenses) {
      const d = String(r.fields['Date'] ?? '')
      if (d && dateRange !== 'All Time') {
        const rowDate = new Date(d)
        if (dateRange.match(/^\d{4}$/)) {
          if (rowDate.getFullYear().toString() !== dateRange) continue
        } else {
          let threshold = new Date()
          if (dateRange === 'Last Month') threshold = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          else if (dateRange === 'Last 3 Months') threshold = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          else if (dateRange === 'Last 6 Months') threshold = new Date(now.getFullYear(), now.getMonth() - 6, 1)
          else if (dateRange === 'Last 12 Months') threshold = new Date(now.getFullYear() - 1, now.getMonth(), 1)
          if (rowDate < threshold) continue
        }
      }

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
  }, [rawExpenses, dateRange])

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
                  width={160}
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
