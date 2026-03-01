"use client"

import { Download } from "lucide-react"
import { useState, useEffect } from "react"
import { SelectField } from "@/components/shared/select-field"

const options = ["All Time", "Last Month", "Last 3 Months", "Last 6 Months", "Last 12 Months", "2025", "2024", "2023", "2022"]

interface DateRangeFilterProps {
  onExport?: () => void
  onRangeChange?: (range: string) => void
  selectedRange?: string
}

export function DateRangeFilter({ onExport, onRangeChange, selectedRange }: DateRangeFilterProps = {}) {
  const [selected, setSelected] = useState(selectedRange || "All Time")

  useEffect(() => {
    if (selectedRange && selectedRange !== selected) {
      setSelected(selectedRange)
    }
  }, [selectedRange])

  const handleChange = (value: string) => {
    setSelected(value)
    onRangeChange?.(value)
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1 w-fit">
        <span className="text-[12px] font-medium text-muted-foreground">Select Date Range</span>
        <SelectField value={selected} onChange={handleChange} options={options} />
      </div>
      {onExport && (
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-foreground px-3 text-[13px] font-medium transition-colors"
          title="Export CSV"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      )}
    </div>
  )
}
