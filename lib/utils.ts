import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(value: unknown, decimals: number = 2): string {
  if (!value && value !== 0) return "-"
  const num = typeof value === "string" ? parseFloat(value) : Number(value)
  if (isNaN(num)) return "-"
  return num.toFixed(decimals)
}

export function formatCurrency(value: unknown, decimals: number = 0): string {
  if (!value && value !== 0) return "-"
  const num = typeof value === "string" ? parseFloat(value) : Number(value)
  if (isNaN(num)) return "-"
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
