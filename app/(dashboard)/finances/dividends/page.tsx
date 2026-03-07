"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useUser } from "@/contexts/UserContext"
import { DividendStatCards } from "@/components/finance/dividend-stat-cards"
import { DividendTable } from "@/components/finance/dividend-table"
import { YearSelector } from "@/components/finance/year-selector"

export default function DividendsPage() {
  const { user } = useUser()
  const isViewOnly = !!user?.permissions?.financesViewOnly
  const [year, setYear] = useState("all")
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
            Dividends
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Dividend distribution tracking
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <YearSelector value={year} onChange={setYear} includeAll />
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
            {!isViewOnly && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-4 text-[13px] font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </button>
            )}
          </div>
        </div>
      </div>

      <DividendStatCards year={year} />

      <DividendTable
        year={year}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        exportTrigger={exportTrigger}
        readOnly={isViewOnly}
      />
    </>
  )
}
