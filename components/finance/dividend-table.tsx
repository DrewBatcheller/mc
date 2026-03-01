"use client"

import { ArrowUpDown, Pencil, Trash2, AlertCircle, Check, X } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"

type SortKey = "month" | "totalDividend" | "connorDividend" | "connorPaid" | "jaydenDividend" | "jaydenPaid"
type SortDirection = "asc" | "desc"

interface DividendRow {
  month: string
  monthIndex: number
  yearIndex: number
  totalDividend: number
  connorDividend: number
  connorPaid: boolean
  jaydenDividend: number
  jaydenPaid: boolean
}

const allData: DividendRow[] = [
  { month: "September 2022", monthIndex: 8, yearIndex: 2022, totalDividend: 11838.52, connorDividend: 4735.41, connorPaid: true, jaydenDividend: 7103.11, jaydenPaid: true },
  { month: "October 2022", monthIndex: 9, yearIndex: 2022, totalDividend: 22225.67, connorDividend: 8890.27, connorPaid: true, jaydenDividend: 13335.40, jaydenPaid: true },
  { month: "November 2022", monthIndex: 10, yearIndex: 2022, totalDividend: 13419.97, connorDividend: 5367.99, connorPaid: true, jaydenDividend: 8051.98, jaydenPaid: true },
  { month: "December 2022", monthIndex: 11, yearIndex: 2022, totalDividend: 22122.18, connorDividend: 8848.87, connorPaid: true, jaydenDividend: 13273.31, jaydenPaid: true },
  { month: "January 2023", monthIndex: 0, yearIndex: 2023, totalDividend: 21515.52, connorDividend: 8606.21, connorPaid: true, jaydenDividend: 12909.31, jaydenPaid: true },
  { month: "February 2023", monthIndex: 1, yearIndex: 2023, totalDividend: 21685.14, connorDividend: 8674.06, connorPaid: true, jaydenDividend: 13011.08, jaydenPaid: true },
  { month: "March 2023", monthIndex: 2, yearIndex: 2023, totalDividend: 19315.82, connorDividend: 7726.33, connorPaid: true, jaydenDividend: 11589.49, jaydenPaid: true },
  { month: "April 2023", monthIndex: 3, yearIndex: 2023, totalDividend: 7364.85, connorDividend: 2945.94, connorPaid: true, jaydenDividend: 4418.91, jaydenPaid: true },
  { month: "May 2023", monthIndex: 4, yearIndex: 2023, totalDividend: 13887.20, connorDividend: 5554.88, connorPaid: true, jaydenDividend: 8332.32, jaydenPaid: true },
  { month: "June 2023", monthIndex: 5, yearIndex: 2023, totalDividend: -11566.75, connorDividend: -4626.70, connorPaid: true, jaydenDividend: -6940.05, jaydenPaid: true },
  { month: "July 2023", monthIndex: 6, yearIndex: 2023, totalDividend: 854.93, connorDividend: 341.97, connorPaid: true, jaydenDividend: 512.96, jaydenPaid: true },
  { month: "August 2023", monthIndex: 7, yearIndex: 2023, totalDividend: 14564.14, connorDividend: 5825.66, connorPaid: true, jaydenDividend: 8738.49, jaydenPaid: true },
  { month: "September 2023", monthIndex: 8, yearIndex: 2023, totalDividend: 5220.05, connorDividend: 2088.02, connorPaid: true, jaydenDividend: 3132.03, jaydenPaid: true },
  { month: "October 2023", monthIndex: 9, yearIndex: 2023, totalDividend: 8179.20, connorDividend: 3271.68, connorPaid: true, jaydenDividend: 4907.52, jaydenPaid: true },
  { month: "November 2023", monthIndex: 10, yearIndex: 2023, totalDividend: 40300.38, connorDividend: 16120.15, connorPaid: true, jaydenDividend: 24180.23, jaydenPaid: true },
  { month: "December 2023", monthIndex: 11, yearIndex: 2023, totalDividend: 17871.14, connorDividend: 7148.46, connorPaid: true, jaydenDividend: 10722.69, jaydenPaid: true },
  { month: "January 2024", monthIndex: 0, yearIndex: 2024, totalDividend: 40519.77, connorDividend: 16207.91, connorPaid: true, jaydenDividend: 24311.86, jaydenPaid: true },
  { month: "February 2024", monthIndex: 1, yearIndex: 2024, totalDividend: 42745.11, connorDividend: 17098.04, connorPaid: true, jaydenDividend: 25647.07, jaydenPaid: true },
  { month: "March 2024", monthIndex: 2, yearIndex: 2024, totalDividend: 38335.50, connorDividend: 15334.20, connorPaid: true, jaydenDividend: 23001.30, jaydenPaid: true },
  { month: "April 2024", monthIndex: 3, yearIndex: 2024, totalDividend: 59501.71, connorDividend: 23800.68, connorPaid: true, jaydenDividend: 35701.03, jaydenPaid: true },
  { month: "May 2024", monthIndex: 4, yearIndex: 2024, totalDividend: 68533.61, connorDividend: 27413.44, connorPaid: true, jaydenDividend: 41120.16, jaydenPaid: true },
  { month: "June 2024", monthIndex: 5, yearIndex: 2024, totalDividend: 55460.30, connorDividend: 22184.12, connorPaid: true, jaydenDividend: 33276.18, jaydenPaid: true },
  { month: "July 2024", monthIndex: 6, yearIndex: 2024, totalDividend: 38200.80, connorDividend: 15280.32, connorPaid: true, jaydenDividend: 22920.48, jaydenPaid: true },
  { month: "August 2024", monthIndex: 7, yearIndex: 2024, totalDividend: 47300.60, connorDividend: 18920.24, connorPaid: true, jaydenDividend: 28380.36, jaydenPaid: true },
  { month: "September 2024", monthIndex: 8, yearIndex: 2024, totalDividend: 65100.40, connorDividend: 26040.16, connorPaid: true, jaydenDividend: 39060.24, jaydenPaid: true },
  { month: "October 2024", monthIndex: 9, yearIndex: 2024, totalDividend: 69500.20, connorDividend: 27800.08, connorPaid: true, jaydenDividend: 41700.12, jaydenPaid: true },
  { month: "November 2024", monthIndex: 10, yearIndex: 2024, totalDividend: 53800.90, connorDividend: 21520.36, connorPaid: true, jaydenDividend: 32280.54, jaydenPaid: true },
  { month: "December 2024", monthIndex: 11, yearIndex: 2024, totalDividend: 35700.40, connorDividend: 14280.16, connorPaid: true, jaydenDividend: 21420.24, jaydenPaid: false },
  { month: "January 2025", monthIndex: 0, yearIndex: 2025, totalDividend: 18017.47, connorDividend: 7206.99, connorPaid: true, jaydenDividend: 10810.48, jaydenPaid: true },
  { month: "February 2025", monthIndex: 1, yearIndex: 2025, totalDividend: 3950.03, connorDividend: 1580.01, connorPaid: true, jaydenDividend: 2370.02, jaydenPaid: true },
  { month: "March 2025", monthIndex: 2, yearIndex: 2025, totalDividend: -715.46, connorDividend: -286.19, connorPaid: true, jaydenDividend: -429.28, jaydenPaid: true },
  { month: "April 2025", monthIndex: 3, yearIndex: 2025, totalDividend: 14954.96, connorDividend: 5981.98, connorPaid: true, jaydenDividend: 8972.98, jaydenPaid: true },
  { month: "May 2025", monthIndex: 4, yearIndex: 2025, totalDividend: 2843.25, connorDividend: 1137.30, connorPaid: true, jaydenDividend: 1705.95, jaydenPaid: true },
  { month: "June 2025", monthIndex: 5, yearIndex: 2025, totalDividend: 28802.67, connorDividend: 11521.07, connorPaid: true, jaydenDividend: 17281.60, jaydenPaid: true },
  { month: "July 2025", monthIndex: 6, yearIndex: 2025, totalDividend: 3327.30, connorDividend: 1330.92, connorPaid: true, jaydenDividend: 1996.38, jaydenPaid: true },
  { month: "August 2025", monthIndex: 7, yearIndex: 2025, totalDividend: 1879.44, connorDividend: 751.77, connorPaid: true, jaydenDividend: 1127.66, jaydenPaid: true },
  { month: "September 2025", monthIndex: 8, yearIndex: 2025, totalDividend: 46124.50, connorDividend: 18449.80, connorPaid: true, jaydenDividend: 27674.70, jaydenPaid: true },
  { month: "October 2025", monthIndex: 9, yearIndex: 2025, totalDividend: 60781.02, connorDividend: 24312.41, connorPaid: true, jaydenDividend: 36468.61, jaydenPaid: true },
  { month: "November 2025", monthIndex: 10, yearIndex: 2025, totalDividend: 38844.64, connorDividend: 15537.86, connorPaid: true, jaydenDividend: 23306.78, jaydenPaid: true },
  { month: "December 2025", monthIndex: 11, yearIndex: 2025, totalDividend: -3852.17, connorDividend: -1540.87, connorPaid: false, jaydenDividend: -2311.30, jaydenPaid: false },
]

function formatCurrency(value: number) {
  const prefix = value < 0 ? "-$" : "$"
  return `${prefix}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface DividendTableProps {
  year: string
  showCreateModal?: boolean
  setShowCreateModal?: (show: boolean) => void
  exportTrigger?: number
}

export function DividendTable({ year, showCreateModal, setShowCreateModal, exportTrigger }: DividendTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("month")
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [deleteConfirm, setDeleteConfirm] = useState<{index: number, row: DividendRow} | null>(null)
  const [editingDividend, setEditingDividend] = useState<{index: number, row: DividendRow} | null>(null)
  const [formData, setFormData] = useState<Partial<DividendRow>>({
    month: "",
    monthIndex: 0,
    yearIndex: new Date().getFullYear(),
    totalDividend: 0,
    connorDividend: 0,
    connorPaid: false,
    jaydenDividend: 0,
    jaydenPaid: false,
  })

  // Handle export when trigger changes
  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) {
      handleExport()
    }
  }, [exportTrigger])

  const handleExport = () => {
    const headers = ["Month", "Total Dividend", "Connor Dividend", "Connor Paid", "Jayden Dividend", "Jayden Paid"]
    const rows = filteredData.map(row => [
      row.month,
      row.totalDividend,
      row.connorDividend,
      row.connorPaid ? "Yes" : "No",
      row.jaydenDividend,
      row.jaydenPaid ? "Yes" : "No",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell =>
          typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell
        ).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dividends-${year}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleEdit = (index: number, row: DividendRow) => {
    setEditingDividend({index, row})
    setFormData(row)
  }

  const handleDelete = (index: number, row: DividendRow) => {
    setDeleteConfirm({index, row})
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      console.log("Delete dividend:", deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  const handleSaveDividend = () => {
    if (editingDividend) {
      console.log("Update dividend:", editingDividend.index, formData)
    } else {
      console.log("Create dividend:", formData)
    }
    setEditingDividend(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      month: "",
      monthIndex: 0,
      yearIndex: new Date().getFullYear(),
      totalDividend: 0,
      connorDividend: 0,
      connorPaid: false,
      jaydenDividend: 0,
      jaydenPaid: false,
    })
  }

  const handleCloseModal = () => {
    setEditingDividend(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      month: "",
      monthIndex: 0,
      yearIndex: new Date().getFullYear(),
      totalDividend: 0,
      connorDividend: 0,
      connorPaid: false,
      jaydenDividend: 0,
      jaydenPaid: false,
    })
  }

  const filteredData = useMemo(() => {
    if (year === "all") return allData
    return allData.filter((row) => row.yearIndex === parseInt(year))
  }, [year])

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let cmp = 0
      if (sortKey === "month") {
        cmp = (a.yearIndex * 12 + a.monthIndex) - (b.yearIndex * 12 + b.monthIndex)
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number)
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredData, sortKey, sortDir])

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, row) => ({
        totalDividend: acc.totalDividend + row.totalDividend,
        connorDividend: acc.connorDividend + row.connorDividend,
        jaydenDividend: acc.jaydenDividend + row.jaydenDividend,
      }),
      { totalDividend: 0, connorDividend: 0, jaydenDividend: 0 }
    )
  }, [filteredData])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const columns: { key?: SortKey; label: string; align: "left" | "right" | "center" }[] = [
    { key: "month", label: "Month & Year", align: "left" },
    { key: "totalDividend", label: "Total Dividend", align: "right" },
    { key: "connorDividend", label: "Connor Dividend", align: "right" },
    { key: "connorPaid", label: "Connor Paid", align: "center" },
    { key: "jaydenDividend", label: "Jayden Dividend", align: "right" },
    { key: "jaydenPaid", label: "Jayden Paid", align: "center" },
    { label: "Actions", align: "center" },
  ]

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Dividend Payouts</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={cn(
                    "px-4 py-2.5 text-[13px] font-medium text-muted-foreground",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.label === "Month & Year" && "w-32",
                    col.label === "Total Dividend" && "w-28",
                    col.label === "Connor Dividend" && "w-28",
                    col.label === "Connor Paid" && "w-20",
                    col.label === "Jayden Dividend" && "w-28",
                    col.label === "Jayden Paid" && "w-20",
                    col.label === "Actions" && "w-20"
                  )}
                >
                  {!col.key ? (
                    col.label
                  ) : (
                    <button
                      onClick={() => handleSort(col.key as SortKey)}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                    >
                      {col.label}
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3 transition-colors",
                          sortKey === col.key
                            ? "text-foreground"
                            : "text-muted-foreground/30 group-hover:text-muted-foreground"
                        )}
                      />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr
                key={row.month}
                className={cn(
                  "border-b border-border last:border-0 transition-colors hover:bg-accent/30",
                  i % 2 === 0 ? "bg-card" : "bg-accent/10"
                )}
              >
                <td className="px-4 py-3.5 w-32 font-medium text-foreground whitespace-nowrap">
                  {row.month}
                </td>
                <td className={cn("px-4 py-3.5 w-28 text-right whitespace-nowrap", row.totalDividend < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.totalDividend)}
                </td>
                <td className={cn("px-4 py-3.5 w-28 text-right whitespace-nowrap", row.connorDividend < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.connorDividend)}
                </td>
                <td className="px-4 py-3.5 w-20 text-center">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full",
                      row.connorPaid
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </td>
                <td className={cn("px-4 py-3.5 w-28 text-right whitespace-nowrap", row.jaydenDividend < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.jaydenDividend)}
                </td>
                <td className="px-4 py-3.5 w-20 text-center">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full",
                      row.jaydenPaid
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </td>
                <td className="px-4 py-3.5 w-20 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEdit(i, row)}
                      className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(i, row)}
                      className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-accent/20">
              <td className="px-4 py-3.5 font-semibold text-foreground">Total</td>
              <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                {formatCurrency(totals.totalDividend)}
              </td>
              <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                {formatCurrency(totals.connorDividend)}
              </td>
              <td className="px-4 py-3.5" />
              <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                {formatCurrency(totals.jaydenDividend)}
              </td>
              <td className="px-4 py-3.5" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Edit/Create Dividend Modal */}
      {(editingDividend || showCreateModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {editingDividend ? "Edit Dividend Entry" : "Add New Dividend Entry"}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Month & Year
                </label>
                <input
                  type="text"
                  value={formData.month || ""}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                  placeholder="e.g., January 2025"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    Total Dividend
                  </label>
                  <input
                    type="number"
                    value={formData.totalDividend || ""}
                    onChange={(e) => setFormData({...formData, totalDividend: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    Connor Dividend
                  </label>
                  <input
                    type="number"
                    value={formData.connorDividend || ""}
                    onChange={(e) => setFormData({...formData, connorDividend: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    Jayden Dividend
                  </label>
                  <input
                    type="number"
                    value={formData.jaydenDividend || ""}
                    onChange={(e) => setFormData({...formData, jaydenDividend: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.connorPaid || false}
                    onChange={(e) => setFormData({...formData, connorPaid: e.target.checked})}
                    className="rounded border border-border"
                  />
                  <span className="text-[13px] text-foreground">Connor Paid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.jaydenPaid || false}
                    onChange={(e) => setFormData({...formData, jaydenPaid: e.target.checked})}
                    className="rounded border border-border"
                  />
                  <span className="text-[13px] text-foreground">Jayden Paid</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDividend}
                className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors"
              >
                {editingDividend ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-sm">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">Delete Entry</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Are you sure you want to delete the dividend entry for {deleteConfirm.row.month}? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
