"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect, useMemo } from "react"

interface SelectFieldProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  className?: string
  containerClassName?: string
  label?: string
  disabled?: boolean
}

export function SelectField({
  value,
  onChange,
  options,
  className,
  containerClassName,
  label,
  disabled,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  /**
   * The longest option by character count — used as the invisible width anchor.
   * This ensures the trigger never shrinks when the user selects a shorter option.
   */
  const longestOption = useMemo(
    () => [...options].sort((a, b) => b.length - a.length)[0] ?? value,
    [options, value]
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    /**
     * inline-grid makes the container shrink-wrap its content.
     * Both the invisible anchor and the trigger share grid-area 1/1 so they
     * stack in the same cell — the cell (and container) size = max of both,
     * keeping the trigger at a stable "longest option" width.
     */
    <div ref={ref} className={cn("relative inline-grid", containerClassName)}>

      {/* Invisible width-anchor — renders the longest option to lock the container width */}
      <span
        aria-hidden="true"
        style={{ gridArea: "1/1" }}
        className="invisible pointer-events-none select-none flex items-center gap-2 text-[13px] font-medium px-3 py-1.5 whitespace-nowrap"
      >
        {longestOption}
        {/* Mirror the chevron so padding matches the trigger exactly */}
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </span>

      {/* Trigger button — overlays the anchor in the same grid cell */}
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ gridArea: "1/1" }}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between gap-2 text-[13px] font-medium bg-card border border-border rounded-lg px-3 py-1.5 pr-2.5 text-foreground hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-colors",
          open && "bg-accent",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 z-50 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-md py-1"
        >
          {options.map((option) => (
            <button
              key={option}
              role="option"
              aria-selected={value === option}
              type="button"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[13px] transition-colors whitespace-nowrap",
                value === option
                  ? "font-medium text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
