"use client"

import { Label } from "@/components/ui/label"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useReserves } from "@/hooks/v2/use-financial"
import { FinancialCard } from "./financial-card"
import { GraphCard } from "@/components/v2/graph-card"
import { DefaultPieChart } from "@/components/v2/default-pie-chart"
import { MetricCard } from "./metric-card"
import { LoadingOverlay } from "@/components/v2/loading-overlay"
import { organizePieChartData } from "@/lib/v2/pie-chart-utils"
import { DashboardGrid } from "@/components/v2/dashboard-grid"

const COLORS = ["#0891b2", "#06b6d4", "#0ea5e9", "#0d9488", "#10b981", "#14b8a6"]

// Helper to extract year from "Month Year" format (e.g., "February 2026" -> "2026")
const extractYearFromMonthYear = (monthYear: string): string => {
  const match = String(monthYear).match(/(\d{4})/)
  return match ? match[1] : ""
}

export function Reserves() {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const { reserves, isLoading } = useReserves()

  const filteredData = useMemo(() => {
    if (reserves.length === 0) return []
    
    const filterYear = parseInt(yearFilter)
    return reserves.filter((r) => {
      let monthYear = r.fields["Month & Year (from Month & Year)"]
      if (!monthYear) return false
      // Handle if it's an array (linked field from Airtable)
      if (Array.isArray(monthYear)) {
        monthYear = monthYear[0]
      }
      if (typeof monthYear === 'string') {
        const year = parseInt(monthYear.split(" ")[1])
        return yearFilter === "all" || year === filterYear
      }
      return false
    })
  }, [reserves, yearFilter])

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    reserves.forEach((r) => {
      let monthYear = r.fields["Month & Year (from Month & Year)"]
      if (monthYear) {
        // Handle if it's an array (linked field from Airtable)
        if (Array.isArray(monthYear)) {
          monthYear = monthYear[0]
        }
        if (typeof monthYear === 'string') {
          const year = parseInt(monthYear.split(" ")[1])
          if (!isNaN(year)) years.add(year)
        }
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [reserves])

  const metrics = useMemo(() => {
    let currentBalance = 0
    let totalAllocated = 0
    let totalDeallocated = 0

    filteredData.forEach((r) => {
      currentBalance = parseFloat(r.fields["New Account Balance"] || "0") || 0
      const allocated = parseFloat(r.fields["Allocated Amount"] || "0") || 0
      totalAllocated += allocated > 0 ? allocated : 0
      totalDeallocated += allocated < 0 ? Math.abs(allocated) : 0
    })

    return {
      currentBalance,
      totalAllocated,
      totalDeallocated,
    }
  }, [filteredData])

  const transactionTypes = useMemo(() => {
    const types: Record<string, number> = {}
    filteredData.forEach((r) => {
      const type = r.fields["Category (from Category)"] || "Unknown"
      const amount = Math.abs(parseFloat(r.fields["Allocated Amount"] || "0"))
      types[type] = (types[type] || 0) + amount
    })
    const data = Object.entries(types).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))
    return organizePieChartData(data)
  }, [filteredData])

  const balanceGrowth = useMemo(() => {
    const data: Array<{ month: string; balance: number }> = []
    const seen = new Set<string>()

    filteredData
      .sort((a, b) => {
        const dateA = new Date(a.fields["Month & Year (from Month & Year)"] || "")
        const dateB = new Date(b.fields["Month & Year (from Month & Year)"] || "")
        return dateA.getTime() - dateB.getTime()
      })
      .forEach((r) => {
        const monthKey = r.fields["Month & Year (from Month & Year)"] || "Unknown"
        if (!seen.has(monthKey)) {
          seen.add(monthKey)
          data.push({
            month: monthKey,
            balance: parseFloat(r.fields["New Account Balance"] || "0"),
          })
        }
      })

    return data
  }, [filteredData])

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading reserve data...</div>
  }

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} />
      <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
        <div>
          <div className="py-4">
            <div className="flex flex-col gap-2 max-w-sm">
              <Label className="text-sm">Select Date Range</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <DashboardGrid cols={3}>
            <MetricCard title="Current Reserve Balance" value={`$${metrics.currentBalance.toFixed(2)}`} />
            <MetricCard title="Reserve Allocations" value={`$${metrics.totalAllocated.toFixed(2)}`} />
            <MetricCard title="Reserve Deallocations" value={`$${metrics.totalDeallocated.toFixed(2)}`} />
          </DashboardGrid>

          {/* Charts */}
          <DashboardGrid cols={2}>
            <GraphCard title="Reserve Account Balance Growth Over Time" description="Balance trend over time">
              {balanceGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={balanceGrowth} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
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
                      label={{ value: "Balance", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }}
                    />
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                    <Line type="linear" dataKey="balance" stroke="#0891b2" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">No data for selected time period</div>
              )}
            </GraphCard>

            <FinancialCard title="Reserve Transactions by Type" description="Transaction breakdown">
              {transactionTypes.length > 0 ? (
                <DefaultPieChart 
                  data={transactionTypes}
                  colors={COLORS}
                  height={280}
                  valueFormatter={(value) => `$${Number(value).toFixed(0)}`}
                />
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">No transaction data available</div>
              )}
            </FinancialCard>
          </DashboardGrid>

          {/* Reserve Ledger Table */}
          <Card className="mt-2">
            <CardHeader>
              <CardTitle>Reserve Ledger Movements</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-center">
                  <p className="text-gray-500 font-medium">No data for selected time period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Month & Year</th>
                        <th className="text-left py-2 px-4">Category</th>
                        <th className="text-right py-2 px-4">Allocated Amount</th>
                        <th className="text-right py-2 px-4">Actual Allocation</th>
                        <th className="text-right py-2 px-4">New Account Balance</th>
                        <th className="text-center py-2 px-4">Transferred</th>
                        <th className="text-right py-2 px-4">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((r, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{r.fields["Month & Year (from Month & Year)"]}</td>
                          <td className="py-2 px-4">{r.fields["Category (from Category)"]}</td>
                          <td className="text-right py-2 px-4">${parseFloat(r.fields["Allocated Amount"] || "0").toFixed(2)}</td>
                          <td className="text-right py-2 px-4">${parseFloat(r.fields["Actual Allocation*"] || "0").toFixed(2)}</td>
                          <td className="text-right py-2 px-4">${parseFloat(r.fields["New Account Balance"] || "0").toFixed(2)}</td>
                          <td className="text-center py-2 px-4">{r.fields["Allocation Transferred"] === "checked" ? "✓" : ""}</td>
                          <td className="text-right py-2 px-4 text-xs">${parseFloat(r.fields["Variance $"] || "0").toFixed(2)}</td>
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
