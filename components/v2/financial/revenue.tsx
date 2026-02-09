"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRevenue } from "@/hooks/v2/use-financial"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyChart } from "./empty-chart"
import { FinancialCard } from "./financial-card"
import { GraphCard } from "@/components/v2/graph-card"
import { DefaultPieChart } from "@/components/v2/default-pie-chart"
import { DefaultLineChart } from "@/components/v2/default-line-chart"
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

export function Revenue() {
  const { revenue, isLoading } = useRevenue()
  const today = new Date().toISOString().split("T")[0]
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const [revenueLoading, setRevenueLoading] = useState(false); // Declare revenueLoading variable
  
  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)

  const filteredRevenue = useMemo(() => {
    return filterByDateRange(revenue, startDate, endDate)
  }, [revenue, startDate, endDate])

  const monthlyData = useMemo(() => {
    const months: Record<string, any> = {}

    filteredRevenue.forEach((r) => {
      const date = new Date(r.fields.Date || "")
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, revenue: 0, count: 0 }
      }

      const amount = parseFloat(r.fields["Amount USD"] || "0") || 0
      months[monthKey].revenue += amount
      months[monthKey].count += 1
    })

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => {
        const [year, month] = data.month.split("-")
        const monthNum = parseInt(month)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return {
          month: `${monthNames[monthNum - 1]} ${year}`,
          revenue: Math.round(data.revenue),
          avgRevenue: Math.round(data.revenue / data.count),
        }
      })
  }, [filteredRevenue])

  const metrics = useMemo(() => {
    const topClients: Record<string, number> = {}
    const categoryBreakdown: Record<string, number> = {}
    let totalMRR = 0
    let totalUpsell = 0
    let totalOther = 0

    filteredRevenue.forEach((r) => {
      const amount = parseFloat(r.fields["Amount USD"] || "0")
      const clientName = r.fields["Brand Name (from Client)"] || r.fields.Client || "Unknown"
      topClients[clientName] = (topClients[clientName] || 0) + amount

      const category = r.fields["Category (from Category)"] || r.fields.Category || "Other"
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount

      if (r.fields["Monthly Recurring Revenue"] === "Yes") {
        totalMRR += amount
      } else if (r.fields["Upsell Revenue"] === "Yes") {
        totalUpsell += amount
      } else {
        totalOther += amount
      }
    })

    const topClientsArray = Object.entries(topClients)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))

    const categoryArray = organizePieChartData(
      Object.entries(categoryBreakdown).map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
      }))
    )

    const revenueType = organizePieChartData([
      { name: "MRR", value: parseFloat(totalMRR.toFixed(2)) },
      { name: "Upsell", value: parseFloat(totalUpsell.toFixed(2)) },
      { name: "Other", value: parseFloat(totalOther.toFixed(2)) },
    ])

    return { topClientsArray, categoryArray, revenueType }
  }, [filteredRevenue])

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading revenue data...</div>
  }

  return (
    <div>
      <LoadingOverlay isLoading={revenueLoading} />
      <div className={revenueLoading ? "opacity-50 pointer-events-none" : ""}>
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
            <GraphCard title="Revenue Over Time" description="Monthly revenue trend">
              {monthlyData.length === 0 ? (
                <EmptyChart height={300} />
              ) : (
                <DefaultLineChart
                  data={monthlyData}
                  lines={[{ dataKey: "revenue", stroke: "#0891b2", name: "Revenue" }]}
                  xAxisLabel="Month"
                  yAxisLabel="Revenue"
                  yAxisFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tooltipFormatter={(value) => `$${Number(value).toFixed(0)}`}
                  height={300}
                />
              )}
            </GraphCard>

            <GraphCard title="Average Revenue per Client Over Time" description="Revenue per client trend">
              {monthlyData.length === 0 ? (
                <EmptyChart height={300} />
              ) : (
                <DefaultLineChart
                  data={monthlyData}
                  lines={[{ dataKey: "avgRevenue", stroke: "#06b6d4", name: "Avg Revenue" }]}
                  xAxisLabel="Month"
                  yAxisLabel="Avg Revenue"
                  yAxisFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tooltipFormatter={(value) => `$${Number(value).toFixed(0)}`}
                  height={300}
                />
              )}
            </GraphCard>
          </DashboardGrid>

          {/* Three Cards Row */}
          <DashboardGrid cols={3}>
            <FinancialCard title="Top Clients by Revenue" description="Revenue per client">
              {metrics.topClientsArray.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No data for selected time period</div>
              ) : (
                <div className="space-y-2">
                  {metrics.topClientsArray.map((client, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs truncate">{client.name}</span>
                      <span className="text-xs font-semibold">${client.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </FinancialCard>

            <FinancialCard title="Revenue by Category" description="Category breakdown">
              {metrics.categoryArray.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No data for selected time period</div>
              ) : (
                <div className="space-y-2">
                  {metrics.categoryArray.slice(0, 5).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs truncate">{cat.name}</span>
                      <span className="text-xs font-semibold">${cat.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </FinancialCard>

            <FinancialCard title="MRR v Upsell v Other" description="Revenue type distribution">
              {metrics.revenueType.some(r => r.value > 0) ? (
                <DefaultPieChart 
                  data={metrics.revenueType}
                  colors={COLORS}
                  height={280}
                  valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
                />
              ) : (
                <EmptyChart height={280} />
              )}
            </FinancialCard>
          </DashboardGrid>

          {/* Revenue Details Table */}
          <Card className="mt-2">
            <CardHeader>
              <CardTitle>Revenue Details</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRevenue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No data for selected time period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Name</th>
                        <th className="text-left py-2 px-4">Client</th>
                        <th className="text-left py-2 px-4">Date</th>
                        <th className="text-right py-2 px-4">Amount USD</th>
                        <th className="text-right py-2 px-4">Fees USD</th>
                        <th className="text-right py-2 px-4">Conversion Rate</th>
                        <th className="text-right py-2 px-4">Amount CAD</th>
                        <th className="text-right py-2 px-4">Fees CAD</th>
                        <th className="text-left py-2 px-4">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRevenue.slice(0, 50).map((r, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4 truncate">{r.fields.Entry}</td>
                          <td className="py-2 px-4">{r.fields["Brand Name (from Client)"] || r.fields.Client}</td>
                          <td className="py-2 px-4">{r.fields.Date}</td>
                          <td className="text-right py-2 px-4">${parseFloat(r.fields["Amount USD"] || "0").toFixed(2)}</td>
                          <td className="text-right py-2 px-4">${parseFloat(r.fields["Fees USD"] || "0").toFixed(2)}</td>
                          <td className="text-right py-2 px-4">{r.fields["Conversion Rate (USD>CAD)"]}</td>
                          <td className="text-right py-2 px-4">${parseFloat(r.fields["Amount CAD"] || "0").toFixed(2)}</td>
                          <td className="text-right py-2 px-4">${parseFloat(r.fields["Fees CAD"] || "0").toFixed(2)}</td>
                          <td className="py-2 px-4">{r.fields["Category (from Category)"] || r.fields.Category}</td>
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
