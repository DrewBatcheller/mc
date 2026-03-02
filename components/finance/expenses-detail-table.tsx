"use client"

import { ChevronDown, ArrowUpDown, Pencil, Trash2, AlertCircle } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

type SortKey = "expenses" | "statementName" | "date" | "vendor"
type SortDir = "asc" | "desc"

interface ExpenseRow {
  expenses: number
  statementName: string
  date: string
  vendor: string
  category: string
}

interface CategoryGroup {
  category: string
  count: number
  rows: ExpenseRow[]
}

export function ExpensesDetailTable({
  dateRange = "All Time",
  showCreateModal = false,
  setShowCreateModal,
  exportTrigger = 0,
}: {
  dateRange?: string
  showCreateModal?: boolean
  setShowCreateModal: (show: boolean) => void
  exportTrigger?: number
}) {
  const { data: rawExpenses, isLoading } = useAirtable('expenses', {
    fields: ['Expense', 'Date', 'Statement Name', 'Vendor (from Vendor)', 'Category (from Category)'],
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const groupedData = useMemo(() => {
    if (!rawExpenses) return []

    const rows: ExpenseRow[] = rawExpenses.map(r => {
      let vendor = 'Unknown'
      const vendorValue = r.fields['Vendor (from Vendor)']
      if (Array.isArray(vendorValue)) {
        vendor = String(vendorValue[0] ?? 'Unknown')
      } else if (vendorValue) {
        vendor = String(vendorValue)
      }

      let category = 'Other'
      const catValue = r.fields['Category (from Category)']
      if (Array.isArray(catValue)) {
        category = String(catValue[0] ?? 'Other')
      } else if (catValue) {
        category = String(catValue)
      }

      return {
        expenses: parseCurrency(r.fields['Expense'] as string),
        statementName: String(r.fields['Statement Name'] ?? ''),
        date: String(r.fields['Date'] ?? ''),
        vendor,
        category,
      }
    })

    // Filter by date range
    let filtered = rows
    if (dateRange !== "All Time") {
      const now = new Date()
      let filterDate = new Date()
      
      if (dateRange === "Last Month") {
        filterDate.setMonth(filterDate.getMonth() - 1)
      } else if (dateRange === "Last 3 Months") {
        filterDate.setMonth(filterDate.getMonth() - 3)
      } else if (dateRange === "Last 6 Months") {
        filterDate.setMonth(filterDate.getMonth() - 6)
      } else if (dateRange.match(/^\d{4}$/)) {
        const year = parseInt(dateRange)
        filtered = filtered.filter(r => new Date(r.date).getFullYear() === year)
      }

      if (dateRange !== "All Time" && !dateRange.match(/^\d{4}$/)) {
        filtered = filtered.filter(r => new Date(r.date) >= filterDate)
      }
    }

    // Group by category
    const grouped: Record<string, ExpenseRow[]> = {}
    for (const row of filtered) {
      if (!grouped[row.category]) grouped[row.category] = []
      grouped[row.category].push(row)
    }

    // Sort within each category
    const result: CategoryGroup[] = Object.entries(grouped)
      .map(([category, categoryRows]) => {
        let sorted = [...categoryRows]
        if (sortKey === 'expenses') {
          sorted.sort((a, b) => sortDir === 'asc' ? a.expenses - b.expenses : b.expenses - a.expenses)
        } else if (sortKey === 'date') {
          sorted.sort((a, b) => {
            const aDate = new Date(a.date).getTime()
            const bDate = new Date(b.date).getTime()
            return sortDir === 'asc' ? aDate - bDate : bDate - aDate
          })
        } else if (sortKey === 'statementName') {
          sorted.sort((a, b) => sortDir === 'asc' ? a.statementName.localeCompare(b.statementName) : b.statementName.localeCompare(a.statementName))
        } else if (sortKey === 'vendor') {
          sorted.sort((a, b) => sortDir === 'asc' ? a.vendor.localeCompare(b.vendor) : b.vendor.localeCompare(a.vendor))
        }

        return {
          category,
          count: categoryRows.length,
          rows: sorted,
        }
      })
      .sort((a, b) => b.rows.reduce((s, r) => s + r.expenses, 0) - a.rows.reduce((s, r) => s + r.expenses, 0))

    return result
  }, [rawExpenses, dateRange, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const handleExport = () => {
    const headers = ['Category', 'Statement Name', 'Date', 'Vendor', 'Amount']
    const rows = groupedData.flatMap(group =>
      group.rows.map(row => [group.category, row.statementName, row.date, row.vendor, row.expenses])
    )

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell =>
          typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) handleExport()
  }, [exportTrigger])

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const columns: { key: SortKey | "actions"; label: string; align?: "right" | "center" }[] = [
    { key: "expenses", label: "Expenses", align: "right" },
    { key: "statementName", label: "Statement Name" },
    { key: "date", label: "Date" },
    { key: "vendor", label: "Vendor" },
    { key: "actions", label: "Actions", align: "center" },
  ]

function CategorySection({ 
  group, 
  onEdit, 
  onDelete 
}: { 
  group: CategoryGroup
  onEdit: (category: string, rowIndex: number, row: ExpenseRow) => void
  onDelete: (category: string, rowIndex: number, row: ExpenseRow) => void
}) {
  const [open, setOpen] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedRows = useMemo(() => {
    return [...group.rows].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === "string" && typeof bVal === "string") {
        if (sortKey === "date") {
          return sortDir === "asc"
            ? new Date(aVal).getTime() - new Date(bVal).getTime()
            : new Date(bVal).getTime() - new Date(aVal).getTime()
        }
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
  }, [group.rows, sortKey, sortDir])

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-3 hover:bg-accent/30 transition-colors"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
        <span className="text-[13px] font-semibold text-foreground">{group.category}</span>
        <span className="text-[12px] text-muted-foreground ml-1">{group.count}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-border/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-5 py-2.5 text-[13px] font-medium text-muted-foreground whitespace-nowrap",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    )}
                  >
                    {col.key === "actions" ? (
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
              {sortedRows.map((row, i) => (
                <tr
                  key={`${row.statementName}-${i}`}
                  className="border-t border-border/30 transition-colors hover:bg-accent/30"
                >
                  <td className="px-5 py-3 text-[13px] text-foreground tabular-nums text-right font-medium">
                    {formatCurrency(row.expenses)}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-foreground">
                    {row.statementName}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground">
                    {row.vendor}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(group.category, i, row)}
                        className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(group.category, i, row)}
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
      )}
    </div>
  )
}

interface ExpensesDetailTableProps {
  dateRange?: string
  showCreateModal?: boolean
  setShowCreateModal?: (show: boolean) => void
  exportTrigger?: number
}

export function ExpensesDetailTable({ 
  dateRange = "All Time",
  showCreateModal,
  setShowCreateModal,
  exportTrigger
}: ExpensesDetailTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{category: string, index: number, row: ExpenseRow} | null>(null)
  const [editingExpense, setEditingExpense] = useState<{category: string, index: number, row: ExpenseRow} | null>(null)
  const [formData, setFormData] = useState<Partial<ExpenseRow>>({
    expenses: 0,
    statementName: "",
    date: "",
    vendor: "",
  })

  // Handle export when trigger changes
  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) {
      handleExport()
    }
  }, [exportTrigger])

  const handleExport = () => {
    // Flatten all expense data for CSV export
    const headers = ["Category", "Expenses", "Statement Name", "Date", "Vendor"]
    const rows: string[][] = []

    expenseData.forEach((group) => {
      group.rows.forEach((row) => {
        rows.push([
          group.category,
          row.expenses.toString(),
          row.statementName,
          row.date,
          row.vendor
        ])
      })
    })

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell =>
          typeof cell === "string" && cell.includes(",") ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(",")
      ),
    ].join("\n")

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses-${dateRange.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleEdit = (category: string, rowIndex: number, row: ExpenseRow) => {
    setEditingExpense({category, index: rowIndex, row})
    setFormData(row)
  }

  const handleDelete = (category: string, rowIndex: number, row: ExpenseRow) => {
    setDeleteConfirm({category, index: rowIndex, row})
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      console.log("Delete expense:", deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  const handleSaveExpense = () => {
    if (editingExpense) {
      console.log("Update expense:", editingExpense.category, editingExpense.index, formData)
    } else {
      console.log("Create expense:", formData)
    }
    setEditingExpense(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      expenses: 0,
      statementName: "",
      date: "",
      vendor: "",
    })
  }

  const handleCloseModal = () => {
    setEditingExpense(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      expenses: 0,
      statementName: "",
      date: "",
      vendor: "",
    })
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Expenses by Year, Month, and Category
        </h2>
      </div>
      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
        ) : groupedData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No expenses found for the selected date range.</div>
        ) : (
          groupedData.map((group) => (
            <CategorySection 
              key={group.category} 
              group={group}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))
        )}
      </div>

      {/* Edit/Create Expense Modal */}
      {(editingExpense || showCreateModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.expenses || ""}
                  onChange={(e) => setFormData({...formData, expenses: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Statement Name
                </label>
                <input
                  type="text"
                  value={formData.statementName || ""}
                  onChange={(e) => setFormData({...formData, statementName: e.target.value})}
                  placeholder="e.g., Invoice #123"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  Vendor
                </label>
                <input
                  type="text"
                  value={formData.vendor || ""}
                  onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                  placeholder="e.g., Acme Corp"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
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
                onClick={handleSaveExpense}
                className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors"
              >
                {editingExpense ? "Update" : "Create"}
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
                    Are you sure you want to delete the expense for {deleteConfirm.row.statementName}? This action cannot be undone.
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
