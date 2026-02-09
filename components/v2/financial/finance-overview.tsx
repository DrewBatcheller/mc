"use client"

import { Label } from "@/components/ui/label"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { usePL, useRevenue, useExpenses } from "@/hooks/v2/use-financial"
import { EmptyChart } from "./empty-chart"
import { FinancialCard } from "./financial-card"
import { GraphCard } from "@/components/v2/graph-card"
import { MetricCard } from "./metric-card"
import { DefaultPieChart } from "@/components/v2/default-pie-chart"
import { LoadingOverlay } from "@/components/v2/loading-overlay"
import { organizePieChartData } from "@/lib/v2/pie-chart-utils"
import { DashboardGrid } from "@/components/v2/dashboard-grid"

const COLORS = ["#0d9488", "#0891b2", "#2563eb", "#059669", "#0ea5e9", "#14b8a6"]

const renderCustomLabel = (props: any) => {
  try {
    const { cx, cy, midAngle, outerRadius, percent } = props
    
    if (cx === undefined || cy === undefined || midAngle === undefined || outerRadius === undefined) {
      return null
    }
    
    const RADIAN = Math.PI / 180
    const labelRadius = outerRadius * 0.65
    const x2 = cx + labelRadius * Math.cos((midAngle * RADIAN))
    const y2 = cy + labelRadius * Math.sin((midAngle * RADIAN))

    return (
      <text 
        x={x2} 
        y={y2} 
        fill="black" 
        textAnchor="middle" 
        dominantBaseline="central" 
        fontSize="12" 
        fontWeight="bold"
        pointerEvents="none"
      >
        {`${((percent || 0) * 100).toFixed(0)}%`}
      </text>
    )
  } catch (error) {
    console.log("[v0] renderCustomLabel error:", error)
    return null
  }
}

export const FinanceOverview = () => {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const { pl, isLoading: plLoading } = usePL()
  const { revenue, isLoading: revenueLoading } = useRevenue()
  const { expenses, isLoading: expensesLoading } = useExpenses()

  const filteredPL = useMemo(() => {
    if (yearFilter === "all") {
      return pl || []
    }
    return (pl || []).filter((row) => {
      const monthYear = String(row.fields["Month & Year"] || "")
      return monthYear.includes(yearFilter)
    })
  }, [pl, yearFilter])

  const filteredRevenue = useMemo(() => {
    if (yearFilter === "all") {
      return revenue || []
    }
    return (revenue || []).filter((r) => {
      const monthYear = String(r.fields["Month & Year"] || "")
      return monthYear.includes(yearFilter)
    })
  }, [revenue, yearFilter])

  const filteredExpenses = useMemo(() => {
    if (yearFilter === "all") {
      return expenses || []
    }
    return (expenses || []).filter((e) => {
      const monthYear = String(e.fields["Month & Year"] || "")
      return monthYear.includes(yearFilter)
    })
  }, [expenses, yearFilter])

  const metrics = useMemo(() => {
    let totalRevenue = 0
    let totalExpenses = 0
    let processingFees = 0
    let netProfit = 0
    let ebitda = 0
    let ebitdaMargin = 0
    let grossMargin = 0

    filteredPL.forEach((row) => {
      totalRevenue += parseFloat(row.fields["Total Revenue"] || "0")
      totalExpenses += parseFloat(row.fields["Total Expense"] || "0")
      netProfit += parseFloat(row.fields["Net Profit"] || "0")
      ebitda += parseFloat(row.fields["Adjusted Profit"] || "0")
      ebitdaMargin += parseFloat(row.fields["Revenue Growth %"] || "0")
      grossMargin += parseFloat(row.fields["Gross Margin"] || "0")
    })

    processingFees = filteredRevenue.reduce((sum, r) => sum + (parseFloat(r.fields["Fees USD"] || "0") || 0), 0)

    const avgEbitdaMargin = filteredPL.length > 0 ? (ebitdaMargin / filteredPL.length).toFixed(2) : "0"
    const avgGrossMargin = filteredPL.length > 0 ? (grossMargin / filteredPL.length).toFixed(2) : "0"
    const totalMRR = filteredRevenue.filter((r) => r.fields["Monthly Recurring Revenue"] === "Yes").reduce((sum, r) => sum + (parseFloat(r.fields["Amount USD"] || "0") || 0), 0)

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalMRR: totalMRR.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      processingFees: processingFees.toFixed(2),
      ebitda: ebitda.toFixed(2),
      netProfit: netProfit.toFixed(2),
      ebitdaMargin: avgEbitdaMargin,
      grossMargin: avgGrossMargin,
    }
  }, [filteredPL, filteredRevenue])

  const MONTH_ORDER: Record<string, number> = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const monthlyCharts = useMemo(() => {
    const months: Record<string, any> = {}

    // Build from P&L data first (primary source of truth)
    filteredPL.forEach((row) => {
      const monthYear = String(row.fields["Month & Year"] || "")
      const date = new Date(monthYear || "")
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          mrrGrowth: 0,
          revenueGrowth: 0,
        }
      }

      // Use P&L Total Revenue and Total Expense
      months[monthKey].revenue = parseFloat(row.fields["Total Revenue"] || "0") || 0
      months[monthKey].expenses = parseFloat(row.fields["Total Expense"] || "0") || 0
      months[monthKey].netProfit = parseFloat(row.fields["Net Profit"] || "0") || 0
    })

    // Add MRR data from revenue records
    filteredRevenue.forEach((r) => {
      const date = new Date(r.fields.Date || "")
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          mrrGrowth: 0,
          revenueGrowth: 0,
        }
      }

      if (r.fields["Monthly Recurring Revenue"] === "Yes") {
        months[monthKey].mrrGrowth += parseFloat(r.fields["Amount USD"] || "0") || 0
      }
    })

    // Calculate revenue growth (dollar amount month over month)
    const sortedMonths = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]))
    let previousRevenue = 0

    sortedMonths.forEach(([_, data], idx) => {
      if (idx > 0) {
        data.revenueGrowth = data.revenue - previousRevenue
      }
      previousRevenue = data.revenue
    })

    // Sort and format
    return sortedMonths
      .map(([_, data]) => {
        const [year, month] = data.month.split("-")
        const monthNum = parseInt(month)
        return {
          ...data,
          month: `${monthNames[monthNum - 1]} ${year}`,
        }
      })
      .sort((a, b) => {
        const [yearA, monthStrA] = a.month.split(" ")
        const [yearB, monthStrB] = b.month.split(" ")
        const monthA = monthNames.indexOf(monthStrA)
        const monthB = monthNames.indexOf(monthStrB)
        if (parseInt(yearA) !== parseInt(yearB)) return parseInt(yearA) - parseInt(yearB)
        return monthA - monthB
      })
  }, [filteredPL, filteredRevenue])

  const revenueByCategory = useMemo(() => {
    const categories: Record<string, number> = {}
    filteredRevenue.forEach((r) => {
      const cat = r.fields["Category (from Category)"] || r.fields.Category || "Other"
      categories[cat] = (categories[cat] || 0) + (parseFloat(r.fields["Amount USD"] || "0") || 0)
    })
    const data = Object.entries(categories).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    return organizePieChartData(data)
  }, [filteredRevenue])

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {}
    filteredExpenses.forEach((e) => {
      const cat = e.fields["Category (from Category)"] || e.fields.Category || "Other"
      categories[cat] = (categories[cat] || 0) + (parseFloat(e.fields.Expense || "0") || 0)
    })
    const data = Object.entries(categories).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    return organizePieChartData(data)
  }, [filteredExpenses])

  return (
    <div>
      <LoadingOverlay isLoading={plLoading || revenueLoading || expensesLoading} />
      <div className={plLoading || revenueLoading || expensesLoading ? "opacity-50 pointer-events-none" : ""}>
        <div className="py-4">
          <div className="flex flex-col gap-2 max-w-sm">
            <Label className="text-sm">Select Date Range</Label>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 8 KPI Cards */}
        <DashboardGrid cols={4}>
          <MetricCard title="Total Revenue" value={`$${metrics.totalRevenue}`} variant="revenue" />
          <MetricCard title="Total MRR" value={`$${metrics.totalMRR}`} variant="mrr" />
          <MetricCard title="Total Expenses" value={`$${metrics.totalExpenses}`} variant="expenses" />
          <MetricCard title="Processing Fees" value={`$${metrics.processingFees}`} variant="expenses" />
          <MetricCard 
            title={
              <>
                EBITDA <span className="text-gray-500 font-normal">- Before Taxes & Revenue Allocation</span>
              </>
            } 
            value={`$${metrics.ebitda}`} 
            variant="ebitda" 
          />
          <MetricCard 
            title={
              <>
                Net Profit <span className="text-gray-500 font-normal">- After Taxes & Reserve Allocations</span>
              </>
            } 
            value={`$${metrics.netProfit}`} 
            variant="profit" 
          />
          <MetricCard title="EBITDA Margin %" value={`${metrics.ebitdaMargin}%`} variant="margin" />
          <MetricCard title="Gross Margin %" value={`${metrics.grossMargin}%`} variant="margin" />
        </DashboardGrid>

        {/* Row 3: Charts - Revenue by Month & Net Profit Trend */}
        <DashboardGrid cols={2}>
          <GraphCard title="Revenue by Month" description="Monthly revenue, expenses, and net profit for the selected year">
            {monthlyCharts.length === 0 ? (
              <EmptyChart height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyCharts} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    tick={{ fontSize: 10, fill: "#666" }}
                    interval={0}
                    height={55}
                    label={{ value: "Month & Year", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#666" }}
                    width={45}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    label={{ value: "Revenue", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                  <Line type="linear" dataKey="revenue" stroke="#0d9488" strokeWidth={1.5} dot={false} name="Revenue" />
                  <Line type="linear" dataKey="expenses" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Expenses" />
                  <Line type="linear" dataKey="netProfit" stroke="#059669" strokeWidth={1.5} dot={false} name="Net Profit" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </GraphCard>

          <GraphCard title="Net Profit Trend" description="Monthly net profit values for the selected year">
            {monthlyCharts.length === 0 ? (
              <EmptyChart height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyCharts} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    tick={{ fontSize: 10, fill: "#666" }}
                    interval={0}
                    height={55}
                    label={{ value: "Month & Year", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#666" }}
                    width={45}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    label={{ value: "Net Profit", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                  <Line type="linear" dataKey="netProfit" stroke="#059669" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </GraphCard>
        </DashboardGrid>

        {/* Row 4: Charts - Revenue Growth & MRR Growth */}
        <DashboardGrid cols={2}>
          <GraphCard title="Revenue Growth" description="Month-over-month revenue change in dollars for the selected year">
            {monthlyCharts.length === 0 ? (
              <EmptyChart height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyCharts} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    tick={{ fontSize: 10, fill: "#666" }}
                    interval={0}
                    height={55}
                    label={{ value: "Month & Year", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#666" }}
                    width={45}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    label={{ value: "Revenue Growth ($)", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                  <Line type="linear" dataKey="revenueGrowth" stroke="#10b981" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </GraphCard>

          <GraphCard title="MRR Growth by Month" description="Monthly Recurring Revenue trend for the selected year">
            {monthlyCharts.length === 0 ? (
              <EmptyChart height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyCharts} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    tick={{ fontSize: 10, fill: "#666" }}
                    interval={0}
                    height={55}
                    label={{ value: "Month & Year", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#666" }}
                    width={45}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    label={{ value: "MRR Growth", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
                  />
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                  <Line type="linear" dataKey="mrrGrowth" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </GraphCard>
        </DashboardGrid>

        {/* Pie Charts with Legend */}
        <DashboardGrid cols={2}>
          <FinancialCard title="Revenue by Category" description="Revenue distribution across categories">
            {revenueByCategory.length === 0 ? (
              <EmptyChart height={380} />
            ) : (
              <DefaultPieChart 
                data={revenueByCategory} 
                colors={COLORS}
                height={320}
                valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
              />
            )}
          </FinancialCard>

          <FinancialCard title="Expense by Category" description="Expense distribution across categories">
            {expensesByCategory.length === 0 ? (
              <EmptyChart height={380} />
            ) : (
              <DefaultPieChart 
                data={expensesByCategory} 
                colors={COLORS}
                height={320}
                valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
              />
            )}
          </FinancialCard>
        </DashboardGrid>
      </div>
    </div>
  )
}
