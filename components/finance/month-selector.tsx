"use client"

import { useState, useEffect } from "react"
import { SelectField } from "@/components/shared/select-field"

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const years = ["2025", "2024", "2023", "2022"]

export function MonthSelector({ 
  value, 
  onChange 
}: { 
  value?: string
  onChange?: (value: string) => void 
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (value) {
      const [, month] = value.split("-")
      return months[parseInt(month) - 1]
    }
    return "January"
  })
  const [selectedYear, setSelectedYear] = useState(() => {
    if (value) {
      const [year] = value.split("-")
      return year
    }
    return "2025"
  })

  useEffect(() => {
    if (value) {
      const [year, month] = value.split("-")
      setSelectedMonth(months[parseInt(month) - 1])
      setSelectedYear(year)
    }
  }, [value])

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    const monthNum = String(months.indexOf(month) + 1).padStart(2, "0")
    onChange?.(`${selectedYear}-${monthNum}`)
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    const monthNum = String(months.indexOf(selectedMonth) + 1).padStart(2, "0")
    onChange?.(`${year}-${monthNum}`)
  }

  return (
    <div className="flex items-end gap-3 w-fit">
      <div>
        <span className="text-[12px] font-medium text-muted-foreground block mb-1">Month</span>
        <SelectField value={selectedMonth} onChange={handleMonthChange} options={months} />
      </div>
      <div>
        <span className="text-[12px] font-medium text-muted-foreground block mb-1">Year</span>
        <SelectField value={selectedYear} onChange={handleYearChange} options={years} />
      </div>
    </div>
  )
}

