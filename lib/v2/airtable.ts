import type { AirtableRecord, AirtableResponse } from "@/lib/v2/types"

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || ""
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || ""
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

// Table names in Airtable
export const TABLES = {
  CLIENTS: "Clients",
  CONTACTS: "Contacts",
  TEAM: "Team",
  EXPERIMENTS: "Experiments",
  BATCHES: "Batches",
  EXPERIMENT_IDEAS: "Experiment Ideas",
  TASKS: "Tasks",
  VARIANTS: "Variants",
  LEADS: "Leads",
  CALL_RECORDS: "Call Record",
  REVENUE: "Revenue",
  EXPENSES: "Expenses",
  PL: "Profit & Loss",
  DIVIDENDS: "Dividends Paid",
  RESERVES: "Reserve",
} as const

interface FetchOptions {
  view?: string
  filterByFormula?: string
  sort?: Array<{ field: string; direction?: "asc" | "desc" }>
  maxRecords?: number
  fields?: string[]
  pageSize?: number
}

// Generic fetch function for any Airtable table
export async function fetchTable<T>(
  tableName: string,
  options: FetchOptions = {}
): Promise<AirtableRecord<T>[]> {
  const allRecords: AirtableRecord<T>[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams()

    if (options.view) params.set("view", options.view)
    if (options.filterByFormula) params.set("filterByFormula", options.filterByFormula)
    if (options.maxRecords) params.set("maxRecords", options.maxRecords.toString())
    if (options.pageSize) params.set("pageSize", options.pageSize.toString())
    if (offset) params.set("offset", offset)

    if (options.sort) {
      options.sort.forEach((s, i) => {
        params.set(`sort[${i}][field]`, s.field)
        if (s.direction) params.set(`sort[${i}][direction]`, s.direction)
      })
    }

    if (options.fields) {
      options.fields.forEach((f) => params.append("fields[]", f))
    }

    const url = `${AIRTABLE_API_URL}/${encodeURIComponent(tableName)}?${params.toString()}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[v0] Airtable error for ${tableName}:`, res.status, errorText)
      throw new Error(`fetch to ${url} failed with status ${res.status} and body: ${errorText}`)
    }

    const data: AirtableResponse<T> = await res.json()
    allRecords.push(...data.records)
    offset = data.offset
  } while (offset)

  return allRecords
}

// Fetch a single record by ID
export async function fetchRecord<T>(
  tableName: string,
  recordId: string
): Promise<AirtableRecord<T>> {
  const url = `${AIRTABLE_API_URL}/${encodeURIComponent(tableName)}/${recordId}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 30 },
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`[Airtable] Error fetching record ${recordId} from ${tableName}:`, res.status, errorText)
    throw new Error(`Airtable API error: ${res.status} - ${errorText}`)
  }

  return res.json()
}

// Update a record
export async function updateRecord<T>(
  tableName: string,
  recordId: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const url = `${AIRTABLE_API_URL}/${encodeURIComponent(tableName)}/${recordId}`

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`[Airtable] Error updating record ${recordId}:`, res.status, errorText)
    throw new Error(`Airtable API error: ${res.status} - ${errorText}`)
  }

  return res.json()
}

// Create a record
export async function createRecord<T>(
  tableName: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const url = `${AIRTABLE_API_URL}/${encodeURIComponent(tableName)}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`[Airtable] Error creating record:`, res.status, errorText)
    throw new Error(`Airtable API error: ${res.status} - ${errorText}`)
  }

  return res.json()
}
