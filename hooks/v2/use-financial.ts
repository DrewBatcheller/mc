"use client"

import useSWR from "swr"
import { useUser } from "@/contexts/v2/user-context"
import type { AirtableRecord, RevenueFields, ExpenseFields, PLFields, DividendFields, ReserveFields } from "@/lib/v2/types"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export function useRevenue() {
  const { currentUser } = useUser()
  const { data, error, isLoading } = useSWR(
    currentUser ? "/api/airtable/revenue" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    revenue: (data?.records || []) as AirtableRecord<RevenueFields>[],
    isLoading,
    isError: error,
  }
}

export function useExpenses() {
  const { currentUser } = useUser()
  const { data, error, isLoading } = useSWR(
    currentUser ? "/api/airtable/expenses" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    expenses: (data?.records || []) as AirtableRecord<ExpenseFields>[],
    isLoading,
    isError: error,
  }
}

export function usePL() {
  const { currentUser } = useUser()
  const { data, error, isLoading } = useSWR(
    currentUser ? "/api/airtable/pnl" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    pl: (data?.records || []) as AirtableRecord<PLFields>[],
    isLoading,
    isError: error,
  }
}

export function useDividends() {
  const { currentUser } = useUser()
  const { data, error, isLoading } = useSWR(
    currentUser ? "/api/airtable/dividends" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    dividends: (data?.records || []) as AirtableRecord<DividendFields>[],
    isLoading,
    isError: error,
  }
}

export function useReserves() {
  const { currentUser } = useUser()
  const { data, error, isLoading } = useSWR(
    currentUser ? "/api/airtable/reserves" : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    reserves: (data?.records || []) as AirtableRecord<ReserveFields>[],
    isLoading,
    isError: error,
  }
}
