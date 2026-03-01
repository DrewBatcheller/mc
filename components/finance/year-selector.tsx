"use client"

import { useState } from "react"
import { SelectField } from "@/components/shared/select-field"

const years = ["2025", "2024", "2023", "2022"]

interface YearSelectorProps {
  value?: string
  onChange?: (year: string) => void
  includeAll?: boolean
}

export function YearSelector({ value, onChange, includeAll }: YearSelectorProps) {
  const [internalSelected, setInternalSelected] = useState("2025")

  const selected = value ?? internalSelected
  const setSelected = onChange ?? setInternalSelected

  const options = includeAll ? [...years, "All Records"] : years

  const handleChange = (v: string) => setSelected(v === "All Records" ? "all" : v)
  const displayValue = selected === "all" ? "All Records" : selected

  return (
    <div className="flex flex-col gap-1 w-fit">
      <span className="text-[12px] font-medium text-muted-foreground">Select Year</span>
      <SelectField value={displayValue} onChange={handleChange} options={options} />
    </div>
  )
}
