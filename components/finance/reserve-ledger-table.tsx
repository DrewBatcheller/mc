"use client"

import { ArrowUpDown, Pencil, Trash2, AlertCircle } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"

type SortKey = "month" | "category" | "allocated" | "actual" | "balance" | "transferred" | "variance"
type SortDirection = "asc" | "desc"

interface LedgerRow {
  month: string
  monthIndex: number
  yearIndex: number
  category: string
  allocated: number
  actual: number
  balance: number
  transferred: boolean
  variance: number
}

const allData: LedgerRow[] = [
  { month: "September 2022", monthIndex: 8, yearIndex: 2022, category: "Emergency Reserve Allocation", allocated: 1170.84, actual: 1165.14, balance: 1165.14, transferred: false, variance: 5.70 },
  { month: "October 2022", monthIndex: 9, yearIndex: 2022, category: "Emergency Reserve Allocation", allocated: 2198.14, actual: 2298.59, balance: 3463.73, transferred: false, variance: -100.45 },
  { month: "November 2022", monthIndex: 10, yearIndex: 2022, category: "Emergency Reserve Allocation", allocated: 1327.25, actual: 1319.05, balance: 4782.78, transferred: false, variance: 8.20 },
  { month: "December 2022", monthIndex: 11, yearIndex: 2022, category: "Emergency Reserve Allocation", allocated: 2187.91, actual: 2187.91, balance: 6970.69, transferred: false, variance: 0.00 },
  { month: "January 2023", monthIndex: 0, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 2127.91, actual: 2127.91, balance: 9098.60, transferred: false, variance: 0.00 },
  { month: "February 2023", monthIndex: 1, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 2144.68, actual: 2141.98, balance: 11240.58, transferred: false, variance: 2.70 },
  { month: "March 2023", monthIndex: 2, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 1910.36, actual: 1909.91, balance: 13150.49, transferred: false, variance: 0.45 },
  { month: "April 2023", monthIndex: 3, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 728.39, actual: 912.38, balance: 14062.87, transferred: false, variance: -183.99 },
  { month: "May 2023", monthIndex: 4, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 1373.46, actual: 1359.88, balance: 15422.75, transferred: false, variance: 13.58 },
  { month: "June 2023", monthIndex: 5, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: -1143.96, actual: -965.40, balance: 14457.35, transferred: false, variance: -178.56 },
  { month: "July 2023", monthIndex: 6, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 84.55, actual: 1005.51, balance: 15462.86, transferred: false, variance: -920.96 },
  { month: "August 2023", monthIndex: 7, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 1440.41, actual: 1441.31, balance: 16904.17, transferred: false, variance: -0.90 },
  { month: "September 2023", monthIndex: 8, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 516.27, actual: 657.50, balance: 17561.67, transferred: false, variance: -141.23 },
  { month: "October 2023", monthIndex: 9, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 808.93, actual: 1642.03, balance: 19203.70, transferred: false, variance: -833.10 },
  { month: "November 2023", monthIndex: 10, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 3985.04, actual: 3350.17, balance: 22553.87, transferred: false, variance: 634.87 },
  { month: "December 2023", monthIndex: 11, yearIndex: 2023, category: "Emergency Reserve Allocation", allocated: 1767.11, actual: 1891.22, balance: 24445.09, transferred: false, variance: -124.11 },
  { month: "January 2024", monthIndex: 0, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 4001.98, actual: 3820.46, balance: 28265.55, transferred: true, variance: 181.52 },
  { month: "February 2024", monthIndex: 1, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 4224.51, actual: 4250.10, balance: 32515.65, transferred: true, variance: -25.59 },
  { month: "March 2024", monthIndex: 2, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 3783.55, actual: 3700.80, balance: 36216.45, transferred: true, variance: 82.75 },
  { month: "April 2024", monthIndex: 3, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 5880.17, actual: 5950.22, balance: 42166.67, transferred: true, variance: -70.05 },
  { month: "May 2024", monthIndex: 4, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 6773.36, actual: 6141.33, balance: 48308.00, transferred: true, variance: 632.03 },
  { month: "June 2024", monthIndex: 5, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 5476.03, actual: 5320.18, balance: 53628.18, transferred: true, variance: 155.85 },
  { month: "July 2024", monthIndex: 6, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 3770.08, actual: 3890.50, balance: 57518.68, transferred: true, variance: -120.42 },
  { month: "August 2024", monthIndex: 7, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 4671.06, actual: 4510.90, balance: 62029.58, transferred: true, variance: 160.16 },
  { month: "September 2024", monthIndex: 8, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 6433.04, actual: 6580.20, balance: 68609.78, transferred: true, variance: -147.16 },
  { month: "October 2024", monthIndex: 9, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 6868.02, actual: 6750.33, balance: 75360.11, transferred: true, variance: 117.69 },
  { month: "November 2024", monthIndex: 10, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 5315.09, actual: 5440.80, balance: 80800.91, transferred: true, variance: -125.71 },
  { month: "December 2024", monthIndex: 11, yearIndex: 2024, category: "Emergency Reserve Allocation", allocated: 3527.04, actual: 3390.15, balance: 84191.06, transferred: true, variance: 136.89 },
  { month: "January 2025", monthIndex: 0, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 1780.75, actual: 1820.50, balance: 86011.56, transferred: true, variance: -39.75 },
  { month: "February 2025", monthIndex: 1, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 390.00, actual: 410.25, balance: 86421.81, transferred: true, variance: -20.25 },
  { month: "March 2025", monthIndex: 2, yearIndex: 2025, category: "Internal Team Salary", allocated: -6500.00, actual: -6500.00, balance: 79921.81, transferred: true, variance: 0.00 },
  { month: "April 2025", monthIndex: 3, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 1478.50, actual: 1510.22, balance: 81432.03, transferred: true, variance: -31.72 },
  { month: "May 2025", monthIndex: 4, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 280.93, actual: 295.80, balance: 81727.83, transferred: true, variance: -14.87 },
  { month: "June 2025", monthIndex: 5, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 2845.27, actual: 2910.40, balance: 84638.23, transferred: true, variance: -65.13 },
  { month: "July 2025", monthIndex: 6, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 328.73, actual: 340.10, balance: 84978.33, transferred: true, variance: -11.37 },
  { month: "August 2025", monthIndex: 7, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 185.74, actual: 190.50, balance: 85168.83, transferred: true, variance: -4.76 },
  { month: "September 2025", monthIndex: 8, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 4558.45, actual: 4620.30, balance: 89789.13, transferred: true, variance: -61.85 },
  { month: "October 2025", monthIndex: 9, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 6007.10, actual: 6120.44, balance: 95909.57, transferred: true, variance: -113.34 },
  { month: "November 2025", monthIndex: 10, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 3839.46, actual: 3890.20, balance: 99799.77, transferred: true, variance: -50.74 },
  { month: "December 2025", monthIndex: 11, yearIndex: 2025, category: "Emergency Reserve Allocation", allocated: 5825.10, actual: 5825.10, balance: 105624.87, transferred: false, variance: 0.00 },
]

function formatCurrency(value: number) {
  const prefix = value < 0 ? "-$" : "$"
  return `${prefix}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface ReserveLedgerTableProps {
  year: string
  showCreateModal?: boolean
  setShowCreateModal?: (show: boolean) => void
  exportTrigger?: number
}

export function ReserveLedgerTable({ year, showCreateModal, setShowCreateModal, exportTrigger }: ReserveLedgerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("month")
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [deleteConfirm, setDeleteConfirm] = useState<{index: number, row: LedgerRow} | null>(null)
  const [editingEntry, setEditingEntry] = useState<{index: number, row: LedgerRow} | null>(null)
  const [formData, setFormData] = useState<Partial<LedgerRow>>({
    month: "",
    monthIndex: 0,
    yearIndex: new Date().getFullYear(),
    category: "",
    allocated: 0,
    actual: 0,
    balance: 0,
    transferred: false,
    variance: 0,
  })

  // Handle export when trigger changes
  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) {
      handleExport()
    }
  }, [exportTrigger])

  const handleExport = () => {
    const headers = ["Month", "Category", "Allocated", "Actual", "Balance", "Transferred", "Variance"]
    const rows = filteredData.map(row => [
      row.month,
      row.category,
      row.allocated,
      row.actual,
      row.balance,
      row.transferred ? "Yes" : "No",
      row.variance,
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
    a.download = `reserves-${year}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleEdit = (index: number, row: LedgerRow) => {
    setEditingEntry({index, row})
    setFormData(row)
  }

  const handleDelete = (index: number, row: LedgerRow) => {
    setDeleteConfirm({index, row})
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      console.log("Delete reserve entry:", deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  const handleSaveEntry = () => {
    if (editingEntry) {
      console.log("Update reserve entry:", editingEntry.index, formData)
    } else {
      console.log("Create reserve entry:", formData)
    }
    setEditingEntry(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      month: "",
      monthIndex: 0,
      yearIndex: new Date().getFullYear(),
      category: "",
      allocated: 0,
      actual: 0,
      balance: 0,
      transferred: false,
      variance: 0,
    })
  }

  const handleCloseModal = () => {
    setEditingEntry(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      month: "",
      monthIndex: 0,
      yearIndex: new Date().getFullYear(),
      category: "",
      allocated: 0,
      actual: 0,
      balance: 0,
      transferred: false,
      variance: 0,
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
      } else if (sortKey === "category") {
        cmp = a.category.localeCompare(b.category)
      } else if (sortKey === "transferred") {
        cmp = (a.transferred ? 1 : 0) - (b.transferred ? 1 : 0)
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number)
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredData, sortKey, sortDir])

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
    { key: "category", label: "Category", align: "left" },
    { key: "allocated", label: "Allocated Amount", align: "right" },
    { key: "actual", label: "Actual Allocation", align: "right" },
    { key: "balance", label: "New Account Balance", align: "right" },
    { key: "transferred", label: "Transferred", align: "center" },
    { key: "variance", label: "Variance", align: "right" },
    { label: "Actions", align: "center" },
  ]

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Reserve Ledger Movements</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={cn(
                    "px-5 py-2.5 text-[13px] font-medium text-muted-foreground whitespace-nowrap",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
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
                key={`${row.month}-${row.category}`}
                className={cn(
                  "border-b border-border last:border-0 transition-colors hover:bg-accent/30",
                  i % 2 === 0 ? "bg-card" : "bg-accent/10"
                )}
              >
                <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">
                  {row.month}
                </td>
                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                  {row.category}
                </td>
                <td className={cn("px-4 py-3.5 text-right whitespace-nowrap", row.allocated < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.allocated)}
                </td>
                <td className={cn("px-4 py-3.5 text-right whitespace-nowrap", row.actual < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.actual)}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap text-foreground">
                  {formatCurrency(row.balance)}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full",
                      row.transferred
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </td>
                <td className={cn("px-4 py-3.5 text-right whitespace-nowrap", row.variance < 0 ? "text-red-500" : row.variance > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                  {formatCurrency(row.variance)}
                </td>
                <td className="px-4 py-3.5 text-center">
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
        </table>
      </div>

      {/* Edit/Create Reserve Entry Modal */}
      {(editingEntry || showCreateModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {editingEntry ? "Edit Reserve Entry" : "Add New Reserve Entry"}
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
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category || ""}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g., Emergency Reserve Allocation"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    Allocated Amount
                  </label>
                  <input
                    type="number"
                    value={formData.allocated || ""}
                    onChange={(e) => setFormData({...formData, allocated: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    Actual Allocation
                  </label>
                  <input
                    type="number"
                    value={formData.actual || ""}
                    onChange={(e) => setFormData({...formData, actual: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    New Account Balance
                  </label>
                  <input
                    type="number"
                    value={formData.balance || ""}
                    onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">
                    Variance
                  </label>
                  <input
                    type="number"
                    value={formData.variance || ""}
                    onChange={(e) => setFormData({...formData, variance: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.transferred || false}
                  onChange={(e) => setFormData({...formData, transferred: e.target.checked})}
                  className="rounded border border-border"
                />
                <span className="text-[13px] text-foreground">Transferred</span>
              </label>
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors"
              >
                {editingEntry ? "Update" : "Create"}
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
                    Are you sure you want to delete the reserve entry for {deleteConfirm.row.month}? This action cannot be undone.
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
