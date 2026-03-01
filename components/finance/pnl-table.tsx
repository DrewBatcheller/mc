"use client"

import { ArrowUpDown, Check } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"

type SortKey =
  | "month"
  | "revenue"
  | "fees"
  | "expenses"
  | "netProfit"
  | "adjustedProfit"
  | "revenueGrowth"
  | "connor"
  | "jayden"

type SortDirection = "asc" | "desc"

interface PnlRow {
  month: string
  monthIndex: number
  revenue: number
  fees: number
  expenses: number
  netProfit: number
  adjustedProfit: number
  revenueGrowth: number
  dividendConnor: boolean
  dividendJayden: boolean
  connor: number
  jayden: number
}

const dataByYear: Record<string, PnlRow[]> = {
  "2025": [
    { month: "January 2025", monthIndex: 0, revenue: 50628.81, fees: 1849.08, expenses: 28980.32, netProfit: 19799.41, adjustedProfit: 18017.47, revenueGrowth: -20.9, dividendConnor: true, dividendJayden: true, connor: 7206.99, jayden: 10810.48 },
    { month: "February 2025", monthIndex: 1, revenue: 30117.41, fees: 1090.67, expenses: 24686.04, netProfit: 4340.70, adjustedProfit: 3950.03, revenueGrowth: -40.5, dividendConnor: true, dividendJayden: true, connor: 1580.01, jayden: 2370.02 },
    { month: "March 2025", monthIndex: 2, revenue: 18530.96, fees: 662.11, expenses: 18655.07, netProfit: -786.22, adjustedProfit: -715.46, revenueGrowth: -38.5, dividendConnor: true, dividendJayden: true, connor: -286.19, jayden: -429.28 },
    { month: "April 2025", monthIndex: 3, revenue: 39459.06, fees: 1438.42, expenses: 21586.62, netProfit: 16434.02, adjustedProfit: 14954.96, revenueGrowth: 112.9, dividendConnor: true, dividendJayden: true, connor: 5981.98, jayden: 8972.98 },
    { month: "May 2025", monthIndex: 4, revenue: 24006.90, fees: 864.68, expenses: 20017.77, netProfit: 3124.45, adjustedProfit: 2843.25, revenueGrowth: -39.2, dividendConnor: true, dividendJayden: true, connor: 1137.30, jayden: 1705.95 },
    { month: "June 2025", monthIndex: 5, revenue: 53827.73, fees: 1969.84, expenses: 20206.60, netProfit: 31651.29, adjustedProfit: 28802.67, revenueGrowth: 124.2, dividendConnor: true, dividendJayden: true, connor: 11521.07, jayden: 17281.60 },
    { month: "July 2025", monthIndex: 6, revenue: 30297.87, fees: 1098.22, expenses: 25543.28, netProfit: 3656.37, adjustedProfit: 3327.30, revenueGrowth: -43.7, dividendConnor: true, dividendJayden: true, connor: 1330.92, jayden: 1996.38 },
    { month: "August 2025", monthIndex: 7, revenue: 33824.66, fees: 1228.33, expenses: 30531.02, netProfit: 2065.31, adjustedProfit: 1879.44, revenueGrowth: 11.6, dividendConnor: true, dividendJayden: true, connor: 751.77, jayden: 1127.66 },
    { month: "September 2025", monthIndex: 8, revenue: 88842.17, fees: 3266.19, expenses: 34889.72, netProfit: 50686.26, adjustedProfit: 46124.50, revenueGrowth: 162.7, dividendConnor: true, dividendJayden: true, connor: 18449.80, jayden: 27674.70 },
    { month: "October 2025", monthIndex: 9, revenue: 97913.33, fees: 3299.22, expenses: 27821.78, netProfit: 66792.33, adjustedProfit: 60781.02, revenueGrowth: 10.2, dividendConnor: true, dividendJayden: true, connor: 24312.41, jayden: 36468.61 },
    { month: "November 2025", monthIndex: 10, revenue: 75157.37, fees: 2455.45, expenses: 30015.50, netProfit: 42686.42, adjustedProfit: 38844.64, revenueGrowth: -23.2, dividendConnor: true, dividendJayden: true, connor: 15537.86, jayden: 23306.78 },
    { month: "December 2025", monthIndex: 11, revenue: 0, fees: 0, expenses: 3852.17, netProfit: -3852.17, adjustedProfit: -3852.17, revenueGrowth: -100, dividendConnor: false, dividendJayden: false, connor: -1540.87, jayden: -2311.30 },
  ],
  "2024": [
    { month: "January 2024", monthIndex: 0, revenue: 42100.50, fees: 1540.20, expenses: 22400.30, netProfit: 18160.00, adjustedProfit: 16525.60, revenueGrowth: 15.3, dividendConnor: true, dividendJayden: true, connor: 6610.24, jayden: 9915.36 },
    { month: "February 2024", monthIndex: 1, revenue: 38750.00, fees: 1415.60, expenses: 20850.40, netProfit: 16484.00, adjustedProfit: 15000.44, revenueGrowth: -8.0, dividendConnor: true, dividendJayden: true, connor: 6000.18, jayden: 9000.26 },
    { month: "March 2024", monthIndex: 2, revenue: 55200.80, fees: 2018.30, expenses: 26300.20, netProfit: 26882.30, adjustedProfit: 24462.89, revenueGrowth: 42.5, dividendConnor: true, dividendJayden: true, connor: 9785.16, jayden: 14677.73 },
    { month: "April 2024", monthIndex: 3, revenue: 48300.60, fees: 1765.30, expenses: 24100.50, netProfit: 22434.80, adjustedProfit: 20415.67, revenueGrowth: -12.5, dividendConnor: true, dividendJayden: true, connor: 8166.27, jayden: 12249.40 },
    { month: "May 2024", monthIndex: 4, revenue: 61400.20, fees: 2244.50, expenses: 28750.00, netProfit: 30405.70, adjustedProfit: 27669.19, revenueGrowth: 27.1, dividendConnor: true, dividendJayden: true, connor: 11067.68, jayden: 16601.51 },
    { month: "June 2024", monthIndex: 5, revenue: 57800.40, fees: 2112.80, expenses: 27200.60, netProfit: 28487.00, adjustedProfit: 25923.17, revenueGrowth: -5.9, dividendConnor: true, dividendJayden: true, connor: 10369.27, jayden: 15553.90 },
    { month: "July 2024", monthIndex: 6, revenue: 44600.30, fees: 1630.20, expenses: 23100.80, netProfit: 19869.30, adjustedProfit: 18081.07, revenueGrowth: -22.8, dividendConnor: true, dividendJayden: true, connor: 7232.43, jayden: 10848.64 },
    { month: "August 2024", monthIndex: 7, revenue: 52100.70, fees: 1903.90, expenses: 25600.40, netProfit: 24596.40, adjustedProfit: 22382.72, revenueGrowth: 16.8, dividendConnor: true, dividendJayden: true, connor: 8953.09, jayden: 13429.63 },
    { month: "September 2024", monthIndex: 8, revenue: 68500.90, fees: 2503.60, expenses: 30200.50, netProfit: 35796.80, adjustedProfit: 32575.09, revenueGrowth: 31.5, dividendConnor: true, dividendJayden: true, connor: 13030.04, jayden: 19545.05 },
    { month: "October 2024", monthIndex: 9, revenue: 72300.10, fees: 2642.10, expenses: 31400.60, netProfit: 38257.40, adjustedProfit: 34814.23, revenueGrowth: 5.5, dividendConnor: true, dividendJayden: true, connor: 13925.69, jayden: 20888.54 },
    { month: "November 2024", monthIndex: 10, revenue: 63800.50, fees: 2331.40, expenses: 29100.30, netProfit: 32368.80, adjustedProfit: 29455.61, revenueGrowth: -11.8, dividendConnor: true, dividendJayden: true, connor: 11782.24, jayden: 17673.37 },
    { month: "December 2024", monthIndex: 11, revenue: 58200.60, fees: 2127.20, expenses: 27800.90, netProfit: 28272.50, adjustedProfit: 25727.98, revenueGrowth: -8.8, dividendConnor: true, dividendJayden: true, connor: 10291.19, jayden: 15436.79 },
  ],
  "2023": [
    { month: "January 2023", monthIndex: 0, revenue: 23000.00, fees: 840.50, expenses: 15200.30, netProfit: 6959.20, adjustedProfit: 6333.07, revenueGrowth: 0, dividendConnor: true, dividendJayden: true, connor: 2533.23, jayden: 3799.84 },
    { month: "February 2023", monthIndex: 1, revenue: 25400.60, fees: 928.30, expenses: 16100.40, netProfit: 8371.90, adjustedProfit: 7618.43, revenueGrowth: 10.4, dividendConnor: true, dividendJayden: true, connor: 3047.37, jayden: 4571.06 },
    { month: "March 2023", monthIndex: 2, revenue: 28900.80, fees: 1056.50, expenses: 17200.20, netProfit: 10644.10, adjustedProfit: 9686.13, revenueGrowth: 13.8, dividendConnor: true, dividendJayden: true, connor: 3874.45, jayden: 5811.68 },
    { month: "April 2023", monthIndex: 3, revenue: 31200.40, fees: 1140.30, expenses: 18100.50, netProfit: 11959.60, adjustedProfit: 10883.24, revenueGrowth: 8.0, dividendConnor: true, dividendJayden: true, connor: 4353.30, jayden: 6529.94 },
    { month: "May 2023", monthIndex: 4, revenue: 35600.70, fees: 1301.00, expenses: 19400.30, netProfit: 14899.40, adjustedProfit: 13558.45, revenueGrowth: 14.1, dividendConnor: true, dividendJayden: true, connor: 5423.38, jayden: 8135.07 },
    { month: "June 2023", monthIndex: 5, revenue: 33100.90, fees: 1209.80, expenses: 18800.60, netProfit: 13090.50, adjustedProfit: 11912.36, revenueGrowth: -7.0, dividendConnor: true, dividendJayden: true, connor: 4764.94, jayden: 7147.42 },
    { month: "July 2023", monthIndex: 6, revenue: 29800.20, fees: 1089.30, expenses: 17600.40, netProfit: 11110.50, adjustedProfit: 10110.56, revenueGrowth: -10.0, dividendConnor: true, dividendJayden: true, connor: 4044.22, jayden: 6066.34 },
    { month: "August 2023", monthIndex: 7, revenue: 36800.50, fees: 1344.80, expenses: 20100.20, netProfit: 15355.50, adjustedProfit: 13973.51, revenueGrowth: 23.5, dividendConnor: true, dividendJayden: true, connor: 5589.40, jayden: 8384.11 },
    { month: "September 2023", monthIndex: 8, revenue: 41200.30, fees: 1505.60, expenses: 21400.80, netProfit: 18293.90, adjustedProfit: 16647.45, revenueGrowth: 12.0, dividendConnor: true, dividendJayden: true, connor: 6658.98, jayden: 9988.47 },
    { month: "October 2023", monthIndex: 9, revenue: 38500.60, fees: 1407.00, expenses: 20200.50, netProfit: 16893.10, adjustedProfit: 15372.72, revenueGrowth: -6.6, dividendConnor: true, dividendJayden: true, connor: 6149.09, jayden: 9223.63 },
    { month: "November 2023", monthIndex: 10, revenue: 43100.40, fees: 1575.30, expenses: 22300.60, netProfit: 19224.50, adjustedProfit: 17494.30, revenueGrowth: 11.9, dividendConnor: true, dividendJayden: true, connor: 6997.72, jayden: 10496.58 },
    { month: "December 2023", monthIndex: 11, revenue: 36500.80, fees: 1334.10, expenses: 19800.40, netProfit: 15366.30, adjustedProfit: 13983.33, revenueGrowth: -15.3, dividendConnor: true, dividendJayden: true, connor: 5593.33, jayden: 8390.00 },
  ],
  "2022": [
    { month: "October 2022", monthIndex: 9, revenue: 12500.00, fees: 456.80, expenses: 8200.30, netProfit: 3842.90, adjustedProfit: 3497.04, revenueGrowth: 0, dividendConnor: true, dividendJayden: true, connor: 1398.82, jayden: 2098.22 },
    { month: "November 2022", monthIndex: 10, revenue: 23000.00, fees: 840.50, expenses: 12100.40, netProfit: 10059.10, adjustedProfit: 9153.78, revenueGrowth: 84.0, dividendConnor: true, dividendJayden: true, connor: 3661.51, jayden: 5492.27 },
    { month: "December 2022", monthIndex: 11, revenue: 18700.60, fees: 683.30, expenses: 10400.20, netProfit: 7617.10, adjustedProfit: 6931.56, revenueGrowth: -18.7, dividendConnor: true, dividendJayden: true, connor: 2772.62, jayden: 4158.94 },
  ],
}

function formatCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
  return value < 0 ? `-${formatted}` : formatted
}

interface PnlTableProps {
  year: string
  showDividends: boolean
  exportTrigger?: number
}

export function PnlTable({ year, showDividends, exportTrigger }: PnlTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("month")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const data = year === "all"
    ? Object.values(dataByYear).flat()
    : dataByYear[year] || []

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: number
      let bVal: number
      if (sortKey === "month") {
        aVal = a.monthIndex + (parseInt(a.month.split(" ")[1]) * 100)
        bVal = b.monthIndex + (parseInt(b.month.split(" ")[1]) * 100)
      } else {
        aVal = a[sortKey] as number
        bVal = b[sortKey] as number
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }, [data, sortKey, sortDirection])

  const totals = useMemo(() => ({
    revenue: data.reduce((s, r) => s + r.revenue, 0),
    fees: data.reduce((s, r) => s + r.fees, 0),
    expenses: data.reduce((s, r) => s + r.expenses, 0),
    netProfit: data.reduce((s, r) => s + r.netProfit, 0),
    adjustedProfit: data.reduce((s, r) => s + r.adjustedProfit, 0),
    connor: data.reduce((s, r) => s + r.connor, 0),
    jayden: data.reduce((s, r) => s + r.jayden, 0),
  }), [data])

  const handleExport = () => {
    const headers = ["Month & Year", "Total Revenue", "Total Fees", "Total Expense", "Net Profit", "Adjusted Profit", "Revenue Growth %"]
    if (showDividends) headers.push("Dividend Connor", "Dividend Jayden", "Connor", "Jayden")

    const rows = sortedData.map(row => {
      const values: (string | number)[] = [row.month, row.revenue, row.fees, row.expenses, row.netProfit, row.adjustedProfit, row.revenueGrowth]
      if (showDividends) values.push(row.dividendConnor ? "Yes" : "No", row.dividendJayden ? "Yes" : "No", row.connor, row.jayden)
      return values
    })

    const totalsRow: (string | number)[] = ["Totals", totals.revenue, totals.fees, totals.expenses, totals.netProfit, totals.adjustedProfit, ""]
    if (showDividends) totalsRow.push("", "", totals.connor, totals.jayden)
    rows.push(totalsRow)

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => typeof cell === "string" ? `"${cell.replace(/"/g, '""')}"` : cell).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pnl-${year}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) handleExport()
  }, [exportTrigger])

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "month", label: "Month & Year" },
    { key: "revenue", label: "Total Revenue", align: "right" },
    { key: "fees", label: "Total Fees", align: "right" },
    { key: "expenses", label: "Total Expense", align: "right" },
    { key: "netProfit", label: "Net Profit", align: "right" },
    { key: "adjustedProfit", label: "Adjusted Profit", align: "right" },
    { key: "revenueGrowth", label: "Revenue Growth %", align: "right" },
  ]

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">P&L Data</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                  >
                    {col.label}
                    <ArrowUpDown className={cn(
                      "h-3 w-3 transition-colors",
                      sortKey === col.key ? "text-foreground" : "text-muted-foreground/30 group-hover:text-muted-foreground"
                    )} />
                  </button>
                </th>
              ))}
              {showDividends && (
                <>
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-center">Dividend Connor</th>
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-center">Dividend Jayden</th>
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-right">
                    <button onClick={() => handleSort("connor")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors group">
                      Connor
                      <ArrowUpDown className={cn("h-3 w-3 transition-colors", sortKey === "connor" ? "text-foreground" : "text-muted-foreground/30 group-hover:text-muted-foreground")} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-right">
                    <button onClick={() => handleSort("jayden")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors group">
                      Jayden
                      <ArrowUpDown className={cn("h-3 w-3 transition-colors", sortKey === "jayden" ? "text-foreground" : "text-muted-foreground/30 group-hover:text-muted-foreground")} />
                    </button>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr key={`${row.month}-${i}`} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap">{row.month}</td>
                <td className="px-4 py-3.5 text-[13px] text-foreground tabular-nums text-right">{formatCurrency(row.revenue)}</td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground tabular-nums text-right">{formatCurrency(row.fees)}</td>
                <td className="px-4 py-3.5 text-[13px] text-foreground tabular-nums text-right">{formatCurrency(row.expenses)}</td>
                <td className={cn("px-4 py-3.5 text-[13px] tabular-nums text-right font-medium", row.netProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {formatCurrency(row.netProfit)}
                </td>
                <td className={cn("px-4 py-3.5 text-[13px] tabular-nums text-right", row.adjustedProfit >= 0 ? "text-foreground" : "text-red-500")}>
                  {formatCurrency(row.adjustedProfit)}
                </td>
                <td className={cn("px-4 py-3.5 text-[13px] tabular-nums text-right", row.revenueGrowth >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {row.revenueGrowth > 0 ? "+" : ""}{row.revenueGrowth.toFixed(1)}%
                </td>
                {showDividends && (
                  <>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn("inline-flex items-center justify-center h-5 w-5 rounded-full", row.dividendConnor ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground")}>
                        <Check className="h-3 w-3" />
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn("inline-flex items-center justify-center h-5 w-5 rounded-full", row.dividendJayden ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground")}>
                        <Check className="h-3 w-3" />
                      </span>
                    </td>
                    <td className={cn("px-4 py-3.5 text-[13px] tabular-nums text-right", row.connor >= 0 ? "text-foreground" : "text-red-500")}>
                      {formatCurrency(row.connor)}
                    </td>
                    <td className={cn("px-4 py-3.5 text-[13px] tabular-nums text-right", row.jayden >= 0 ? "text-foreground" : "text-red-500")}>
                      {formatCurrency(row.jayden)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-accent/40 border-t border-border">
              <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground">Totals</td>
              <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground tabular-nums text-right">{formatCurrency(totals.revenue)}</td>
              <td className="px-4 py-3.5 text-[13px] font-semibold text-muted-foreground tabular-nums text-right">{formatCurrency(totals.fees)}</td>
              <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground tabular-nums text-right">{formatCurrency(totals.expenses)}</td>
              <td className={cn("px-4 py-3.5 text-[13px] font-semibold tabular-nums text-right", totals.netProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
                {formatCurrency(totals.netProfit)}
              </td>
              <td className={cn("px-4 py-3.5 text-[13px] font-semibold tabular-nums text-right", totals.adjustedProfit >= 0 ? "text-foreground" : "text-red-500")}>
                {formatCurrency(totals.adjustedProfit)}
              </td>
              <td className="px-4 py-3.5" />
              {showDividends && (
                <>
                  <td className="px-4 py-3.5" />
                  <td className="px-4 py-3.5" />
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground tabular-nums text-right">{formatCurrency(totals.connor)}</td>
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground tabular-nums text-right">{formatCurrency(totals.jayden)}</td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
