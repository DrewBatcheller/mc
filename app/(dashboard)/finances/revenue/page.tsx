"use client"

import { useState } from "react"
import { useUser } from "@/contexts/UserContext"
import {
  RevenueOverTimeChart,
  AvgRevenuePerClientChart,
} from "@/components/finance/revenue-over-time-chart"
import {
  TopClientsByRevenue,
  RevenueByCategoryList,
  MrrUpsellOtherChart,
} from "@/components/finance/revenue-summary-cards"
import { RevenueDetailsTable } from "@/components/finance/revenue-details-table"
import { DateRangeFilter } from "@/components/finance/date-range-filter"
import { Plus } from "lucide-react"

export default function RevenuePage() {
  const { user } = useUser()
  const isViewOnly = !!user?.permissions?.financesViewOnly
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exportTrigger, setExportTrigger] = useState(0)
  const [dateRange, setDateRange] = useState("All Time")

  const handleExport = () => {
    setExportTrigger((prev) => prev + 1)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Revenue
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Revenue analysis and trends
          </p>
        </div>
        <div className="flex items-end gap-3">
          <DateRangeFilter 
            onExport={handleExport} 
            onRangeChange={setDateRange}
            selectedRange={dateRange}
          />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueOverTimeChart dateRange={dateRange} />
        <AvgRevenuePerClientChart dateRange={dateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TopClientsByRevenue dateRange={dateRange} />
        <RevenueByCategoryList dateRange={dateRange} />
        <MrrUpsellOtherChart dateRange={dateRange} />
      </div>

      <RevenueDetailsTable
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        exportTrigger={exportTrigger}
        dateRange={dateRange}
        readOnly={isViewOnly}
      />
    </>
  )
}
