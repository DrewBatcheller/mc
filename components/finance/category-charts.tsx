"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

function buildDateFilter(dateRange: string): string {
  if (dateRange === 'All Time') return ''
  const now = new Date()
  if (dateRange === 'Last Month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 3 Months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 6 Months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange === 'Last 12 Months') {
    const d = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    return `IS_AFTER({Date}, "${d.toISOString().split('T')[0]}")`
  }
  if (dateRange.match(/^\d{4}$/)) {
    return `YEAR({Date}) = ${dateRange}`
  }
  return ''
}

function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360}, 60%, 50%)`
}

const categoryColors: Record<string, string> = {
  "CRO Retainer": "hsl(195, 70%, 50%)",
  "Affiliate Software": "hsl(220, 70%, 50%)",
  "Shopify Design & Development": "hsl(175, 60%, 42%)",
  "CRO Course": "hsl(142, 72%, 40%)",
  "Development Retainer": "hsl(38, 92%, 50%)",
  "Affiliate Referral": "hsl(0, 72%, 51%)",
  "Meta Media Buying": "hsl(262, 52%, 47%)",
  "CRO Audit": "hsl(340, 60%, 50%)",
  "Shopify Site Speed Development": "hsl(160, 50%, 40%)",
  "Outsourcing / Freelancers": "hsl(195, 70%, 50%)",
  "Software": "hsl(220, 70%, 50%)",
  "Operations": "hsl(175, 60%, 42%)",
  "Accounting": "hsl(142, 72%, 40%)",
  "Marketing & Branding": "hsl(38, 92%, 50%)",
  "Travel": "hsl(0, 72%, 51%)",
  "Interest and Bank Fees": "hsl(262, 52%, 47%)",
  "Equipment / Infrastructure": "hsl(340, 60%, 50%)",
}

interface CategoryPieProps {
  title: string
  subtitle: string
  data: { name: string; value: number; color: string }[]
  dateRange?: string
}

function CategoryPie({ title, subtitle, data, dateRange = "All Time" }: CategoryPieProps) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="p-5 flex flex-col lg:flex-row items-center justify-center gap-6 min-h-80">
        <div className="h-[220px] w-[220px] shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={100}
                paddingAngle={0.5}
                dataKey="value"
                stroke="white"
                strokeWidth={1.5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] lg:max-h-[220px] lg:overflow-y-auto">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name}{" "}
                <span className="text-foreground font-medium">
                  {entry.value.toFixed(1)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RevenueByCategoryChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const dateFilter = buildDateFilter(dateRange)
  const { data: rawRevenue, isLoading } = useAirtable('revenue', {
    fields: ['Amount USD', 'Category (from Category)'],
    ...(dateFilter ? { filterExtra: dateFilter } : {}),
  })

  const chartData = useMemo(() => {
    if (!rawRevenue?.length) return []

    const totals: Record<string, number> = {}
    for (const r of rawRevenue) {
      // Handle linked field - could be array or string
      let catValue = r.fields['Category (from Category)']
      let cat = 'Other'
      
      if (Array.isArray(catValue)) {
        // If it's an array, take first element
        cat = String(catValue[0] ?? 'Other')
      } else if (catValue) {
        cat = String(catValue)
      }
      
      const amt = parseCurrency(r.fields['Amount USD'] as string)
      totals[cat] = (totals[cat] ?? 0) + amt
    }

    const total = Object.values(totals).reduce((a, b) => a + b, 0)
    if (total === 0) return []

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: (value / total) * 100,
        color: categoryColors[name] || hashColor(name),
      }))
      .sort((a, b) => b.value - a.value)
  }, [rawRevenue])

  return (
    <CategoryPie
      title="Revenue by Category"
      subtitle="Revenue distribution across categories"
      data={chartData}
      dateRange={dateRange}
    />
  )
}

export function ExpenseByCategoryChart({ dateRange = "All Time" }: { dateRange?: string }) {
  const dateFilter = buildDateFilter(dateRange)
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    fields: ['Expense', 'Category (from Category)'],
    ...(dateFilter ? { filterExtra: dateFilter } : {}),
  })

  const chartData = useMemo(() => {
    if (!rawExpenses?.length) return []

    const totals: Record<string, number> = {}
    for (const r of rawExpenses) {
      // Handle linked field - could be array or string
      let catValue = r.fields['Category (from Category)']
      let cat = 'Other'
      
      if (Array.isArray(catValue)) {
        // If it's an array, take first element
        cat = String(catValue[0] ?? 'Other')
      } else if (catValue) {
        cat = String(catValue)
      }
      
      const amt = parseCurrency(r.fields['Expense'] as string)
      totals[cat] = (totals[cat] ?? 0) + amt
    }

    const total = Object.values(totals).reduce((a, b) => a + b, 0)
    if (total === 0) return []

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: (value / total) * 100,
        color: categoryColors[name] || hashColor(name),
      }))
      .sort((a, b) => b.value - a.value)
  }, [rawExpenses])

  return (
    <CategoryPie
      title="Expense by Category"
      subtitle="Expense distribution across categories"
      data={chartData}
      dateRange={dateRange}
    />
  )
}
