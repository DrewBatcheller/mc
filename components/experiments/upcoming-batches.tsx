"use client"

import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const batches = [
  {
    client: "Dr Woof Apparel",
    date: "2026 February 20",
    experiments: [
      {
        name: "Mobile Navigation Category Tabs (Socks vs. Scrubs)",
        split: "50/50",
        device: "Mobile",
        placement: "Mobile Menu",
        url: "#",
      },
      {
        name: "Collection Page Visual Navigation Bubbles",
        split: "50/50",
        device: "All Devices",
        placement: "Top of Collection Pages",
        url: "#",
      },
      {
        name: 'High-Visibility "Always-On" Search Header',
        split: "50/50",
        device: "All Devices",
        placement: "Header/Navigation",
        url: "#",
      },
    ],
  },
  {
    client: "Primal Queen",
    date: "2026 February 25",
    experiments: [
      {
        name: "Hero Banner A/B Split Test",
        split: "50/50",
        device: "All Devices",
        placement: "Homepage Hero",
        url: "#",
      },
      {
        name: "Product Page Social Proof Badges",
        split: "50/50",
        device: "All Devices",
        placement: "Product Page",
        url: "#",
      },
    ],
  },
]

interface UpcomingBatchesProps {
  onExperimentClick?: (experiment: any) => void
}

// Convert batch experiment data to full experiment format for modal
function convertToExperiment(exp: any, client: string, launchDate: string) {
  return {
    name: exp.name,
    description: `Scheduled to launch on ${launchDate}`,
    status: "Pending",
    placement: exp.placement,
    placementUrl: exp.url !== "#" ? exp.url : undefined,
    devices: exp.device,
    geos: "US",
    variants: exp.split,
    revenue: "$0",
    primaryGoals: ["CVR", "RPV"],
    hypothesis: `Testing ${exp.name} on ${exp.placement} to improve conversion rates.`,
    rationale: `This experiment targets the ${exp.placement} on ${exp.device} devices with a ${exp.split} split to validate potential improvements.`,
    weighting: exp.split,
    launchDate: launchDate,
  }
}

export function UpcomingBatches({ onExperimentClick }: UpcomingBatchesProps) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Upcoming Batches</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Batches with future launch dates
        </p>
      </div>
      <div className="divide-y divide-border">
        {batches.map((batch) => (
          <div key={batch.client} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-semibold text-foreground">
                {batch.client}
              </span>
              <span className="text-[12px] text-muted-foreground">|</span>
              <span className="text-[12px] text-muted-foreground">{batch.date}</span>
            </div>
            <div className="flex flex-col gap-3 pl-3 border-l-2 border-sky-400">
              {batch.experiments.map((exp) => (
                <div 
                  key={exp.name} 
                  onClick={() => onExperimentClick && onExperimentClick(convertToExperiment(exp, batch.client, batch.date))}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg p-2 -ml-2 -mt-0.5 transition-colors",
                    onExperimentClick && "cursor-pointer hover:bg-accent/30"
                  )}
                >
                  <span className="text-[13px] font-medium text-foreground">
                    {exp.name}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-5 rounded font-medium"
                    >
                      {exp.split}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5 rounded font-medium"
                    >
                      {exp.device}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{exp.placement}</span>
                  </div>
                  <a
                    href={exp.url}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Placement URL
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
