"use client"

import { ChevronDown, ArrowUpDown, Pencil, Trash2, AlertCircle, X } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

type SortKey = "expenses" | "statementName" | "date" | "vendor"
type SortDir = "asc" | "desc"

interface ExpenseRow {
  recordId: string
  categoryRecordId: string
  vendorRecordId: string
  expenses: number
  statementName: string
  notes: string
  date: string
  vendor: string
  category: string
}

interface CategoryGroup {
  category: string
  count: number
  rows: ExpenseRow[]
}

interface ExpenseForm {
  date: string
  expense: number | ''
  statementName: string
  notes: string
}

const emptyForm: ExpenseForm = {
  date: '',
  expense: '',
  statementName: '',
  notes: '',
}

export function ExpensesDetailTable({
  dateRange = "All Time",
  showCreateModal = false,
  setShowCreateModal,
  exportTrigger = 0,
  readOnly = false,
}: {
  dateRange?: string
  showCreateModal?: boolean
  setShowCreateModal: (show: boolean) => void
  exportTrigger?: number
  readOnly?: boolean
}) {
  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: rawExpenses, isLoading, mutate } = useAirtable('expenses', {
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  const { data: rawCategories } = useAirtable('expense-categories', {})
  const { data: rawVendors } = useAirtable('vendors', {})

  // ── Category options for dropdown ────────────────────────────────────────────
  const categoryOptions = useMemo(() => {
    if (!rawCategories) return [] as { id: string; name: string }[]
    return rawCategories
      .map(r => ({
        id: r.id,
        name: String(
          r.fields['Name'] ??
          r.fields['Category'] ??
          r.fields['Expense Category'] ??
          r.fields['Category Name'] ??
          ''
        ),
      }))
      .filter(c => c.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [rawCategories])

  // ── Table state ──────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // ── Vendor options for dropdown ──────────────────────────────────────────────
  const vendorOptions = useMemo(() => {
    if (!rawVendors) return [] as { id: string; name: string }[]
    return rawVendors
      .map(r => ({
        id: r.id,
        name: String(r.fields['Vendor'] ?? r.fields['Name'] ?? ''),
      }))
      .filter(v => v.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [rawVendors])

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [editingRow, setEditingRow] = useState<ExpenseRow | null>(null)
  const [formData, setFormData] = useState<ExpenseForm>(emptyForm)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<ExpenseRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ── Transform raw Airtable records → ExpenseRow ──────────────────────────────
  const liveData = useMemo<ExpenseRow[]>(() => {
    if (!rawExpenses) return []
    return rawExpenses.map(r => {
      const vendorValue = r.fields['Vendor (from Vendor)']
      let vendor = ''
      if (Array.isArray(vendorValue)) {
        vendor = String(vendorValue[0] ?? '')
      } else if (vendorValue) {
        vendor = String(vendorValue)
      }

      const catValue = r.fields['Category (from Category)']
      let category = 'Other'
      if (Array.isArray(catValue)) {
        category = String(catValue[0] ?? 'Other')
      } else if (catValue) {
        category = String(catValue)
      }

      // Category linked record ID for edit pre-fill
      const catLink = r.fields['Category']
      let categoryRecordId = ''
      if (Array.isArray(catLink) && catLink.length > 0) {
        categoryRecordId = String(catLink[0])
      }

      // Vendor linked record ID for edit pre-fill
      const vendorLink = r.fields['Vendor']
      let vendorRecordId = ''
      if (Array.isArray(vendorLink) && vendorLink.length > 0) {
        vendorRecordId = String(vendorLink[0])
      }

      return {
        recordId: r.id,
        categoryRecordId,
        vendorRecordId,
        expenses: parseCurrency(r.fields['Expense'] as string),
        statementName: String(r.fields['Statement Name'] ?? ''),
        notes: String(r.fields['Notes'] ?? ''),
        date: String(r.fields['Date'] ?? ''),
        vendor,
        category,
      }
    })
  }, [rawExpenses])

  // ── Date range filter ────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (dateRange === "All Time") return liveData
    const now = new Date()
    return liveData.filter(row => {
      const rowDate = new Date(row.date)
      if (dateRange.match(/^\d{4}$/)) {
        return rowDate.getFullYear().toString() === dateRange
      }
      let threshold = new Date()
      if (dateRange === "Last Month") threshold = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      else if (dateRange === "Last 3 Months") threshold = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      else if (dateRange === "Last 6 Months") threshold = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      return rowDate >= threshold
    })
  }, [liveData, dateRange])

  // ── Group by category, sort within group ─────────────────────────────────────
  const groupedData = useMemo(() => {
    const grouped: Record<string, ExpenseRow[]> = {}
    for (const row of filteredData) {
      if (!grouped[row.category]) grouped[row.category] = []
      grouped[row.category].push(row)
    }

    return Object.entries(grouped)
      .map(([category, categoryRows]) => {
        const sorted = [...categoryRows].sort((a, b) => {
          if (sortKey === 'expenses') return sortDir === 'asc' ? a.expenses - b.expenses : b.expenses - a.expenses
          if (sortKey === 'date') {
            return sortDir === 'asc'
              ? new Date(a.date).getTime() - new Date(b.date).getTime()
              : new Date(b.date).getTime() - new Date(a.date).getTime()
          }
          return sortDir === 'asc'
            ? a[sortKey].localeCompare(b[sortKey])
            : b[sortKey].localeCompare(a[sortKey])
        })
        return { category, count: categoryRows.length, rows: sorted }
      })
      .sort((a, b) =>
        b.rows.reduce((s, r) => s + r.expenses, 0) -
        a.rows.reduce((s, r) => s + r.expenses, 0)
      )
  }, [filteredData, sortKey, sortDir])

  // ── Sort handler ─────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = (row: ExpenseRow) => {
    setEditingRow(row)
    setSelectedCategoryId(row.categoryRecordId)
    setSelectedVendorId(row.vendorRecordId)
    setFormData({
      date: row.date,
      expense: row.expenses,
      statementName: row.statementName,
      notes: row.notes,
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteClick = (row: ExpenseRow) => setDeleteConfirm(row)

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      await fetch(`/api/airtable/expenses/${deleteConfirm.recordId}`, { method: 'DELETE' })
      await mutate()
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleteConfirm(null)
  }

  // ── Save (create or edit) ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.date || formData.expense === '') return
    setIsSaving(true)
    try {
      const fields: Record<string, unknown> = {
        'Date': formData.date,
        'Expense': formData.expense,
        ...(formData.statementName && { 'Statement Name': formData.statementName }),
        ...(formData.notes && { 'Notes': formData.notes }),
        ...(selectedCategoryId && { 'Category': [selectedCategoryId] }),
        ...(selectedVendorId && { 'Vendor': [selectedVendorId] }),
      }

      if (editingRow) {
        await fetch(`/api/airtable/expenses/${editingRow.recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      } else {
        await fetch('/api/airtable/expenses', {
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
    }
    handleCloseModal()
  }

  const handleCloseModal = () => {
    setEditingRow(null)
    setShowCreateModal(false)
    setFormData(emptyForm)
    setSelectedCategoryId('')
    setSelectedVendorId('')
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ['Category', 'Statement Name', 'Date', 'Vendor', 'Amount']
    const rows = groupedData.flatMap(group =>
      group.rows.map(row => [group.category, row.statementName, row.date, row.vendor, row.expenses])
    )
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell).join(',')
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
    { key: "expenses", label: "Amount", align: "right" },
    { key: "statementName", label: "Statement Name" },
    { key: "date", label: "Date" },
    { key: "vendor", label: "Vendor" },
    ...(!readOnly ? [{ key: "actions" as const, label: "Actions", align: "center" as const }] : []),
  ]

  // ── CategorySection sub-component (closure access to columns/readOnly) ────────
  function CategorySection({
    group,
    onEdit,
    onDelete,
  }: {
    group: CategoryGroup
    onEdit: (row: ExpenseRow) => void
    onDelete: (row: ExpenseRow) => void
  }) {
    const [open, setOpen] = useState(true)
    const [localSortKey, setLocalSortKey] = useState<SortKey>("date")
    const [localSortDir, setLocalSortDir] = useState<SortDir>("desc")

    const handleLocalSort = (key: SortKey) => {
      if (localSortKey === key) setLocalSortDir(localSortDir === "asc" ? "desc" : "asc")
      else { setLocalSortKey(key); setLocalSortDir("asc") }
    }

    const sortedRows = useMemo(() => {
      return [...group.rows].sort((a, b) => {
        if (localSortKey === "expenses") {
          return localSortDir === "asc" ? a.expenses - b.expenses : b.expenses - a.expenses
        }
        if (localSortKey === "date") {
          return localSortDir === "asc"
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime()
        }
        const aVal = a[localSortKey]
        const bVal = b[localSortKey]
        return localSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }, [group.rows, localSortKey, localSortDir])

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
          <span className="ml-auto text-[12px] font-medium text-foreground tabular-nums">
            {formatCurrency(group.rows.reduce((s, r) => s + r.expenses, 0))}
          </span>
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
                          onClick={() => handleLocalSort(col.key as SortKey)}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                        >
                          {col.label}
                          <ArrowUpDown
                            className={cn(
                              "h-3 w-3 transition-colors",
                              localSortKey === col.key
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
                    key={`${row.recordId}-${i}`}
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
                    {!readOnly && (
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEdit(row)}
                            className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(row)}
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
        )}
      </div>
    )
  }

  // ── Derived display values for modal ─────────────────────────────────────────
  const selectedCategoryName = categoryOptions.find(c => c.id === selectedCategoryId)?.name ?? ''
  const selectedVendorName = vendorOptions.find(v => v.id === selectedVendorId)?.name ?? ''

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Expenses by Category
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
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))
        )}
      </div>

      {/* ── Create / Edit modal ───────────────────────────────────────────────── */}
      {(editingRow !== null || showCreateModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="rounded-t-xl px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-[15px] font-semibold text-foreground">
                {editingRow ? "Edit Expense" : "Add New Expense"}
              </h3>
              <button onClick={handleCloseModal} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <X className="h-4 w-4 text-foreground/60" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Date + Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.expense}
                    onChange={(e) => setFormData({ ...formData, expense: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Category</label>
                <SelectField
                  value={selectedCategoryName || "Select a category"}
                  onChange={(v) => {
                    if (v === "Select a category") {
                      setSelectedCategoryId('')
                    } else {
                      const found = categoryOptions.find(c => c.name === v)
                      if (found) setSelectedCategoryId(found.id)
                    }
                  }}
                  options={["Select a category", ...categoryOptions.map(c => c.name)]}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Vendor</label>
                <SelectField
                  value={selectedVendorName || "Select a vendor"}
                  onChange={(v) => {
                    if (v === "Select a vendor") {
                      setSelectedVendorId('')
                    } else {
                      const found = vendorOptions.find(opt => opt.name === v)
                      if (found) setSelectedVendorId(found.id)
                    }
                  }}
                  options={["Select a vendor", ...vendorOptions.map(v => v.name)]}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>

              {/* Statement Name */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Statement Name</label>
                <input
                  type="text"
                  value={formData.statementName}
                  onChange={(e) => setFormData({ ...formData, statementName: e.target.value })}
                  placeholder="e.g. GOOGLE *GSUITE"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={handleCloseModal}
                className="px-4 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.date || formData.expense === '' || isSaving}
                className="px-4 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 text-[13px] font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : editingRow ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-sm">
            <div className="rounded-t-xl px-5 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">Delete Expense</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Are you sure you want to delete{' '}
                    <span className="font-medium text-foreground">
                      {deleteConfirm.statementName || formatCurrency(deleteConfirm.expenses)}
                    </span>
                    ? This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium transition-colors"
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
