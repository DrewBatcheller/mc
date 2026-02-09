'use client';

import useSWR from "swr"
import { useUser } from "@/contexts/v2/user-context"
import type {
  AirtableRecord,
  ClientFields,
  ExperimentFields,
  BatchFields,
  VariantFields,
  ExperimentIdeaFields,
  TaskFields,
  TeamFields,
  ContactFields,
  LeadFields,
  CallRecordFields,
  RevenueFields,
  ExpenseFields,
} from "@/lib/v2/types"

// Create a fetcher that includes user session headers
function createFetcher(user: any) {
  return (url: string) => {
    const headers: Record<string, string> = { credentials: "include" as any }
    
    if (user) {
      headers["x-user-id"] = user.id
      headers["x-user-name"] = user.name
      headers["x-user-email"] = user.email
      headers["x-user-role"] = user.role
      if (user.clientRecordId) {
        headers["x-client-record-id"] = user.clientRecordId
      }
    }
    
    return fetch(url, { headers, credentials: "include" }).then((res) => res.json())
  }
}

// SWR config for critical data - more aggressive caching
const criticalConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 minute
}

// SWR config for non-critical data - lazy loading
const nonCriticalConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 120000, // 2 minutes
}

// Clients
export function useClients(status?: string) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/clients?${params.toString()}`,
    fetcher,
    criticalConfig
  )
  return {
    clients: (data?.records || []) as AirtableRecord<ClientFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Experiments
export function useExperiments(options?: { clientId?: string; status?: string; batchId?: string }) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (options?.clientId) params.set("clientId", options.clientId)
  if (options?.status) params.set("status", options.status)
  if (options?.batchId) params.set("batchId", options.batchId)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/experiments?${params.toString()}`,
    fetcher,
    criticalConfig
  )
  return {
    experiments: (data?.records || []) as AirtableRecord<ExperimentFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Batches
export function useBatches(options?: { clientId?: string; status?: string }) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (options?.clientId) params.set("clientId", options.clientId)
  if (options?.status) params.set("status", options.status)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/batches?${params.toString()}`,
    fetcher,
    nonCriticalConfig
  )
  return {
    batches: (data?.records || []) as AirtableRecord<BatchFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Variants
export function useVariants(options?: { experimentId?: string; batchRecordId?: string }) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (options?.experimentId) params.set("experimentId", options.experimentId)
  if (options?.batchRecordId) params.set("batchRecordId", options.batchRecordId)
  const { data, error, isLoading, mutate } = useSWR(
    options?.experimentId || options?.batchRecordId
      ? `/api/airtable/variants?${params.toString()}`
      : null,
    fetcher
  )
  return {
    variants: (data?.records || []) as AirtableRecord<VariantFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Experiment Ideas
export function useExperimentIdeas(clientId?: string) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (clientId) params.set("clientId", clientId)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/experiment-ideas?${params.toString()}`,
    fetcher
  )
  return {
    ideas: (data?.records || []) as AirtableRecord<ExperimentIdeaFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Tasks
export function useTasks(options?: { clientId?: string; department?: string; status?: string }) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (options?.clientId) params.set("clientId", options.clientId)
  if (options?.department) params.set("department", options.department)
  if (options?.status) params.set("status", options.status)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/tasks?${params.toString()}`,
    fetcher,
    nonCriticalConfig
  )
  return {
    tasks: (data?.records || []) as AirtableRecord<TaskFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Contacts
export function useContacts(clientIdOrContactIds?: string | string[]) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (clientIdOrContactIds) {
    if (Array.isArray(clientIdOrContactIds)) {
      params.set("contactIds", clientIdOrContactIds.join(","))
    } else {
      params.set("clientId", clientIdOrContactIds)
    }
  }
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/contacts?${params.toString()}`,
    fetcher
  )
  return {
    contacts: (data?.records || []) as AirtableRecord<ContactFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Leads
export function useLeads(status?: string) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/leads?${params.toString()}`,
    fetcher
  )
  return {
    leads: (data?.records || []) as AirtableRecord<LeadFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Call Records
export function useCallRecords(clientId?: string) {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const params = new URLSearchParams()
  if (clientId) params.set("clientId", clientId)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/airtable/call-records?${params.toString()}`,
    fetcher
  )
  return {
    callRecords: (data?.records || []) as AirtableRecord<CallRecordFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Revenue
export function useRevenue() {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const { data, error, isLoading, mutate } = useSWR("/api/airtable/revenue", fetcher)
  return {
    revenue: (data?.records || []) as AirtableRecord<RevenueFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Expenses
export function useExpenses() {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const { data, error, isLoading, mutate } = useSWR("/api/airtable/expenses", fetcher)
  return {
    expenses: (data?.records || []) as AirtableRecord<ExpenseFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}

// Team
export function useTeam() {
  const { currentUser } = useUser()
  const fetcher = createFetcher(currentUser)
  const { data, error, isLoading, mutate } = useSWR("/api/airtable/team", fetcher)
  return {
    team: (data?.records || []) as AirtableRecord<TeamFields>[],
    isLoading,
    isError: error,
    mutate,
  }
}
