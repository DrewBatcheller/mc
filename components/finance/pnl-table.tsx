"use client"

import { ArrowUpDown, Check } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

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
  const { data: rawPnl, isLoading } = useAirtable('profit-loss', {
    fields: ['Month & Year', 'Total Revenue', 'Total MRR', 'Total Expense', 'Total Processing Fees', 'Net Profit', 'EBITDA', 'Adjusted Profit', 'Connor', 'Dividend Connor', 'Jayden', 'Dividend Jayden', 'DateClean'],
    sort: [{ field: 'DateClean', direction: 'asc' }],
  })

  const [sortKey, setSortKey] = useState<SortKey>("month")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Parse and filter P&L data
  const data = useMemo(() => {
    if (!rawPnl) return []

    const parsed: PnlRow[] = rawPnl
      .map((r) => {
        const monthStr = String(r.fields['Month & Year'] ?? '')
        const dateStr = String(r.fields['DateClean'] ?? '')
        const yearFromDate = dateStr.split('/')[0] || '2025'

        return {
          month: monthStr,
          monthIndex: new Date(`${monthStr} 1`).getMonth(),
          revenue: parseCurrency(r.fields['Total Revenue'] as string),
          fees: parseCurrency(r.fields['Total Processing Fees'] as string),
          expenses: parseCurrency(r.fields['Total Expense'] as string),
          netProfit: parseCurrency(r.fields['Net Profit'] as string),
          adjustedProfit: parseCurrency(r.fields['Adjusted Profit'] as string),
          revenueGrowth: 0, // Will be calculated below
          dividendConnor: String(r.fields['Dividend Connor'] ?? '').toLowerCase() === 'checked',
          dividendJayden: String(r.fields['Dividend Jayden'] ?? '').toLowerCase() === 'checked',
          connor: parseCurrency(r.fields['Connor'] as string),
          jayden: parseCurrency(r.fields['Jayden'] as string),
        }
      })
      .filter((row) => {
        if (year === 'all') return true
        return row.month.includes(year)
      })

    // Calculate revenue growth
    for (let i = 0; i < parsed.length; i++) {
      if (i === 0) {
        parsed[i].revenueGrowth = 0
      } else {
        const prevRev = parsed[i - 1].revenue
        const currRev = parsed[i].revenue
        parsed[i].revenueGrowth = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : 0
      }
    }

    return parsed
  }, [rawPnl, year])

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
      let aVal: number | string
      let bVal: number | string
      if (sortKey === "month") {
        aVal = a.month
        bVal = b.month
      } else {
        aVal = a[sortKey] as number
        bVal = b[sortKey] as number
      }
      if (typeof aVal === 'string') {
        return sortDirection === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
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
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading P&L data...</div>
        ) : sortedData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No P&L data available for the selected year.</div>
        ) : (
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
                <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground tabular-nums text-right">{formatCurrency(totals.fees)}</td>
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
                    <td />
                    <td />
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground tabular-nums text-right">{formatCurrency(totals.connor)}</td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold text-foreground tabular-nums text-right">{formatCurrency(totals.jayden)}</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
