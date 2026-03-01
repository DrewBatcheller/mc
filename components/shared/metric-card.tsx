import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: string
  icon?: React.ElementType
  small?: boolean
  className?: string
  currency?: boolean
}

function formatValue(value: string | number, isCurrency: boolean = false): string {
  if (typeof value === "string") {
    return value
  }

  if (isCurrency) {
    // Format with M/K suffixes for large currency values
    if (value >= 1000000) {
      const millions = value / 1000000
      if (Math.abs(millions - Math.round(millions)) < 0.0001) {
        return `$${Math.round(millions).toLocaleString("en-US", { maximumFractionDigits: 0 })}M`
      }
      return `$${millions.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
    }
    
    if (value > 1000) {
      const thousands = value / 1000
      if (Math.abs(thousands - Math.round(thousands)) < 0.0001) {
        return `$${Math.round(thousands).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`
      }
      return `$${thousands.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`
    }

    // For values under 1000, show normal currency with 2 decimals
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // For regular numeric values, show decimals only if not a whole number
  if (typeof value === "number") {
    // Check if it's a whole number (including values like 3.00)
    if (Math.abs(value - Math.round(value)) < 0.0001) {
      return Math.round(value).toLocaleString("en-US", { maximumFractionDigits: 0 })
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })
  }

  return String(value)
}

export function MetricCard({ label, value, sub, trend, icon: Icon, small, className, currency = false }: MetricCardProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border flex flex-col gap-3", Icon ? "p-5" : "p-4", small && "gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className={cn("font-medium text-muted-foreground", Icon ? "text-[13px]" : "text-[11px]")}>
          {label}
        </span>
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={cn(
          "font-semibold tracking-tight text-foreground tabular-nums",
          small ? "text-lg" : "text-2xl"
        )}>
          {formatValue(value, currency)}
        </span>
        {sub && (
          <span className="text-[12px] text-muted-foreground">{sub}</span>
        )}
        {trend && (
          <span className="text-[11px] text-muted-foreground">{trend}</span>
        )}
      </div>
    </div>
  )
}
