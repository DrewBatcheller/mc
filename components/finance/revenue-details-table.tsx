"use client"

import { ArrowUpDown, Pencil, Trash2, AlertCircle } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { clients } from "@/components/clients/clients-table"
import { SelectField } from "@/components/shared/select-field"

type SortKey = "name" | "client" | "date" | "amountUsd" | "feesUsd" | "conversionRate" | "amountCad" | "feesCad"
type SortDirection = "asc" | "desc"

interface RevenueRow {
  name: string
  client: string
  date: string
  amountUsd: number
  feesUsd: number
  conversionRate: number | null
  amountCad: number
  feesCad: number
}

const data: RevenueRow[] = [
  { name: "Klone Scents - Dec 3, 2025", client: "Klone Scents", date: "2025-12-03", amountUsd: 6000, feesUsd: 222.30, conversionRate: 0, amountCad: 0, feesCad: 0 },
  { name: "Goose Creek Candles - Dec 1, 2025", client: "Goose Creek Candles", date: "2025-12-01", amountUsd: 2500, feesUsd: 92.71, conversionRate: 0, amountCad: 0, feesCad: 0 },
  { name: "Plufl - Nov 28, 2025", client: "Plufl", date: "2025-11-28", amountUsd: 1000, feesUsd: 37.30, conversionRate: 1.3952, amountCad: 1395.20, feesCad: 52.04 },
  { name: "Club Early Bird - Nov 27, 2025", client: "Club Early Bird", date: "2025-11-27", amountUsd: 5000, feesUsd: 185.21, conversionRate: 1.3952, amountCad: 6976, feesCad: 258.40 },
  { name: "Primal Queen - Nov 15, 2025", client: "Primal Queen", date: "2025-11-15", amountUsd: 8500, feesUsd: 315.10, conversionRate: 1.3952, amountCad: 11859.20, feesCad: 439.59 },
  { name: "Blox Boom - Nov 10, 2025", client: "Blox Boom", date: "2025-11-10", amountUsd: 4200, feesUsd: 155.82, conversionRate: 1.3952, amountCad: 5859.84, feesCad: 217.34 },
  { name: "Perfect White Tee - Nov 5, 2025", client: "Perfect White Tee", date: "2025-11-05", amountUsd: 6800, feesUsd: 252.16, conversionRate: 1.3952, amountCad: 9487.36, feesCad: 351.84 },
  { name: "Kitty Spout - Oct 28, 2025", client: "Kitty Spout", date: "2025-10-28", amountUsd: 3500, feesUsd: 129.85, conversionRate: 1.3952, amountCad: 4883.20, feesCad: 181.16 },
  { name: "Goose Creek Candles - Oct 15, 2025", client: "Goose Creek Candles", date: "2025-10-15", amountUsd: 2500, feesUsd: 92.71, conversionRate: 0, amountCad: 0, feesCad: 0 },
  { name: "Primal Queen - Oct 1, 2025", client: "Primal Queen", date: "2025-10-01", amountUsd: 8500, feesUsd: 315.10, conversionRate: 1.3952, amountCad: 11859.20, feesCad: 439.59 },
  { name: "Club Early Bird - Sep 25, 2025", client: "Club Early Bird", date: "2025-09-25", amountUsd: 5000, feesUsd: 185.21, conversionRate: 1.3952, amountCad: 6976, feesCad: 258.40 },
  { name: "Blox Boom - Sep 15, 2025", client: "Blox Boom", date: "2025-09-15", amountUsd: 4200, feesUsd: 155.82, conversionRate: 1.3952, amountCad: 5859.84, feesCad: 217.34 },
]

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
}

export function RevenueDetailsTable({ 
  showCreateModal = false, 
  setShowCreateModal,
  exportTrigger = 0,
  dateRange = "All Time"
}: RevenueDetailsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [revenueData, setRevenueData] = useState<RevenueRow[]>(data)
  const [editingRow, setEditingRow] = useState<{index: number, row: RevenueRow} | null>(null)
  const [formData, setFormData] = useState<Partial<RevenueRow>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{index: number, row: RevenueRow} | null>(null)

  // Get only active clients for dropdown
  const activeClients = useMemo(
    () => clients.filter((c) => c.status === "Active").map((c) => c.brand).sort(),
    []
  )

  // Filter data based on date range
  const filterByDateRange = (data: RevenueRow[], range: string): RevenueRow[] => {
    if (range === "All Time") return data

    const now = new Date()
    const getDateThreshold = () => {
      if (range === "Last Month") {
        const date = new Date(now)
        date.setMonth(date.getMonth() - 1)
        return date
      }
      if (range === "Last 3 Months") {
        const date = new Date(now)
        date.setMonth(date.getMonth() - 3)
        return date
      }
      if (range === "Last 6 Months") {
        const date = new Date(now)
        date.setMonth(date.getMonth() - 6)
        return date
      }
      if (range === "Last 12 Months") {
        const date = new Date(now)
        date.setFullYear(date.getFullYear() - 1)
        return date
      }
      if (range.match(/^\d{4}$/)) {
        return null
      }
      return null
    }

    const threshold = getDateThreshold()
    
    return data.filter((row) => {
      const rowDate = new Date(row.date)
      if (range.match(/^\d{4}$/)) {
        return rowDate.getFullYear().toString() === range
      }
      if (threshold) {
        return rowDate >= threshold
      }
      return true
    })
  }

  const filteredData = useMemo(
    () => filterByDateRange(revenueData, dateRange),
    [revenueData, dateRange]
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const handleEdit = (index: number, row: RevenueRow) => {
    setEditingRow({index, row})
    setFormData(row)
  }

  const handleDeleteClick = (index: number, row: RevenueRow) => {
    setDeleteConfirm({index, row})
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      const updatedData = revenueData.filter((_, i) => i !== deleteConfirm.index)
      setRevenueData(updatedData)
      setDeleteConfirm(null)
    }
  }

  const formatEntryName = (client: string, date: string) => {
    if (!client || !date) return ""
    const dateObj = new Date(date)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const formattedDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`
    return `${client} - ${formattedDate}`
  }

  const handleSaveRevenue = () => {
    if (editingRow) {
      const updatedData = [...revenueData]
      updatedData[editingRow.index] = formData as RevenueRow
      setRevenueData(updatedData)
    } else {
      if (formData.client && formData.date) {
        const entryWithName = {
          ...formData,
          name: formatEntryName(formData.client, formData.date)
        } as RevenueRow
        setRevenueData([...revenueData, entryWithName])
      }
    }
    setShowCreateModal?.(false)
    setEditingRow(null)
    setFormData({})
  }

  const handleCloseModal = () => {
    setEditingRow(null)
    setShowCreateModal?.(false)
    setFormData({})
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

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      const aNum = (aVal ?? 0) as number
      const bNum = (bVal ?? 0) as number
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum
    })
  }, [filteredData, sortKey, sortDirection])

  useEffect(() => {
    if (exportTrigger > 0) {
      handleExportCSV()
    }
  }, [exportTrigger])

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
              <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
                <tr
                  key={`${row.name}-${i}`}
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
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(i, row)}
                        className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(i, row)}
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

      {(editingRow || showCreateModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="text-base font-semibold text-foreground">
                {editingRow ? "Edit Revenue Entry" : "Add New Revenue Entry"}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Entry Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Client Name - Dec 1, 2025"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Client</label>
                <SelectField
                  value={formData.client || "Select a client"}
                  onChange={(v) => setFormData({...formData, client: v === "Select a client" ? "" : v})}
                  options={["Select a client", ...activeClients]}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Date</label>
                <input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">Amount USD</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amountUsd || ""}
                    onChange={(e) => setFormData({...formData, amountUsd: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">Fees USD</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.feesUsd || ""}
                    onChange={(e) => setFormData({...formData, feesUsd: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">Conversion Rate</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.conversionRate || ""}
                    onChange={(e) => setFormData({...formData, conversionRate: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-foreground mb-1.5">Amount CAD</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amountCad || ""}
                    onChange={(e) => setFormData({...formData, amountCad: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Fees CAD</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.feesCad || ""}
                  onChange={(e) => setFormData({...formData, feesCad: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card">
              <button
                onClick={handleCloseModal}
                className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-foreground text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRevenue}
                className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium transition-colors"
              >
                {editingRow ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-sm">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">Delete Entry</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Are you sure you want to delete {deleteConfirm.row.name}? This cannot be undone.
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
