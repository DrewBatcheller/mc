"use client"

import { Label } from "@/components/ui/label"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDividends } from "@/hooks/v2/use-financial"
import { TrendingUp, Rocket } from "lucide-react"
import { LoadingOverlay } from "@/components/v2/loading-overlay"
import { MetricCard } from "./metric-card"
import { DashboardGrid } from "@/components/v2/dashboard-grid"

// Helper to extract year from "Month Year" format (e.g., "February 2026" -> "2026")
const extractYearFromMonthYear = (monthYear: string): string => {
  const match = String(monthYear).match(/(\d{4})/)
  return match ? match[1] : ""
}

export function Dividends() {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const { dividends, isLoading: dividendsLoading } = useDividends()
  const isLoading = dividendsLoading; // Declare isLoading variable

  const filteredData = useMemo(() => {
    const filtered = dividends.filter((d) => {
      const monthYear = String(d.fields["Month & Year (from Profit & Loss (Link))"] || "")
      const yearInData = extractYearFromMonthYear(monthYear)
      return yearInData === yearFilter || yearFilter === "all"
    })
    return filtered
  }, [dividends, yearFilter])

  const totals = useMemo(() => {
    let totalDividends = 0
    let connorDividends = 0
    let jaydenDividends = 0

    filteredData.forEach((d) => {
      const total = Array.isArray(d.fields["Dividends Total"]) ? d.fields["Dividends Total"][0] : d.fields["Dividends Total"]
      const connor = Array.isArray(d.fields.Connor) ? d.fields.Connor[0] : d.fields.Connor
      const jayden = Array.isArray(d.fields.Jayden) ? d.fields.Jayden[0] : d.fields.Jayden
      
      totalDividends += parseFloat(total || "0") || 0
      connorDividends += parseFloat(connor || "0") || 0
      jaydenDividends += parseFloat(jayden || "0") || 0
    })

    return { totalDividends, connorDividends, jaydenDividends }
  }, [filteredData])

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading dividends data...</div>
  }

  return (
    <div>
      <LoadingOverlay isLoading={dividendsLoading} />
      <div className={dividendsLoading ? "opacity-50 pointer-events-none" : ""}>
        <div>
          <div className="py-4">
            <div className="flex flex-col gap-2 max-w-sm">
              <Label className="text-sm">Select Date Range</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3 Cards */}
          <DashboardGrid cols={3}>
            <MetricCard 
              title={
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-green-600" />
                  <span>Total Dividend Payouts</span>
                </div>
              }
              value={`$${totals.totalDividends.toFixed(2)}`}
              variant="profit"
            />
            <MetricCard 
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>Dividend Payouts Connor</span>
                </div>
              }
              value={`$${totals.connorDividends.toFixed(2)}`}
              variant="profit"
            />
            <MetricCard 
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>Dividend Payouts Jayden</span>
                </div>
              }
              value={`$${totals.jaydenDividends.toFixed(2)}`}
              variant="profit"
            />
          </DashboardGrid>

          {/* Dividend Table */}
          <Card className="mt-2">
            <CardHeader>
              <CardTitle>Dividend Payouts</CardTitle>
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
                        <th className="text-right py-2 px-4">Total Dividend</th>
                        <th className="text-right py-2 px-4">Connor Dividend</th>
                        <th className="text-right py-2 px-4">Connor Paid</th>
                        <th className="text-right py-2 px-4">Jayden Dividend</th>
                        <th className="text-right py-2 px-4">Jayden Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row, idx) => {
                        const total = Array.isArray(row.fields["Dividends Total"]) ? row.fields["Dividends Total"][0] : row.fields["Dividends Total"]
                        const connor = Array.isArray(row.fields.Connor) ? row.fields.Connor[0] : row.fields.Connor
                        const jayden = Array.isArray(row.fields.Jayden) ? row.fields.Jayden[0] : row.fields.Jayden
                        
                        return (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">{row.fields["Month & Year (from Profit & Loss (Link))"]}</td>
                            <td className="text-right py-2 px-4">${parseFloat(total || "0").toFixed(2)}</td>
                            <td className="text-right py-2 px-4">${parseFloat(connor || "0").toFixed(2)}</td>
                            <td className="text-center py-2 px-4">{String(row.fields["Connor Paid"] || "").includes("checked") ? "✓" : ""}</td>
                            <td className="text-right py-2 px-4">${parseFloat(jayden || "0").toFixed(2)}</td>
                            <td className="text-center py-2 px-4">{String(row.fields["Jayden Paid"] || "").includes("checked") ? "✓" : ""}</td>
                          </tr>
                        )
                      })}
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
