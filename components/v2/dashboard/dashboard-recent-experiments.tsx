"use client"

import { useMemo } from "react"
import { FlaskConical } from "lucide-react"
import { StatusBadge } from "@/components/v2/status-badge"
import { FinancialCard } from "@/components/v2/financial/financial-card"
import type { AirtableRecord, ExperimentFields } from "@/lib/v2/types"

function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function RecentExperimentsSection({
  experiments,
}: {
  experiments: AirtableRecord<ExperimentFields>[]
}) {
  const recentExperiments = useMemo(() => {
    return [...experiments]
      .filter((e) => e.fields["Launch Date"])
      .sort((a, b) => {
        const da = new Date(a.fields["Launch Date"] || 0).getTime()
        const db = new Date(b.fields["Launch Date"] || 0).getTime()
        return db - da
      })
      .slice(0, 5)
  }, [experiments])

  return (
    <FinancialCard title="Recent Experiments">
      <div className="flex flex-col gap-3">
        {recentExperiments.map((exp) => (
          <div key={exp.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{exp.fields["Test Description"]}</p>
              <p className="text-xs text-muted-foreground">
                {exp.fields["Brand Name (from Brand Name)"]?.[0] || "N/A"} -- {formatDate(exp.fields["Launch Date"])}
              </p>
            </div>
            <div className="shrink-0 ml-2">
              <StatusBadge status={exp.fields["Test Status"] || "Draft"} variant="solid" />
            </div>
          </div>
        ))}
        {recentExperiments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No experiments yet.</p>
        )}
      </div>
    </FinancialCard>
  )
}
