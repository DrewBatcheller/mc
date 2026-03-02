import type { AirtableListResponse, AirtableRecord, ResourceSlug, TABLE_NAMES } from './types'

const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`
const API_KEY = process.env.AIRTABLE_API_KEY

if (!API_KEY) {
  console.warn('[airtable] AIRTABLE_API_KEY is not set')
}

// ─── Headers ──────────────────────────────────────────────────────────────────
function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

// ─── Fetch with retries + error handling ─────────────────────────────────────
async function airtableFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
    // Next.js cache config: revalidate every 60s by default
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new AirtableError(res.status, `Airtable request failed: ${res.status} — ${body}`)
  }

  return res
}

// ─── Custom error ─────────────────────────────────────────────────────────────
export class AirtableError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'AirtableError'
  }
}

// ─── List records ─────────────────────────────────────────────────────────────
export interface ListOptions {
  filterByFormula?: string
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>
  fields?: string[]
  maxRecords?: number
  pageSize?: number
  offset?: string
  view?: string
}

export async function listRecords<T = Record<string, unknown>>(
  tableName: string,
  options: ListOptions = {}
): Promise<AirtableListResponse<T>> {
  const params = new URLSearchParams()

  // filterByFormula needs to be properly encoded
  if (options.filterByFormula) {
    console.log('[airtable] filterByFormula before encoding:', options.filterByFormula)
    params.set('filterByFormula', options.filterByFormula)
  }
  if (options.maxRecords) params.set('maxRecords', String(options.maxRecords))
  if (options.pageSize) params.set('pageSize', String(options.pageSize))
  if (options.offset) params.set('offset', options.offset)
  if (options.view) params.set('view', options.view)
  if (options.fields) {
    options.fields.forEach((f) => params.append('fields[]', f))
  }
  if (options.sort) {
    options.sort.forEach((s, i) => {
      params.append(`sort[${i}][field]`, s.field)
      if (s.direction) params.append(`sort[${i}][direction]`, s.direction)
    })
  }

  const url = `${BASE_URL}/${encodeURIComponent(tableName)}?${params.toString()}`
  console.log('[airtable] Final URL:', url)
  const res = await airtableFetch(url)
  return res.json()
}

// ─── Get all pages (auto-paginate) ───────────────────────────────────────────
export async function listAllRecords<T = Record<string, unknown>>(
  tableName: string,
  options: Omit<ListOptions, 'offset'> = {}
): Promise<AirtableRecord<T>[]> {
  const allRecords: AirtableRecord<T>[] = []
  let offset: string | undefined

  do {
    const page = await listRecords<T>(tableName, { ...options, offset })
    allRecords.push(...page.records)
    offset = page.offset
  } while (offset)

  return allRecords
}

// ─── Get single record by ID ──────────────────────────────────────────────────
export async function getRecord<T = Record<string, unknown>>(
  tableName: string,
  recordId: string
): Promise<AirtableRecord<T>> {
  const url = `${BASE_URL}/${encodeURIComponent(tableName)}/${recordId}`
  const res = await airtableFetch(url)
  return res.json()
}

// ─── Create record ────────────────────────────────────────────────────────────
export async function createRecord<T = Record<string, unknown>>(
  tableName: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const url = `${BASE_URL}/${encodeURIComponent(tableName)}`
  const res = await airtableFetch(url, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
  return res.json()
}

// ─── Update record (PATCH) ────────────────────────────────────────────────────
export async function updateRecord<T = Record<string, unknown>>(
  tableName: string,
  recordId: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const url = `${BASE_URL}/${encodeURIComponent(tableName)}/${recordId}`
  const res = await airtableFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  return res.json()
}

// ─── Find records by formula ──────────────────────────────────────────────────
export async function findRecords<T = Record<string, unknown>>(
  tableName: string,
  formula: string,
  options: Omit<ListOptions, 'filterByFormula'> = {}
): Promise<AirtableRecord<T>[]> {
  const response = await listRecords<T>(tableName, {
    ...options,
    filterByFormula: formula,
  })
  return response.records
}

// ─── Find one record by formula ───────────────────────────────────────────────
export async function findOneRecord<T = Record<string, unknown>>(
  tableName: string,
  formula: string
): Promise<AirtableRecord<T> | null> {
  const records = await findRecords<T>(tableName, formula, { maxRecords: 1 })
  return records[0] ?? null
}
