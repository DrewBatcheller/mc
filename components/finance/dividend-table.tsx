"use client"

import { ArrowUpDown, Pencil, Trash2, AlertCircle } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

type SortKey = "month" | "totalDividend" | "connorDividend" | "connorPaid" | "jaydenDividend" | "jaydenPaid"
type SortDirection = "asc" | "desc"

interface DividendRow {
  recordId: string
  monthRecordId: string   // ID of the linked P&L record
  month: string
  monthIndex: number
  yearIndex: number
  totalDividend: number
  connorDividend: number
  connorPaid: boolean
  jaydenDividend: number
  jaydenPaid: boolean
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatCurrency(value: number) {
  const prefix = value < 0 ? "-$" : "$"
  return `${prefix}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface DividendTableProps {
  year: string
  showCreateModal?: boolean
  setShowCreateModal?: (show: boolean) => void
  exportTrigger?: number
  readOnly?: boolean
}

export function DividendTable({ year, showCreateModal, setShowCreateModal, exportTrigger, readOnly = false }: DividendTableProps) {
  const { data: rawDividends, mutate } = useAirtable('dividends', {})

  // Fetch P&L entries for the Month & Year dropdown
  const { data: rawPnl } = useAirtable('profit-loss', {})

  // Build sorted P&L options (newest first) — primary field "Month & Year" is the full label
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
        if (a.dateClean && b.dateClean) return b.dateClean.localeCompare(a.dateClean)
        return a.label.localeCompare(b.label)
      })
  }, [rawPnl])

  const liveData = useMemo((): DividendRow[] => {
    if (!rawDividends) return []
    return rawDividends.map(r => {
      // Lookup field returns the readable month string
      const monthYearValue = r.fields['Month & Year (from Profit & Loss (Link))']
      const monthYear = String(
        Array.isArray(monthYearValue) ? (monthYearValue[0] ?? '') : (monthYearValue ?? '')
      )
      // Parse "September 2022" into indices
      const parts = monthYear.split(' ')
      const monthName = parts[0] ?? ''
      const yearIndex = parseInt(parts[1] ?? '0')
      const monthIndex = MONTHS.indexOf(monthName)

      // Linked record field — store the P&L record ID for pre-filling the dropdown
      const pnlLinkRaw = r.fields['Profit & Loss (Link)']
      const monthRecordId = Array.isArray(pnlLinkRaw) ? String(pnlLinkRaw[0] ?? '') : ''

      return {
        recordId: r.id,
        monthRecordId,
        month: monthYear,
        monthIndex: monthIndex >= 0 ? monthIndex : 0,
        yearIndex,
        totalDividend: parseCurrency(r.fields['Dividends Total'] as string),
        connorDividend: parseCurrency(r.fields['Connor'] as string),
        connorPaid: Boolean(r.fields['Connor Paid']),
        jaydenDividend: parseCurrency(r.fields['Jayden'] as string),
        jaydenPaid: Boolean(r.fields['Jayden Paid']),
      }
    })
  }, [rawDividends])

  const [sortKey, setSortKey] = useState<SortKey>("month")
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [deleteConfirm, setDeleteConfirm] = useState<{index: number, row: DividendRow} | null>(null)
  const [editingDividend, setEditingDividend] = useState<{index: number, row: DividendRow} | null>(null)
  const [selectedPnlId, setSelectedPnlId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    totalDividend: 0,
    connorDividend: 0,
    connorPaid: false,
    jaydenDividend: 0,
    jaydenPaid: false,
  })

  const resetForm = () => {
    setSelectedPnlId('')
    setFormData({ totalDividend: 0, connorDividend: 0, connorPaid: false, jaydenDividend: 0, jaydenPaid: false })
  }

  // Handle export when trigger changes
  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) {
      handleExport()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSelectedPnlId(row.monthRecordId)
    setFormData({
      totalDividend: row.totalDividend,
      connorDividend: row.connorDividend,
      connorPaid: row.connorPaid,
      jaydenDividend: row.jaydenDividend,
      jaydenPaid: row.jaydenPaid,
    })
  }

  const handleDelete = (index: number, row: DividendRow) => {
    setDeleteConfirm({index, row})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const { recordId } = deleteConfirm.row
    try {
      await fetch(`/api/airtable/dividends/${recordId}`, { method: 'DELETE' })
      await mutate()
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleteConfirm(null)
  }

  const handleSaveDividend = async () => {
    setIsSaving(true)
    const fields: Record<string, unknown> = {
      'Dividends Total': formData.totalDividend,
      'Connor': formData.connorDividend,
      'Connor Paid': formData.connorPaid,
      'Jayden': formData.jaydenDividend,
      'Jayden Paid': formData.jaydenPaid,
    }
    if (selectedPnlId) fields['Profit & Loss (Link)'] = [selectedPnlId]

    try {
      if (editingDividend) {
        await fetch(`/api/airtable/dividends/${editingDividend.row.recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      } else {
        await fetch('/api/airtable/dividends', {
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
      setEditingDividend(null)
      if (setShowCreateModal) setShowCreateModal(false)
      resetForm()
    }
  }

  const handleCloseModal = () => {
    setEditingDividend(null)
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

  const columns: { key?: SortKey; label: string; align: "left" | "right" | "center"; width: string }[] = [
    { key: "month",          label: "Month & Year",    align: "left",   width: "w-[20%]" },
    { key: "totalDividend",  label: "Total Dividend",  align: "right",  width: "w-[14%]" },
    { key: "connorDividend", label: "Connor Dividend", align: "right",  width: "w-[14%]" },
    { key: "connorPaid",     label: "Connor Paid",     align: "center", width: "w-[12%]" },
    { key: "jaydenDividend", label: "Jayden Dividend", align: "right",  width: "w-[14%]" },
    { key: "jaydenPaid",     label: "Jayden Paid",     align: "center", width: "w-[12%]" },
    ...(!readOnly ? [{ label: "Actions", align: "center" as const, width: "w-[14%]" }] : []),
  ]

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
  const selectCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
  const labelCls = "block text-[13px] font-medium text-foreground mb-1.5"

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Dividend Payouts</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={cn(
                    "px-4 py-2.5 text-[13px] font-medium text-muted-foreground",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.width
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
                key={`${row.month}-${i}`}
                className={cn(
                  "border-b border-border last:border-0 transition-colors hover:bg-accent/30",
                  i % 2 === 0 ? "bg-card" : "bg-accent/10"
                )}
              >
                <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                  {row.month}
                </td>
                <td className={cn("px-4 py-3.5 text-right whitespace-nowrap", row.totalDividend < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.totalDividend)}
                </td>
                <td className={cn("px-4 py-3.5 text-right whitespace-nowrap", row.connorDividend < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.connorDividend)}
                </td>
                <td className="px-4 py-3.5 text-center">
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
                <td className={cn("px-4 py-3.5 text-right whitespace-nowrap", row.jaydenDividend < 0 ? "text-red-500" : "text-foreground")}>
                  {formatCurrency(row.jaydenDividend)}
                </td>
                <td className="px-4 py-3.5 text-center">
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
              {!readOnly && <td className="px-4 py-3.5" />}
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

              {/* Dividend amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Total Dividend</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalDividend || ""}
                    onChange={(e) => setFormData({...formData, totalDividend: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Connor Dividend</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.connorDividend || ""}
                    onChange={(e) => setFormData({...formData, connorDividend: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Jayden Dividend</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.jaydenDividend || ""}
                  onChange={(e) => setFormData({...formData, jaydenDividend: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              {/* Paid checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.connorPaid}
                    onChange={(e) => setFormData({...formData, connorPaid: e.target.checked})}
                    className="rounded border border-border"
                  />
                  <span className="text-[13px] text-foreground">Connor Paid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.jaydenPaid}
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
                disabled={isSaving}
                className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : editingDividend ? "Update" : "Create"}
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
