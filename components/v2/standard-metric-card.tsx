"use client"

interface StandardMetricCardProps {
  label: string
  value: string | number
  color?: "default" | "emerald" | "amber" | "red" | "blue" | "teal"
}

const colorStyles = {
  default: "text-foreground",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
  blue: "text-blue-600",
  teal: "text-teal-600",
}

const parseValue = (value: string | number): { symbol: string; number: string; symbolPosition: "before" | "after" } => {
  let strValue = String(value)
  let symbol = ""
  let symbolPosition: "before" | "after" = "before"

  if (strValue.startsWith("$")) {
    symbol = "$"
    symbolPosition = "before"
    strValue = strValue.slice(1)
  }

  if (strValue.endsWith("%")) {
    symbol = "%"
    symbolPosition = "after"
    strValue = strValue.slice(0, -1)
  }

  return { symbol, number: strValue, symbolPosition }
}

export function StandardMetricCard({ label, value, color = "default" }: StandardMetricCardProps) {
  const { symbol, number, symbolPosition } = parseValue(value)

  return (
    <div className="border border-border rounded-md bg-card px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground leading-none">{label}</p>
      <div className={`mt-1 ${colorStyles[color]}`}>
        {symbolPosition === "before" && <span className="text-sm font-medium">{symbol}</span>}
        <span className="text-xl font-semibold tabular-nums">{number}</span>
        {symbolPosition === "after" && <span className="text-sm font-medium">{symbol}</span>}
      </div>
    </div>
  )
}
