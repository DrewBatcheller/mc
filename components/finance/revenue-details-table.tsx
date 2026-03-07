"use client"

import { ArrowUpDown, Pencil, Trash2, AlertCircle, X } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

type SortKey = "name" | "client" | "date" | "amountUsd" | "feesUsd" | "conversionRate" | "amountCad" | "feesCad"
type SortDirection = "asc" | "desc"

interface RevenueRow {
  recordId: string
  clientRecordId: string
  name: string
  client: string
  date: string
  amountUsd: number
  feesUsd: number
  conversionRate: number | null
  amountCad: number
  feesCad: number
}

interface FormState {
  date: string
  amountUsd: number | ''
  feesUsd: number | ''
  conversionRate: number | ''
  amountCad: number | ''
  feesCad: number | ''
}

const emptyForm: FormState = {
  date: '',
  amountUsd: '',
  feesUsd: '',
  conversionRate: '',
  amountCad: '',
  feesCad: '',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const columns: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Name" },
  { key: "client", label: "Client" },
  { key: "date", label: "Date" },
  { key: "amountUsd", label: "Amount USD", align: "right" },
  { key: "feesUsd", label: "Fees USD", align: "right" },
  { key: "conversionRate", label: "Conversion Rate", align: "right" },
  { key: "amountCad", label: "Amount CAD", align: "right" },
  { key: "feesCad", label: "Fees CAD", align: "right" },
]

interface RevenueDetailsTableProps {
  showCreateModal?: boolean
  setShowCreateModal?: (show: boolean) => void
  exportTrigger?: number
  dateRange?: string
  readOnly?: boolean
}

export function RevenueDetailsTable({
  showCreateModal = false,
  setShowCreateModal,
  exportTrigger = 0,
  dateRange = "All Time",
  readOnly = false,
}: RevenueDetailsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [editingRow, setEditingRow] = useState<RevenueRow | null>(null)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<RevenueRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch revenue data — no fields[] to avoid 422 on lookup fields
  const { data: rawRevenue, isLoading: revLoading, mutate } = useAirtable('revenue', {
    sort: [{ field: 'Date', direction: 'desc' }],
  })

  // Fetch active clients for dropdown — keep filterByFormula, drop fields[]
  const { data: rawClients } = useAirtable('clients', {
    filterExtra: "{Client Status}='Active'",
  })

  // { id, name } pairs for the client dropdown
  const clientOptions = useMemo(
    () => (rawClients ?? [])
      .map(r => ({ id: r.id, name: String(r.fields['Brand Name'] ?? '') }))
      .filter(c => c.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [rawClients]
  )

  // Transform Airtable records → RevenueRow (replaces useEffect+setState)
  const liveData = useMemo<RevenueRow[]>(() => {
    if (!rawRevenue) return []
    return rawRevenue.map(r => {
      // Brand Name (from Client) is a lookup — returns array
      const clientLookup = r.fields['Brand Name (from Client)']
      let client = ''
      if (Array.isArray(clientLookup)) {
        client = String(clientLookup[0] ?? '')
      } else if (clientLookup) {
        client = String(clientLookup)
      }

      // Client is a linked record — returns array of record IDs
      const clientLink = r.fields['Client']
      let clientRecordId = ''
      if (Array.isArray(clientLink) && clientLink.length > 0) {
        clientRecordId = String(clientLink[0])
      }

      return {
        recordId: r.id,
        clientRecordId,
        name: String(r.fields['Entry'] ?? ''),
        client,
        date: String(r.fields['Date'] ?? ''),
        amountUsd: parseCurrency(r.fields['Amount USD'] as string),
        feesUsd: parseCurrency(r.fields['Fees USD'] as string),
        conversionRate: parseFloat(String(r.fields['Conversion Rate (USD>CAD)'] ?? '0')) || null,
        amountCad: parseCurrency(r.fields['Amount CAD'] as string),
        feesCad: parseCurrency(r.fields['Fees CAD'] as string),
      }
    })
  }, [rawRevenue])

  // Date range filter
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
      else if (dateRange === "Last 12 Months") threshold = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      return rowDate >= threshold
    })
  }, [liveData, dateRange])

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const aNum = (aVal ?? 0) as number
      const bNum = (bVal ?? 0) as number
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum
    })
  }, [filteredData, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const handleEdit = (row: RevenueRow) => {
    setEditingRow(row)
    setSelectedClientId(row.clientRecordId)
    setFormData({
      date: row.date,
      amountUsd: row.amountUsd,
      feesUsd: row.feesUsd,
      conversionRate: row.conversionRate ?? '',
      amountCad: row.amountCad,
      feesCad: row.feesCad,
    })
  }

  const handleDeleteClick = (row: RevenueRow) => {
    setDeleteConfirm(row)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      await fetch(`/api/airtable/revenue/${deleteConfirm.recordId}`, { method: 'DELETE' })
      await mutate()
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleteConfirm(null)
  }

  const handleSaveRevenue = async () => {
    if (!selectedClientId || !formData.date) return
    setIsSaving(true)
    try {
      const fields: Record<string, unknown> = {
        'Client': [selectedClientId],
        'Date': formData.date,
        ...(formData.amountUsd !== '' && { 'Amount USD': formData.amountUsd }),
        ...(formData.feesUsd !== '' && { 'Fees USD': formData.feesUsd }),
        ...(formData.conversionRate !== '' && { 'Conversion Rate (USD>CAD)': formData.conversionRate }),
        ...(formData.amountCad !== '' && { 'Amount CAD': formData.amountCad }),
        ...(formData.feesCad !== '' && { 'Fees CAD': formData.feesCad }),
      }

      if (editingRow) {
        await fetch(`/api/airtable/revenue/${editingRow.recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      } else {
        await fetch('/api/airtable/revenue', {
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
    setShowCreateModal?.(false)
    setFormData(emptyForm)
    setSelectedClientId('')
  }

  const handleExportCSV = () => {
    const headers = columns.map((col) => col.label).join(",")
    const rows = sortedData
      .map((row) =>
        [
          row.name,
          row.client,
          row.date,
          row.amountUsd,
          row.feesUsd,
          row.conversionRate ?? "",
          row.amountCad,
          row.feesCad,
        ].join(",")
      )
      .join("\n")
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `revenue-data-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (exportTrigger > 0) handleExportCSV()
  }, [exportTrigger])

  // Resolve the display name for the currently selected client
  const selectedClientName = clientOptions.find(c => c.id === selectedClientId)?.name ?? ''

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Revenue Details</h2>
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
                    <ArrowUpDown
                      className={cn(
                        "h-3 w-3 transition-colors",
                        sortKey === col.key
                          ? "text-foreground"
                          : "text-muted-foreground/30 group-hover:text-muted-foreground"
                      )}
                    />
                  </button>
                </th>
              ))}
              {!readOnly && (
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-right whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {revLoading ? (
              <tr>
                <td colSpan={columns.length + (readOnly ? 0 : 1)} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  Loading revenue data...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (readOnly ? 0 : 1)} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No revenue entries found for the selected date range.
                </td>
              </tr>
            ) : (
              sortedData.map((row, i) => (
                <tr
                  key={`${row.recordId}-${i}`}
                  className="border-b border-border/50 transition-colors hover:bg-accent/30"
                >
                  <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                    {row.client}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground tabular-nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-foreground tabular-nums text-right">
                    {formatCurrency(row.amountUsd)}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground tabular-nums text-right">
                    {formatCurrency(row.feesUsd)}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-foreground tabular-nums text-right">
                    {row.conversionRate ? row.conversionRate.toFixed(4) : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-foreground tabular-nums text-right">
                    {row.amountCad > 0 ? formatCurrency(row.amountCad) : "$0.00"}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-foreground tabular-nums text-right">
                    {row.feesCad > 0 ? formatCurrency(row.feesCad) : "$0.00"}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(row)}
                          className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(row)}
                          className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {(editingRow !== null || showCreateModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="rounded-t-xl px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-[15px] font-semibold text-foreground">
                {editingRow ? "Edit Revenue Entry" : "Add New Revenue Entry"}
              </h3>
              <button onClick={handleCloseModal} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <X className="h-4 w-4 text-foreground/60" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Client — linked record dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Client</label>
                <SelectField
                  value={selectedClientName || "Select a client"}
                  onChange={(v) => {
                    if (v === "Select a client") {
                      setSelectedClientId('')
                    } else {
                      const found = clientOptions.find(c => c.name === v)
                      if (found) setSelectedClientId(found.id)
                    }
                  }}
                  options={["Select a client", ...clientOptions.map(c => c.name)]}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Amount USD + Fees USD */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Amount USD</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amountUsd}
                    onChange={(e) => setFormData({ ...formData, amountUsd: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Fees USD</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.feesUsd}
                    onChange={(e) => setFormData({ ...formData, feesUsd: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Conversion Rate + Amount CAD */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Conversion Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.conversionRate}
                    onChange={(e) => setFormData({ ...formData, conversionRate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">Amount CAD</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amountCad}
                    onChange={(e) => setFormData({ ...formData, amountCad: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Fees CAD */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Fees CAD</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.feesCad}
                  onChange={(e) => setFormData({ ...formData, feesCad: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
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
                onClick={handleSaveRevenue}
                disabled={!selectedClientId || !formData.date || isSaving}
                className="px-4 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 text-[13px] font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : editingRow ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-sm">
            <div className="rounded-t-xl px-5 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">Delete Entry</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Are you sure you want to delete <span className="font-medium text-foreground">{deleteConfirm.name}</span>? This cannot be undone.
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
