'use client'

import { Users, UserCheck, Repeat, TrendingUp, Star, Clock } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { useAirtable } from "@/hooks/use-airtable"
import { parseCurrency } from "@/lib/transforms"

export function ClientStatCards() {
  const { data: clients, isLoading } = useAirtable('clients', {
    fields: ['Client Status', 'Monthly Price', 'LTV', 'Sentiment', 'Initial Closed Date', 'MASTER Onboarding BLN'],
  })

  const allClients = clients ?? []
  const active = allClients.filter(r => r.fields['Client Status'] === 'Active')
  const inactive = allClients.filter(r => r.fields['Client Status'] !== 'Active')

  const totalMrr = active.reduce((sum, r) => sum + parseCurrency(r.fields['Monthly Price'] as string), 0)
  const totalLtv = allClients.reduce((sum, r) => sum + parseCurrency(r.fields['LTV'] as string), 0)
  const avgLtv = allClients.length > 0 ? totalLtv / allClients.length : 0

  const sentimentClients = active.filter(r => r.fields['Sentiment'] != null)
  const avgSentiment = sentimentClients.length > 0
    ? (sentimentClients.reduce((sum, r) => sum + Number(r.fields['Sentiment'] ?? 0), 0) / sentimentClients.length).toFixed(2)
    : '0'

  const onboarding = allClients.filter(r => r.fields['MASTER Onboarding BLN']).length

  const row1 = [
    { label: "Total Clients", value: isLoading ? '—' : String(allClients.length), icon: Users },
    { label: "Active Clients", value: isLoading ? '—' : String(active.length), icon: UserCheck },
    { label: "Monthly Recurring Revenue (USD)", value: isLoading ? 0 : totalMrr, icon: Repeat, currency: true },
    { label: "Average LTV", value: isLoading ? 0 : avgLtv, icon: TrendingUp, currency: true },
  ]

  const row2 = [
    { label: "Average Client Sentiment", value: isLoading ? '—' : avgSentiment, sub: "Active Clients*", icon: Star },
    { label: "Clients in Onboarding", value: isLoading ? '—' : String(onboarding), icon: Clock },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {row1.map(s => <MetricCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {row2.map(s => <MetricCard key={s.label} {...s} />)}
      </div>
    </div>
  )
}
