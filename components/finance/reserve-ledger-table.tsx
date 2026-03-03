"use client"

import { ArrowUpDown, Pencil, Trash2, AlertCircle } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

type SortKey = "month" | "category" | "allocated" | "actual" | "balance" | "transferred" | "variance"
type SortDirection = "asc" | "desc"

interface LedgerRow {
  recordId: string
  monthRecordId: string
  categoryRecordId: string
  month: string
  monthIndex: number
  yearIndex: number
  category: string
  transactionType: string
  percentAllocation: number
  allocated: number
  actual: number
  accountBalance: number
  balance: number
  transferred: boolean
  variance: number
}

const MONTH_ORDER = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
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
  readOnly?: boolean
}

export function ReserveLedgerTable({ year, showCreateModal, setShowCreateModal, exportTrigger, readOnly = false }: ReserveLedgerTableProps) {
  const { data: rawReserve, isLoading, error, mutate } = useAirtable('reserve', {
    sort: [{ field: 'DateClean', direction: 'asc' }],
  })

  // Fetch P&L entries for the Month & Year dropdown
  const { data: rawPnl } = useAirtable('profit-loss', {})

  // Fetch expense categories for the Category dropdown
  const { data: rawCategories } = useAirtable('expense-categories', {})

  // Build sorted P&L options (newest first)
  // P&L primary field "Month & Year" stores the full label e.g. "November 2025"
  const pnlOptions = useMemo(() => {
    if (!rawPnl) return []
    return rawPnl
      .map(r => ({
        id: r.id,
        label: String(
          r.fields['Month & Year'] ??
          r.fields['Month and Year'] ??
          ''
        ).trim(),
        dateClean: String(r.fields['DateClean'] ?? ''),
      }))
      .filter(o => o.label)
      .sort((a, b) => {
        // DateClean is "YYYY/MM/D" — descending string sort puts newest first
        if (a.dateClean && b.dateClean) return b.dateClean.localeCompare(a.dateClean)
        return a.label.localeCompare(b.label)
      })
  }, [rawPnl])

  // Build category options
  const categoryOptions = useMemo(() => {
    if (!rawCategories) return []
    return rawCategories.map(r => ({
      id: r.id,
      label: String(
        r.fields['Name'] ??
        r.fields['Category'] ??
        r.fields['Expense Category'] ??
        r.fields['Category Name'] ??
        r.id
      ),
    })).filter(o => o.label && o.label !== o.id)
  }, [rawCategories])

  // Default category: Emergency Reserve Allocation
  const defaultCategoryId = useMemo(
    () => categoryOptions.find(o => o.label.toLowerCase().includes('emergency reserve'))?.id ?? '',
    [categoryOptions]
  )

  const liveData = useMemo((): LedgerRow[] => {
    if (!rawReserve) return []
    return rawReserve.map(r => {
      const dateClean = String(r.fields['DateClean'] ?? '')
      // Handle both "YYYY/MM/D" (formula) and "YYYY-MM-DD" (ISO date) formats
      const sep = dateClean.includes('/') ? '/' : '-'
      const parts = dateClean.split(sep)
      const yearIndex = parseInt(parts[0] ?? '0')
      const monthIndex = parseInt(parts[1] ?? '1') - 1 // 0-indexed

      // Category (from Category) is a lookup — fall back to Transaction Type if unavailable
      const catValue = r.fields['Category (from Category)']
      let category: string
      if (Array.isArray(catValue) && catValue.length > 0) {
        category = String(catValue[0])
      } else if (catValue) {
        category = String(catValue)
      } else {
        category = String(r.fields['Transaction Type'] ?? '')
      }

      // Month & Year (from Month & Year) is a lookup — returns array of strings
      const monthRaw = r.fields['Month & Year (from Month & Year)']
      const month = String(Array.isArray(monthRaw) ? (monthRaw[0] ?? '') : (monthRaw ?? ''))

      // Linked record IDs for pre-filling dropdowns on edit
      const monthLinkRaw = r.fields['Month & Year']
      const monthRecordId = Array.isArray(monthLinkRaw) ? String(monthLinkRaw[0] ?? '') : ''
      const catLinkRaw = r.fields['Category']
      const categoryRecordId = Array.isArray(catLinkRaw) ? String(catLinkRaw[0] ?? '') : ''

      return {
        recordId: r.id,
        monthRecordId,
        categoryRecordId,
        month,
        monthIndex,
        yearIndex,
        category,
        transactionType: String(r.fields['Transaction Type'] ?? ''),
        percentAllocation: parseCurrency(r.fields['% Allocation'] as string),
        allocated: parseCurrency(r.fields['Allocated Amount'] as string),
        actual: parseCurrency(r.fields['Actual Allocation'] as string),
        accountBalance: parseCurrency(r.fields['Account Balance'] as string),
        balance: parseCurrency(r.fields['New Account Balance'] as string),
        transferred: Boolean(r.fields['Allocation Transferred']),
        variance: parseCurrency(r.fields['Variance $'] as string),
      }
    })
  }, [rawReserve])

  const [sortKey, setSortKey] = useState<SortKey>("month")
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [deleteConfirm, setDeleteConfirm] = useState<{index: number, row: LedgerRow} | null>(null)
  const [editingEntry, setEditingEntry] = useState<{index: number, row: LedgerRow} | null>(null)
  const [selectedPnlId, setSelectedPnlId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    transactionType: "",
    percentAllocation: 0,
    accountBalance: 0,
    actual: 0,
    transferred: false,
  })

  // Pre-set default category when the Create modal opens
  useEffect(() => {
    if (showCreateModal && !editingEntry && defaultCategoryId) {
      setSelectedCategoryId(prev => prev || defaultCategoryId)
    }
  }, [showCreateModal, editingEntry, defaultCategoryId])

  const resetForm = () => {
    setFormData({ transactionType: "", percentAllocation: 0, accountBalance: 0, actual: 0, transferred: false })
    setSelectedPnlId('')
    setSelectedCategoryId('')
  }

  // Handle export when trigger changes
  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) {
      handleExport()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSelectedPnlId(row.monthRecordId)
    setSelectedCategoryId(row.categoryRecordId)
    setFormData({
      transactionType: row.transactionType,
      percentAllocation: row.percentAllocation,
      accountBalance: row.accountBalance,
      actual: row.actual,
      transferred: row.transferred,
    })
  }

  const handleDelete = (index: number, row: LedgerRow) => {
    setDeleteConfirm({index, row})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const { recordId } = deleteConfirm.row
    try {
      await fetch(`/api/airtable/reserve/${recordId}`, { method: 'DELETE' })
      await mutate()
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleteConfirm(null)
  }

  const handleSaveEntry = async () => {
    setIsSaving(true)
    const fields: Record<string, unknown> = {
      'Transaction Type': formData.transactionType,
      '% Allocation': formData.percentAllocation,
      'Account Balance': formData.accountBalance,
      'Actual Allocation': formData.actual,
      'Allocation Transferred': formData.transferred,
    }
    if (selectedPnlId) fields['Month & Year'] = [selectedPnlId]
    if (selectedCategoryId) fields['Category'] = [selectedCategoryId]

    try {
      if (editingEntry) {
        await fetch(`/api/airtable/reserve/${editingEntry.row.recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      } else {
        await fetch('/api/airtable/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      }
      await mutate()
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setIsSaving(false)
      setEditingEntry(null)
      if (setShowCreateModal) setShowCreateModal(false)
      resetForm()
    }
  }

  const handleCloseModal = () => {
    setEditingEntry(null)
    if (setShowCreateModal) setShowCreateModal(false)
    resetForm()
  }

  const filteredData = useMemo(() => {
    if (year === "all") return liveData
    return liveData.filter((row) => row.yearIndex === parseInt(year))
  }, [liveData, year])

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
    ...(!readOnly ? [{ label: "Actions", align: "center" as const }] : []),
  ]

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
  const selectCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
  const labelCls = "block text-[13px] font-medium text-foreground mb-1.5"

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
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[13px] text-red-500">
                  Failed to load data. Check the browser console for details.
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No reserve entries found.
                </td>
              </tr>
            ) : null}
            {sortedData.map((row, i) => (
              <tr
                key={`${row.month}-${row.category}-${i}`}
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
                {!readOnly && (
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Reserve Entry Modal */}
      {(editingEntry || showCreateModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="text-base font-semibold text-foreground">
                {editingEntry ? "Edit Reserve Entry" : "Add New Reserve Entry"}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">

              {/* Month & Year — linked P&L entry */}
              <div>
                <label className={labelCls}>Month &amp; Year (P&amp;L Entry)</label>
                <select
                  value={selectedPnlId}
                  onChange={(e) => setSelectedPnlId(e.target.value)}
                  className={selectCls}
                  disabled={!rawPnl}
                >
                  <option value="">{rawPnl ? 'Select month…' : 'Loading…'}</option>
                  {pnlOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Category — linked expense category */}
              <div>
                <label className={labelCls}>Category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className={selectCls}
                  disabled={!rawCategories}
                >
                  <option value="">{rawCategories ? 'Select category…' : 'Loading…'}</option>
                  {categoryOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className={labelCls}>Transaction Type</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => setFormData({...formData, transactionType: e.target.value})}
                  className={selectCls}
                >
                  <option value="">Select type…</option>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                </select>
              </div>

              {/* % Allocation + Account Balance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>% Allocation</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.percentAllocation || ""}
                    onChange={(e) => setFormData({...formData, percentAllocation: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Account Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.accountBalance || ""}
                    onChange={(e) => setFormData({...formData, accountBalance: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Actual Allocation */}
              <div>
                <label className={labelCls}>Actual Allocation</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.actual || ""}
                  onChange={(e) => setFormData({...formData, actual: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              {/* Allocation Transferred */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.transferred}
                  onChange={(e) => setFormData({...formData, transferred: e.target.checked})}
                  className="rounded border border-border"
                />
                <span className="text-[13px] text-foreground">Allocation Transferred</span>
              </label>
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card">
              <button
                onClick={handleCloseModal}
                className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={isSaving}
                className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : editingEntry ? "Update" : "Create"}
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
