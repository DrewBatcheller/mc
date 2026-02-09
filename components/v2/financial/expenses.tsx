"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useExpenses } from "@/hooks/v2/use-financial"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyChart } from "./empty-chart"
import { FinancialCard } from "./financial-card"
import { GraphCard } from "@/components/v2/graph-card"
import { DefaultPieChart } from "@/components/v2/default-pie-chart"
import { LoadingOverlay } from "@/components/v2/loading-overlay"
import { organizePieChartData } from "@/lib/v2/pie-chart-utils"
import { DashboardGrid } from "@/components/v2/dashboard-grid"

const COLORS = ["#0891b2", "#06b6d4", "#0ea5e9", "#0d9488", "#10b981", "#14b8a6"]

// Helper to filter records by date range
const filterByDateRange = (records: any[], startDate: string, endDate: string) => {
  if (!startDate || !endDate) return records
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999) // Include entire end date
  
  return records.filter((r) => {
    const recordDate = new Date(r.fields.Date || "")
    return recordDate >= start && recordDate <= end
  })
}

export function Expenses() {
  const { expenses, isLoading } = useExpenses()
  const today = new Date().toISOString().split("T")[0]
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const expensesLoading = isLoading; // Declare expensesLoading variable
  
  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)

  const filteredExpenses = useMemo(() => {
    return filterByDateRange(expenses, startDate, endDate)
  }, [expenses, startDate, endDate])

  const monthlyData = useMemo(() => {
    const months: Record<string, any> = {}

    filteredExpenses.forEach((e) => {
      const date = new Date(e.fields.Date || "")
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, totalExpenses: 0 }
      }

      const amount = parseFloat(e.fields.Expense || "0") || 0
      months[monthKey].totalExpenses += amount
    })

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => {
        const [year, month] = data.month.split("-")
        const monthNum = parseInt(month)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return {
          month: `${monthNames[monthNum - 1]} ${year}`,
          totalExpenses: Math.round(data.totalExpenses),
        }
      })
  }, [filteredExpenses])

  const metrics = useMemo(() => {
    const vendorBreakdown: Record<string, number> = {}
    const categoryBreakdown: Record<string, number> = {}

    filteredExpenses.forEach((e) => {
      const amount = parseFloat(e.fields.Expense || "0")
      const vendorName = e.fields["Vendor (from Vendor)"] || e.fields.Vendor || "Unknown"
      const category = e.fields["Category (from Category)"] || e.fields.Category || "Other"

      vendorBreakdown[vendorName] = (vendorBreakdown[vendorName] || 0) + amount
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount
    })

    const vendorArray = organizePieChartData(
      Object.entries(vendorBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    )

    const categoryArray = organizePieChartData(
      Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    )

    return { vendorArray, categoryArray }
  }, [filteredExpenses])

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading expenses data...</div>
  }

  return (
    <div>
      <LoadingOverlay isLoading={expensesLoading} />
      <div className={expensesLoading ? "opacity-50 pointer-events-none" : ""}>
        <div>
          {/* Date Range Filter */}
          <div className="py-4">
            <div className="flex flex-row gap-4 max-w-2xl">
              <div className="flex-1">
                <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date" className="text-sm">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
            </div>
          </div>

          {/* Top Charts */}
          <DashboardGrid cols={2}>
            <GraphCard title="Expenses Over Time" description="Monthly expenses trend">
              {monthlyData.length === 0 ? (
                <EmptyChart height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      angle={-45} 
                      textAnchor="end" 
                      tick={{ fontSize: 10, fill: "#666" }}
                      height={55}
                      label={{ value: "Month", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: "#666" }}
                      width={45}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      label={{ value: "Expenses", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
                    />
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                    <Line type="linear" dataKey="totalExpenses" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </GraphCard>

            <FinancialCard title="Expenses by Category Breakdown" description="Category expense distribution">
              {metrics.categoryArray.length === 0 ? (
                <EmptyChart height={300} />
              ) : (
                <DefaultPieChart 
                  data={metrics.categoryArray}
                  colors={COLORS}
                  height={280}
                  valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
                />
              )}
            </FinancialCard>
          </DashboardGrid>

          {/* Two Pie Charts */}
          <DashboardGrid cols={2}>
            <FinancialCard title="Total Expenses by Vendor" description="Vendor expense breakdown">
              {metrics.vendorArray.length === 0 ? (
                <EmptyChart height={280} />
              ) : (
                <DefaultPieChart 
                  data={metrics.vendorArray}
                  colors={COLORS}
                  height={280}
                  valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
                />
              )}
            </FinancialCard>

            <FinancialCard title="Total Expenses by Category" description="Category expense breakdown">
              {metrics.categoryArray.length === 0 ? (
                <EmptyChart height={280} />
              ) : (
                <DefaultPieChart 
                  data={metrics.categoryArray}
                  colors={COLORS}
                  height={280}
                  valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
                />
              )}
            </FinancialCard>
          </DashboardGrid>

          {/* Expenses Table */}
          <Card className="mt-2">
            <CardHeader>
              <CardTitle>All Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No data for selected time period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Expense</th>
                        <th className="text-left py-2 px-4">Statement Name</th>
                        <th className="text-left py-2 px-4">Date</th>
                        <th className="text-left py-2 px-4">Vendor</th>
                        <th className="text-left py-2 px-4">Category</th>
                        <th className="text-center py-2 px-4">Recurring?</th>
                        <th className="text-center py-2 px-4">Op Expense?</th>
                        <th className="text-left py-2 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.slice(0, 50).map((e, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4 font-semibold">${parseFloat(e.fields.Expense || "0").toFixed(2)}</td>
                          <td className="py-2 px-4 truncate">{e.fields["Statement Name"]}</td>
                          <td className="py-2 px-4">{e.fields.Date}</td>
                          <td className="py-2 px-4">{e.fields["Vendor (from Vendor)"] || e.fields.Vendor}</td>
                          <td className="py-2 px-4">{e.fields["Category (from Category)"] || e.fields.Category}</td>
                          <td className="py-2 px-4 text-center">{e.fields["Recurring?"] === "Yes" ? "✓" : ""}</td>
                          <td className="py-2 px-4 text-center">{e.fields["Op Expense"] === "Yes" ? "✓" : ""}</td>
                          <td className="py-2 px-4 text-xs text-muted-foreground truncate">{e.fields.Notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
