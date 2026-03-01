"use client"

import { PnlTable } from "@/components/finance/pnl-table"
import { YearSelector } from "@/components/finance/year-selector"
import { useState } from "react"
import { Download } from "lucide-react"

export default function PnlPage() {
  const [year, setYear] = useState("2025")
  const [showDividends, setShowDividends] = useState(false)
  const [exportTrigger, setExportTrigger] = useState(0)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Profit & Loss</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Comprehensive P&L analysis</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[13px] text-muted-foreground">Show Dividends</span>
              <button
                type="button"
                role="switch"
                aria-checked={showDividends}
                onClick={() => setShowDividends(!showDividends)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border transition-colors ${
                  showDividends ? "bg-foreground" : "bg-muted"
                }`}
              >
                <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-card shadow-sm transition-transform ${
                  showDividends ? "translate-x-[18px]" : "translate-x-[2px]"
                }`} />
              </button>
            </label>
            <YearSelector value={year} onChange={setYear} includeAll />
          </div>
          <button
            onClick={() => setExportTrigger((prev) => prev + 1)}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-foreground px-3 text-[13px] font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <PnlTable year={year} showDividends={showDividends} exportTrigger={exportTrigger} />
    </>
  )
}
