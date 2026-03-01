"use client"

import { DonutChart } from "@/components/shared/donut-chart"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"
import { useMemo } from "react"

type BreakdownEntry = { name: string; value: number; color: string }

const categoryColors: Record<string, string> = {
  "CRO Retainer": "hsl(195, 70%, 50%)",
  "Affiliate Software": "hsl(262, 52%, 47%)",
  "Development Retainer": "hsl(142, 72%, 40%)",
  "Shopify Design & Development": "hsl(38, 92%, 50%)",
  "CRO Course": "hsl(0, 72%, 51%)",
  "Affiliate Referral": "hsl(220, 70%, 50%)",
  "Meta Media Buying": "hsl(340, 60%, 50%)",
  "CRO Audit": "hsl(175, 60%, 42%)",
  "Shopify Site Speed Development": "hsl(160, 50%, 40%)",
  "Operations": "hsl(220, 55%, 62%)",
  "Marketing & Branding": "hsl(0, 50%, 62%)",
  "Outsourcing / Freelancers": "hsl(25, 95%, 53%)",
  "Software": "hsl(195, 70%, 50%)",
  "Accounting": "hsl(262, 52%, 47%)",
  "Travel": "hsl(142, 72%, 40%)",
  "Interest and Bank Fees": "hsl(38, 92%, 50%)",
  "Equipment / Infrastructure": "hsl(0, 72%, 51%)",
}

interface DrilldownPieProps {
  title: string
  subtitle: string
  data: { name: string; value: number; color: string }[]
  month?: string
}

export function RevenueCategoryBreakdown({ month = "2025-01" }: { month?: string }) {
  const { data: rawRevenue } = useAirtable('revenue', {
    fields: ['Amount USD', 'Date', 'Category (from Category)'],
  })

  const breakdownData = useMemo(() => {
    if (!rawRevenue?.length) return []

    const [year, monthNum] = month.split('-')

    // Filter revenue for selected month
    const monthRevenue = rawRevenue.filter(r => {
      const d = r.fields['Date'] as string
      if (!d) return false
      const date = new Date(d)
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(monthNum) - 1
    })

    // Group by category and calculate totals
    const totals: Record<string, number> = {}
    for (const r of monthRevenue) {
      let catValue = r.fields['Category (from Category)']
      let cat = 'Other'
      
      if (Array.isArray(catValue)) {
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
      .map(([name, amount]) => ({
        name,
        value: Math.round((amount / total) * 100 * 10) / 10,
        color: categoryColors[name] || `hsl(${Math.random() * 360}, 60%, 50%)`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [rawRevenue, month])

  return (
    <DonutChart
      title="Revenue Category Breakdown"
      subtitle="Revenue distribution across categories for the selected month"
      data={breakdownData}
    />
  )
}

export function ExpenseCategoryBreakdown({ month = "2025-01" }: { month?: string }) {
  const { data: rawExpenses } = useAirtable('expenses', {
    fields: ['Expense', 'Date', 'Category (from Category)'],
  })

  const breakdownData = useMemo(() => {
    if (!rawExpenses?.length) return []

    const [year, monthNum] = month.split('-')

    // Filter expenses for selected month
    const monthExpenses = rawExpenses.filter(r => {
      const d = r.fields['Date'] as string
      if (!d) return false
      const date = new Date(d)
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(monthNum) - 1
    })

    // Group by category and calculate totals
    const totals: Record<string, number> = {}
    for (const r of monthExpenses) {
      let catValue = r.fields['Category (from Category)']
      let cat = 'Other'
      
      if (Array.isArray(catValue)) {
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
      .map(([name, amount]) => ({
        name,
        value: Math.round((amount / total) * 100 * 10) / 10,
        color: categoryColors[name] || `hsl(${Math.random() * 360}, 60%, 50%)`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [rawExpenses, month])

  return (
    <DonutChart
      title="Expense Category Breakdown"
      subtitle="Expense distribution across categories for the selected month"
      data={breakdownData}
    />
  )
}
