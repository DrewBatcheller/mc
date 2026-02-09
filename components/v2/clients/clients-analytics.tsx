"use client"

import { useMemo, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FinancialCard } from "@/components/v2/financial/financial-card"
import { GraphCard } from "@/components/v2/graph-card"
import { DefaultPieChart } from "@/components/v2/default-pie-chart"
import { DashboardGrid } from "@/components/v2/dashboard-grid"
import type { AirtableRecord, ClientFields } from "@/lib/v2/types"

const COLORS = ["#0891b2", "#06b6d4", "#0ea5e9", "#0d9488", "#10b981", "#14b8a6"]

interface ClientsAnalyticsProps {
  clients: AirtableRecord<ClientFields>[]
  team: Array<{ id: string; fields: { "Full Name"?: string } }>
}

export function ClientsAnalytics({ clients, team }: ClientsAnalyticsProps) {
  const [planFilter, setPlanFilter] = useState("all")

  // Filter clients based on selected filters
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const plan = c.fields["Plan Type"] || ""

      if (planFilter !== "all" && plan !== planFilter) return false

      return true
    })
  }, [clients, planFilter])

  // 1. Clients Onboarded Over Time
  const onboardingData = useMemo(() => {
    const map: Record<string, number> = {}

    filteredClients.forEach((c) => {
      const date = c.fields["Initial Closed Date"]
      if (date) {
        const dateStr = date.split("T")[0]
        map[dateStr] = (map[dateStr] || 0) + 1
      }
    })

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        onboarded: count,
      }))
  }, [filteredClients])

  // 2. Clients Churned Over Time
  const churnData = useMemo(() => {
    const map: Record<string, number> = {}

    filteredClients.forEach((c) => {
      const date = c.fields["Churned Date"] || c.fields["Churn Date"]
      if (date) {
        const dateStr = date.split("T")[0]
        map[dateStr] = (map[dateStr] || 0) + 1
      }
    })


    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        churned: count,
      }))
  }, [filteredClients])

  // 3. Churn Reasons Distribution
  const churnReasonsData = useMemo(() => {
    const map: Record<string, number> = {}

    filteredClients.forEach((c) => {
      if (c.fields["Churn Reason"]) {
        const reasons = Array.isArray(c.fields["Churn Reason"])
          ? c.fields["Churn Reason"]
          : [c.fields["Churn Reason"]]
        reasons.forEach((reason) => {
          map[reason] = (map[reason] || 0) + 1
        })
      }
    })

    return Object.entries(map).map(([reason, count]) => ({
      name: reason,
      value: count,
    }))
  }, [filteredClients])

  // 4. Clients by Plan Type
  const planTypeData = useMemo(() => {
    const map: Record<string, number> = {}
    const plans = ["1 Test", "2 Tests", "3 Tests", "4 Tests", "Course"]

    plans.forEach((plan) => {
      map[plan] = filteredClients.filter((c) => c.fields["Plan Type"] === plan).length
    })

    return Object.entries(map).map(([plan, count]) => ({
      plan,
      count,
    }))
  }, [filteredClients])

  // 5. Average Sentiment by Plan Type
  const sentimentData = useMemo(() => {
    const sentimentMap: Record<string, { total: number; count: number }> = {
      "1 Test": { total: 0, count: 0 },
      "2 Tests": { total: 0, count: 0 },
      "3 Tests": { total: 0, count: 0 },
      "4 Tests": { total: 0, count: 0 },
      "Course": { total: 0, count: 0 },
    }

    const sentimentValues: Record<string, number> = {
      "happy": 5,
      "great": 5,
      "neutral": 3,
      "okay": 3,
      "unhappy": 1,
      "at risk": 1,
    }

    filteredClients.forEach((c) => {
      const plan = c.fields["Plan Type"] || "1 Test"
      const sentimentField = c.fields.Sentiment
      let sentiment = ""
      if (typeof sentimentField === "string") {
        sentiment = sentimentField.toLowerCase()
      } else if (Array.isArray(sentimentField) && sentimentField.length > 0) {
        sentiment = String(sentimentField[0]).toLowerCase()
      }
      const sentimentValue = sentimentValues[sentiment] || 0

      if (sentimentMap[plan]) {
        sentimentMap[plan].total += sentimentValue
        sentimentMap[plan].count += 1
      }
    })

    return Object.entries(sentimentMap).map(([plan, data]) => ({
      plan,
      avgSentiment: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
    }))
  }, [filteredClients])

  // 6. MRR by Plan Type
  const mrrData = useMemo(() => {
    const mrrMap: Record<string, number> = {
      "1 Test": 0,
      "2 Tests": 0,
      "3 Tests": 0,
      "4 Tests": 0,
      "Course": 0,
    }

    filteredClients.forEach((c) => {
      const plan = c.fields["Plan Type"] || "1 Test"
      const mrr = c.fields["Revenue Added (MRR) (K Format ) Rollup (from Experiments)"] || 0
      if (mrrMap[plan] !== undefined) {
        mrrMap[plan] += mrr
      }
    })

    return Object.entries(mrrMap).map(([plan, mrr]) => ({
      plan,
      mrr,
    }))
  }, [filteredClients])

  // 7. Clients by Status (Active, Inactive with Churn Date, Inactive without Churn Date)
  const statusData = useMemo(() => {
    const statusMap = {
      "Active": 0,
      "Churned": 0,
      "Inactive": 0,
    }

    filteredClients.forEach((c) => {
      const clientStatus = c.fields["Client Status"]?.toLowerCase() || c.fields.Status?.toLowerCase() || ""
      const hasChurnDate = !!c.fields["Churned Date"] || !!c.fields["Churn Date"]

      if (clientStatus === "active") {
        statusMap["Active"] += 1
      } else if (clientStatus === "inactive") {
        if (hasChurnDate) {
          statusMap["Churned"] += 1
        } else {
          statusMap["Inactive"] += 1
        }
      } else if (clientStatus === "paused") {
        statusMap["Inactive"] += 1
      }
    })

    const result = Object.entries(statusMap)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }))
    
    return result
  }, [filteredClients])

  const teamOptions = useMemo(
    () => team.map((t) => ({ id: t.id, name: t.fields["Full Name"] || t.id })),
    [team]
  )

  return (
    <div>
      {/* Filters */}
      <div className="py-4">
        <div className="flex flex-col gap-4 max-w-sm">
          <div>
            <Label className="text-sm">Plan Filter</Label>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="1 Test">1 Test</SelectItem>
                <SelectItem value="2 Tests">2 Tests</SelectItem>
                <SelectItem value="3 Tests">3 Tests</SelectItem>
                <SelectItem value="4 Tests">4 Tests</SelectItem>
                <SelectItem value="Course">Course</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Charts Grid - 1/2 width cards, 3 rows */}
      <DashboardGrid cols={2}>
        {/* Onboarding Chart */}
        <GraphCard title="Clients Onboarded Over Time" description="New client acquisitions by date">
          {onboardingData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No onboarding data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={onboardingData} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end" 
                  height={55}
                  tick={{ fontSize: 9, fill: "#666" }}
                  label={{ value: "Date", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: "#666" }}
                  width={45}
                  label={{ value: "Clients", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }} 
                />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                <Line
                  type="monotone"
                  dataKey="onboarded"
                  stroke="#0891b2"
                  strokeWidth={1.5}
                  dot={false}
                  name="Onboarded"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GraphCard>

        {/* Churn Chart */}
        <GraphCard title="Clients Churned Over Time" description="Client churn by date">
          {churnData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No churn data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={churnData} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end" 
                  height={55}
                  tick={{ fontSize: 9, fill: "#666" }}
                  label={{ value: "Date", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: "#666" }}
                  width={45}
                  label={{ value: "Clients", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }} 
                />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                <Line
                  type="monotone"
                  dataKey="churned"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  name="Churned"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GraphCard>

        {/* Clients by Plan - Bar Chart */}
        <GraphCard title="Clients by Plan Type" description="Distribution across plan types">
          {planTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No plan data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={planTypeData} margin={{ top: 5, right: 20, left: 50, bottom: 30 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="plan" 
                  angle={-45} 
                  textAnchor="end" 
                  height={55}
                  tick={{ fontSize: 9, fill: "#666" }}
                  label={{ value: "Plan Type", position: "bottom", offset: 10, fontSize: 10, fill: "#666" }}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: "#666" }}
                  width={45}
                  label={{ value: "Count", angle: -90, position: "left", offset: 10, fontSize: 10, fill: "#666" }} 
                />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: "4px", border: "1px solid #ddd" }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GraphCard>

        {/* Clients by Status - Pie Chart */}
        <FinancialCard title="Clients by Status" description="Active, Churned, and Inactive breakdown">
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No status data available
            </div>
          ) : (
            <DefaultPieChart 
              data={statusData}
              colors={COLORS}
              height={300}
              valueFormatter={(value) => String(value)}
            />
          )}
        </FinancialCard>
      </DashboardGrid>
    </div>
  )
}
