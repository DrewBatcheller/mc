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
  // Only cache GET (read) requests — mutations must always reach Airtable
  const method = (options?.method ?? 'GET').toUpperCase()
  const isMutation = method !== 'GET'

  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
    // Reads: revalidate every 60s via Next.js Data Cache
    // Mutations: bypass cache entirely so the write always reaches Airtable
    ...(isMutation ? { cache: 'no-store' as RequestCache } : { next: { revalidate: 60 } }),
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
  const params: Record<string, string | string[]> = {}

  if (options.filterByFormula) params.filterByFormula = options.filterByFormula
  if (options.maxRecords) params.maxRecords = String(options.maxRecords)
  if (options.pageSize) params.pageSize = String(options.pageSize)
  if (options.offset) params.offset = options.offset
  if (options.view) params.view = options.view
  
  // Build URL with manual parameter encoding
  let url = `${BASE_URL}/${encodeURIComponent(tableName)}`
  const queryParts: string[] = []
  
  // Handle simple params
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      queryParts.push(`${key}=${encodeURIComponent(value)}`)
    }
  })
  
  // Handle fields array
  if (options.fields) {
    options.fields.forEach(f => {
      queryParts.push(`fields[]=${encodeURIComponent(f)}`)
    })
  }
  
  // Handle sort array
  if (options.sort) {
    options.sort.forEach((s, i) => {
      queryParts.push(`sort[${i}][field]=${encodeURIComponent(s.field)}`)
      if (s.direction) {
        queryParts.push(`sort[${i}][direction]=${encodeURIComponent(s.direction)}`)
      }
    })
  }
  
  if (queryParts.length > 0) {
    url += '?' + queryParts.join('&')
  }
  
  const res = await airtableFetch(url)
  return res.json()
}

// ─── Get all pages (auto-paginate) ───────────────────────────────────────────
// Retries from the first page on LIST_RECORDS_ITERATOR_NOT_AVAILABLE (422).
// This error occurs during cold-cache bursts when Airtable's pagination cursor
// expires, or when concurrent requests hit the same table simultaneously.
export async function listAllRecords<T = Record<string, unknown>>(
  tableName: string,
  options: Omit<ListOptions, 'offset'> = {}
): Promise<AirtableRecord<T>[]> {
  const MAX_RETRIES = 2

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const allRecords: AirtableRecord<T>[] = []
      let offset: string | undefined

      do {
        const page = await listRecords<T>(tableName, { ...options, offset })
        allRecords.push(...page.records)
        offset = page.offset
      } while (offset)

      return allRecords
    } catch (err) {
      const is422 = err instanceof AirtableError && err.status === 422
      if (is422 && attempt < MAX_RETRIES) {
        // Back off briefly before retrying from page 1
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)))
        continue
      }
      throw err
    }
  }

  return [] // unreachable — satisfies TypeScript
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

// ─── Delete record ────────────────────────────────────────────────────────────
export async function deleteRecord(
  tableName: string,
  recordId: string
): Promise<void> {
  const url = `${BASE_URL}/${encodeURIComponent(tableName)}/${recordId}`
  await airtableFetch(url, { method: 'DELETE' })
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
