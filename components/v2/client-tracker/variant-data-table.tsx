"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatCurrency } from "@/lib/utils"
import type { AirtableRecord, VariantFields } from "@/lib/v2/types"

interface VariantDataTableProps {
  variants: AirtableRecord<VariantFields>[]
}

function formatPercent(val?: string | number) {
  if (val === null || val === undefined || val === "") return "-"
  const num = typeof val === "number" ? val : parseFloat(String(val).replace("%", ""))
  if (isNaN(num) || num === 0) return "-"
  return `${num.toFixed(2)}%`
}

function formatDecimalPercent(val?: string | number) {
  if (val === null || val === undefined || val === "") return "-"
  const num = typeof val === "number" ? val : parseFloat(String(val).replace("%", ""))
  if (isNaN(num) || num === 0) return "-"
  // Multiply by 100 to convert decimal to percentage
  return `${(num * 100).toFixed(2)}%`
}

function formatNumber(val?: string | number) {
  if (val === null || val === undefined || val === "") return "-"
  const num = typeof val === "number" ? val : parseFloat(String(val))
  if (isNaN(num)) return "-"
  return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getImprovementColor(val?: string | number) {
  if (val === null || val === undefined || val === "") return ""
  const num = typeof val === "number" ? val : parseFloat(String(val).replace("%", "").replace(",", ""))
  if (isNaN(num) || num === 0) return "text-muted-foreground"
  return num > 0 ? "text-emerald-600" : "text-red-600"
}

function getDecimalImprovementColor(val?: string | number) {
  if (val === null || val === undefined || val === "") return ""
  const num = typeof val === "number" ? val : parseFloat(String(val).replace("%", "").replace(",", ""))
  if (isNaN(num) || num === 0) return "text-muted-foreground"
  return num > 0 ? "text-emerald-600" : "text-red-600"
}

export function VariantDataTable({ variants }: VariantDataTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Variant Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Traffic %</TableHead>
            <TableHead className="text-right">Preview URL</TableHead>
            <TableHead className="text-right">Visitors</TableHead>
            <TableHead className="text-right">Conv.</TableHead>
            <TableHead className="text-right">Rev.</TableHead>
            <TableHead className="text-right">Rev. Imprv. %</TableHead>
            <TableHead className="text-right">AOV</TableHead>
            <TableHead className="text-right">CR %</TableHead>
            <TableHead className="text-right">CR Imprv. %</TableHead>
            <TableHead className="text-right">CR Imprv. Confidence</TableHead>
            <TableHead className="text-right">RPV</TableHead>
            <TableHead className="text-right">RPV Imprv. %</TableHead>
            <TableHead className="text-right">RPV Imprv. Confidence</TableHead>
            <TableHead className="text-right">APPV</TableHead>
            <TableHead className="text-right">APPV Imprv. %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((v) => {
            const f = v.fields
            const isControl = f["Variant Name"]?.toLowerCase().includes("control")
            return (
              <TableRow key={v.id} className={cn(isControl && "bg-muted/30")}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isControl && (
                      <Badge variant="outline" className="text-xs">
                        Control
                      </Badge>
                    )}
                    <span className="text-sm">{f["Variant Name"]}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      f.Status?.toLowerCase() === "running" && "bg-teal-100 text-teal-800",
                      f.Status?.toLowerCase() === "winner" && "bg-emerald-100 text-emerald-800",
                      f.Status?.toLowerCase() === "loser" && "bg-red-100 text-red-800"
                    )}
                  >
                    {f.Status || "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">{formatPercent(f["Traffic %"])}</TableCell>
                <TableCell className="text-right text-sm">
                  {f["Preview URL"] ? (
                    <a href={f["Preview URL"]} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:text-teal-600 hover:underline truncate max-w-[150px] inline-block">
                      Preview
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">{formatNumber(f.Visitors)}</TableCell>
                <TableCell className="text-right text-sm">{formatNumber(f.Conversions)}</TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(f.Revenue)}</TableCell>
                <TableCell className={cn("text-right text-sm font-medium", getDecimalImprovementColor(f["Revenue Improvement %"]))}>
                  {formatDecimalPercent(f["Revenue Improvement %"])}
                </TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(f.AOV)}</TableCell>
                <TableCell className="text-right text-sm">{formatDecimalPercent(f["CR %"])}</TableCell>
                <TableCell className={cn("text-right text-sm font-medium", getDecimalImprovementColor(f["CR Improvement %"]))}>
                  {formatDecimalPercent(f["CR Improvement %"])}
                </TableCell>
                <TableCell className="text-right text-sm text-xs">{f["CR Improvement Confidence"] || "-"}</TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(f.RPV)}</TableCell>
                <TableCell className={cn("text-right text-sm font-medium", getDecimalImprovementColor(f["RPV Improvement %"]))}>
                  {formatDecimalPercent(f["RPV Improvement %"])}
                </TableCell>
                <TableCell className="text-right text-sm text-xs">{f["RPV Improvement Confidence"] || "-"}</TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(f.APPV, 2)}</TableCell>
                <TableCell className={cn("text-right text-sm font-medium", getImprovementColor(f["APPV Improvement %"]))}>
                  {formatPercent(f["APPV Improvement %"])}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
