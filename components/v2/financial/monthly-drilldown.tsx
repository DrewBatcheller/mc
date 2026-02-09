"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { usePL, useRevenue, useExpenses } from "@/hooks/v2/use-financial"
import { LoadingOverlay } from "@/components/v2/loading-overlay"
import { organizePieChartData } from "@/lib/v2/pie-chart-utils"
import { EmptyChart } from "./empty-chart"
import { FinancialCard } from "./financial-card"
import { GraphCard } from "@/components/v2/graph-card"
import { DefaultPieChart } from "@/components/v2/default-pie-chart"
import { MetricCard } from "./metric-card"
import { DashboardGrid } from "@/components/v2/dashboard-grid"

const COLORS = ["#0891b2", "#06b6d4", "#0ea5e9", "#0d9488", "#10b981", "#14b8a6"]

export function MonthlyDrilldown() {
  const [selectedMonth, setSelectedMonth] = useState("")
  const { pl, isLoading: loadingPL } = usePL()
  const { revenue, isLoading: loadingRevenue } = useRevenue()
  const { expenses, isLoading: loadingExpenses } = useExpenses()

  // Initialize selectedMonth to first available P&L month
  useEffect(() => {
    if (pl && pl.length > 0 && !selectedMonth) {
      setSelectedMonth(pl[0].fields["Month & Year"] || "")
    }
  }, [pl, selectedMonth])

  const monthlyData = useMemo(() => {
    const plRow = pl.find((p) => p.fields["Month & Year"] === selectedMonth) || {}
    const monthRevenue = revenue.filter((r) => r.fields["Month & Year"] === selectedMonth)
    const monthExpenses = expenses.filter((e) => e.fields["Month & Year"] === selectedMonth)

    const totalRevenue = parseFloat(plRow.fields?.["Total Revenue"] || "0")
    const totalExpenses = parseFloat(plRow.fields?.["Total Expense"] || "0")
    const netProfit = parseFloat(plRow.fields?.["Net Profit"] || "0")
    const ebitda = parseFloat(plRow.fields?.["Adjusted Profit"] || "0")
    const grossMargin = parseFloat(plRow.fields?.["Gross Margin"] || "0")
    const ebitdaMargin = parseFloat(plRow.fields?.["Revenue Growth %"] || "0")

    const totalMRR = monthRevenue
      .filter((r) => r.fields["Monthly Recurring Revenue"] === "Yes")
      .reduce((sum, r) => sum + (parseFloat(r.fields["Amount USD"] || "0") || 0), 0)

    return {
      totalRevenue,
      totalMRR,
      totalExpenses,
      netProfit,
      ebitda,
      grossMargin,
      ebitdaMargin,
      monthRevenue,
      monthExpenses,
    }
  }, [pl, revenue, expenses, selectedMonth])

  const revenueByCategory = useMemo(() => {
    const categories: Record<string, number> = {}
    monthlyData.monthRevenue.forEach((r) => {
      const cat = r.fields["Category (from Category)"] || r.fields.Category || "Other"
      categories[cat] = (categories[cat] || 0) + (parseFloat(r.fields["Amount USD"] || "0") || 0)
    })
    const data = Object.entries(categories).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    return organizePieChartData(data)
  }, [monthlyData])

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {}
    monthlyData.monthExpenses.forEach((e) => {
      const cat = e.fields["Category (from Category)"] || e.fields.Category || "Other"
      categories[cat] = (categories[cat] || 0) + (parseFloat(e.fields.Expense || "0") || 0)
    })
    const data = Object.entries(categories).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    return organizePieChartData(data)
  }, [monthlyData])

  const chartData = useMemo(() => {
    return [
      { category: "Revenue", amount: monthlyData.totalRevenue },
      { category: "Expenses", amount: monthlyData.totalExpenses },
    ]
  }, [monthlyData])

  const isLoading = loadingPL || loadingRevenue || loadingExpenses

  if (isLoading || !selectedMonth) {
    return <div className="text-center text-muted-foreground">Loading data...</div>
  }

  const monthOptions = (pl || []).map((p) => p.fields["Month & Year"]).filter(Boolean)

  return (
    <div>
      <LoadingOverlay isLoading={loadingPL || loadingRevenue || loadingExpenses} />
      <div className={loadingPL || loadingRevenue || loadingExpenses ? "opacity-50 pointer-events-none" : ""}>
        <div>
          {pl.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No data available for the selected period</div>
          ) : (
            <div>
              <div className="py-4">
                <div className="flex flex-col gap-2 max-w-sm">
                  <Label className="text-sm">Select Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month} value={month || ""}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 1: 3 KPI Cards */}
              <DashboardGrid cols={3}>
                <MetricCard title="Total Revenue" value={`$${monthlyData.totalRevenue.toFixed(0)}`} variant="revenue" />
                <MetricCard title="Total MRR" value={`$${monthlyData.totalMRR.toFixed(0)}`} variant="mrr" />
                <MetricCard title="Total Expenses" value={`$${monthlyData.totalExpenses.toFixed(0)}`} variant="expenses" />
              </DashboardGrid>

              {/* Row 2: 4 KPI Cards */}
              <DashboardGrid cols={4}>
                <MetricCard 
                  title={
                    <>
                      Net Profit <span className="text-gray-500 font-normal">- After Taxes & Reserve Allocations</span>
                    </>
                  } 
                  value={`$${monthlyData.netProfit.toFixed(0)}`} 
                  variant="profit" 
                />
                <MetricCard 
                  title={
                    <>
                      EBITDA <span className="text-gray-500 font-normal">- Before Taxes & Revenue Allocation</span>
                    </>
                  } 
                  value={`$${monthlyData.ebitda.toFixed(0)}`} 
                  variant="ebitda" 
                />
                <MetricCard title="EBITDA Margin %" value={`${monthlyData.ebitdaMargin}%`} variant="margin" />
                <MetricCard title="Gross Margin %" value={`${monthlyData.grossMargin}%`} variant="margin" />
              </DashboardGrid>

              {/* Charts - with margin between rows */}
              <DashboardGrid cols={2}>
                <GraphCard title="Revenue vs Expenses" description="Comparison of total revenue and expenses for the selected month">
                  {monthlyData.totalRevenue === 0 && monthlyData.totalExpenses === 0 ? (
                    <EmptyChart height={300} />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[{ name: "Amount", revenue: monthlyData.totalRevenue, expenses: monthlyData.totalExpenses }]} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis 
                          tick={{ fontSize: 10, fill: "#666" }}
                          width={45}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          label={{ value: "Amount", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
                        />
                        <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                        <Bar dataKey="revenue" fill="#0891b2" />
                        <Bar dataKey="expenses" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </GraphCard>

                <FinancialCard title="Revenue Category Breakdown" description="Revenue distribution across categories for the selected month">
                  {revenueByCategory.length === 0 ? (
                    <EmptyChart height={280} />
                  ) : (
                    <DefaultPieChart 
                      data={revenueByCategory}
                      colors={COLORS}
                      height={280}
                      valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
                    />
                  )}
                </FinancialCard>
              </DashboardGrid>

              <DashboardGrid cols={1}>
                <FinancialCard title="Expense Category Breakdown" description="Expense distribution across categories for the selected month">
                {expensesByCategory.length === 0 ? (
                  <EmptyChart height={280} />
                ) : (
                  <DefaultPieChart 
                    data={expensesByCategory}
                    colors={COLORS}
                    height={280}
                    valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
                  />
                )}
                </FinancialCard>
              </DashboardGrid>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
