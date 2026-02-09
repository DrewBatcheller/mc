"use client"

import { Label } from "@/components/ui/label"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown } from "lucide-react"
import { usePL } from "@/hooks/v2/use-financial"
import { LoadingOverlay } from "@/components/v2/loading-overlay"

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

export function PnL() {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const { pl, isLoading } = usePL()

  const filteredAndSorted = useMemo(() => {
    let data = (pl || []).filter((row) => {
      const monthYear = String(row.fields["Month & Year"] || "")
      return monthYear.includes(yearFilter)
    })

    // Default sort by chronological month order
    data = data.sort((a, b) => {
      const monthYearA = String(a.fields["Month & Year"] || "")
      const monthYearB = String(b.fields["Month & Year"] || "")
      const [monthA, yearA] = monthYearA.split(" ")
      const [monthB, yearB] = monthYearB.split(" ")

      const yearCompare = parseInt(yearA || "0") - parseInt(yearB || "0")
      if (yearCompare !== 0) return yearCompare

      const monthOrderA = MONTH_ORDER[monthA] || 0
      const monthOrderB = MONTH_ORDER[monthB] || 0
      return monthOrderA - monthOrderB
    })

    // Apply custom sort if selected
    if (sortColumn) {
      data = data.sort((a, b) => {
        let valA: any = a.fields[sortColumn] || "0"
        let valB: any = b.fields[sortColumn] || "0"

        if (sortColumn === "Month & Year") {
          const [monthA, yearA] = String(valA).split(" ")
          const [monthB, yearB] = String(valB).split(" ")
          const yearCompare = parseInt(yearA || "0") - parseInt(yearB || "0")
          if (yearCompare !== 0) return yearCompare
          const monthOrderA = MONTH_ORDER[monthA] || 0
          const monthOrderB = MONTH_ORDER[monthB] || 0
          return monthOrderA - monthOrderB
        }

        valA = parseFloat(String(valA)) || 0
        valB = parseFloat(String(valB)) || 0
        const result = valA - valB
        return sortDirection === "asc" ? result : -result
      })
    }

    return data
  }, [pl, yearFilter, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 opacity-40" />
    return <ArrowUpDown className={`w-4 h-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading P&L data...</div>
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

          <Card className="mt-2">
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Month & Year")}>
                        <div className="flex items-center gap-2">
                          Month & Year
                          <SortIcon column="Month & Year" />
                        </div>
                      </th>
                      <th className="text-right py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Total Revenue")}>
                        <div className="flex items-center justify-end gap-2">
                          Total Revenue
                          <SortIcon column="Total Revenue" />
                        </div>
                      </th>
                      <th className="text-right py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Total Expense")}>
                        <div className="flex items-center justify-end gap-2">
                          Total Expense
                          <SortIcon column="Total Expense" />
                        </div>
                      </th>
                      <th className="text-right py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Net Profit")}>
                        <div className="flex items-center justify-end gap-2">
                          Net Profit
                          <SortIcon column="Net Profit" />
                        </div>
                      </th>
                      <th className="text-right py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Gross Margin")}>
                        <div className="flex items-center justify-end gap-2">
                          Gross Margin
                          <SortIcon column="Gross Margin" />
                        </div>
                      </th>
                      <th className="text-right py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Revenue Growth %")}>
                        <div className="flex items-center justify-end gap-2">
                          Revenue Growth %
                          <SortIcon column="Revenue Growth %" />
                        </div>
                      </th>
                      <th className="text-right py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Net Profit Growth %")}>
                        <div className="flex items-center justify-end gap-2">
                          Net Profit Growth %
                          <SortIcon column="Net Profit Growth %" />
                        </div>
                      </th>
                      <th className="text-right py-2 px-4 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("Adjusted Profit")}>
                        <div className="flex items-center justify-end gap-2">
                          Adjusted Profit
                          <SortIcon column="Adjusted Profit" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSorted.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">{row.fields["Month & Year"]}</td>
                        <td className="text-right py-2 px-4">${parseFloat(row.fields["Total Revenue"] || "0").toFixed(0)}</td>
                        <td className="text-right py-2 px-4">${parseFloat(row.fields["Total Expense"] || "0").toFixed(0)}</td>
                        <td className="text-right py-2 px-4">${parseFloat(row.fields["Net Profit"] || "0").toFixed(0)}</td>
                        <td className="text-right py-2 px-4">{parseFloat(row.fields["Gross Margin"] || "0").toFixed(1)}%</td>
                        <td className="text-right py-2 px-4">{parseFloat(row.fields["Revenue Growth %"] || "0").toFixed(1)}%</td>
                        <td className="text-right py-2 px-4">{parseFloat(row.fields["Net Profit Growth %"] || "0").toFixed(1)}%</td>
                        <td className="text-right py-2 px-4">${parseFloat(row.fields["Adjusted Profit"] || "0").toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
