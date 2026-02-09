// Utility for business day calculations
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let addedDays = 0

  while (addedDays < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++
    }
  }

  return result
}

export function getDefaultBatchDate(latestBatchLaunchDate?: string): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (latestBatchLaunchDate) {
    const latestDate = new Date(latestBatchLaunchDate)
    latestDate.setHours(0, 0, 0, 0)
    // 28 days from latest batch
    const earliest = new Date(latestDate)
    earliest.setDate(earliest.getDate() + 28)
    return addBusinessDays(earliest, 0) // Ensure it's a business day
  }

  // Default: today + 12 business days
  return addBusinessDays(today, 12)
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}
