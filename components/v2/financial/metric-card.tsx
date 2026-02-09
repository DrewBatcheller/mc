"use client"

import React from "react"

import { Card } from "@/components/ui/card"

interface MetricCardProps {
  title: string | React.ReactNode
  value: string | number
  variant?: "revenue" | "mrr" | "expenses" | "profit" | "ebitda" | "margin" | "default"
}

const variantStyles = {
  revenue: {
    bg: "bg-teal-50",
    border: "border-blue-200",
    title: "text-teal-600",
    value: "text-blue-900",
  },
  mrr: {
    bg: "bg-teal-50",
    border: "border-blue-200",
    title: "text-teal-600",
    value: "text-blue-900",
  },
  expenses: {
    bg: "bg-red-50",
    border: "border-red-200",
    title: "text-red-600",
    value: "text-red-900",
  },
  profit: {
    bg: "bg-green-50",
    border: "border-green-200",
    title: "text-green-600",
    value: "text-green-900",
  },
  ebitda: {
    bg: "bg-green-50",
    border: "border-green-200",
    title: "text-green-600",
    value: "text-green-900",
  },
  margin: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    title: "text-slate-700",
    value: "text-slate-900",
  },
  default: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    title: "text-slate-700",
    value: "text-slate-900",
  },
}

const formatCurrency = (value: string | number): { symbol: string; number: string; symbolPosition: "before" | "after" } => {
  let strValue = String(value)
  let symbol = ""
  let symbolPosition: "before" | "after" = "before"

  // Extract leading $ if present
  if (strValue.startsWith("$")) {
    symbol = "$"
    symbolPosition = "before"
    strValue = strValue.slice(1)
  }

  // Extract trailing % if present
  if (strValue.endsWith("%")) {
    symbol = "%"
    symbolPosition = "after"
    strValue = strValue.slice(0, -1)
  }

  // Format number with currency formatting if it's a currency
  if (symbol === "$") {
    const num = parseFloat(strValue)
    if (!isNaN(num)) {
      strValue = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }

  return { symbol, number: strValue, symbolPosition }
}

export function MetricCard({ title, value, variant = "default" }: MetricCardProps) {
  const styles = variantStyles[variant]
  const { symbol, number, symbolPosition } = formatCurrency(value)

  return (
    <Card className={`${styles.bg} ${styles.border} p-2 pl-4 rounded-sm`}>
      <div className="space-y-0.5">
        <div className={`text-xs font-medium ${styles.title}`}>{title}</div>
        <div className={`${styles.value}`}>
          {symbolPosition === "before" && <span className="text-lg">{symbol}</span>}
          <span className="text-3xl">{number}</span>
          {symbolPosition === "after" && <span className="text-lg">{symbol}</span>}
        </div>
      </div>
    </Card>
  )
}
