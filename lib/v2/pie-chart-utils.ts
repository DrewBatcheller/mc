/**
 * Reorganizes pie chart data to alternate between large and small values
 * This prevents label overlap by spacing out similar-sized slices
 */
export function organizePieChartData<T extends { value: number; name?: string }>(
  data: T[]
): T[] {
  if (data.length <= 1) return data

  // Sort data by value in descending order
  const sorted = [...data].sort((a, b) => b.value - a.value)

  // Split into large and small values (using median as threshold)
  const median = sorted[Math.floor(sorted.length / 2)].value
  const large = sorted.filter((item) => item.value >= median)
  const small = sorted.filter((item) => item.value < median)

  // Interleave large and small values
  const result: T[] = []
  const maxLength = Math.max(large.length, small.length)

  for (let i = 0; i < maxLength; i++) {
    if (i < large.length) result.push(large[i])
    if (i < small.length) result.push(small[i])
  }

  return result
}
