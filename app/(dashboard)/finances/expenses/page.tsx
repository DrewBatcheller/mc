"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  ExpensesOverTimeChart,
  ExpensesByCategoryChart,
  ExpensesByVendorPie,
  ExpensesByCategoryPie,
  ExpensesByCategoryBar,
} from "@/components/finance/expenses-charts"
import { ExpensesDetailTable } from "@/components/finance/expenses-detail-table"
import { DateRangeFilter } from "@/components/finance/date-range-filter"

export default function ExpensesPage() {
  const [dateRange, setDateRange] = useState("All Time")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exportTrigger, setExportTrigger] = useState(0)

  const handleExport = () => {
    setExportTrigger((prev) => prev + 1)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Expenses
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            View and analyze company expenses by category, vendor, and time period
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <DateRangeFilter selectedRange={dateRange} onRangeChange={setDateRange} />
          <div className="flex items-end gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-foreground px-3 text-[13px] font-medium transition-colors"
              title="Export CSV"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-4 text-[13px] font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpensesOverTimeChart dateRange={dateRange} />
        <ExpensesByCategoryChart dateRange={dateRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpensesByVendorPie dateRange={dateRange} />
        <ExpensesByCategoryPie dateRange={dateRange} />
      </div>

      <ExpensesByCategoryBar dateRange={dateRange} />

      <ExpensesDetailTable 
        dateRange={dateRange}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        exportTrigger={exportTrigger}
      />
    </>
  )
}
