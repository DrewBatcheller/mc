"use client"

import { TableHead } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChevronDown, ChevronRight, Play, Pencil, Trash2, Video, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableRow, TableCell, Table, TableHeader, TableBody } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AirtableRecord, ExperimentFields } from "@/lib/v2/types"

interface BatchRowGroupProps {
  batch: any
  isExpanded: boolean
  isClient: boolean
  onToggle: () => void
  onSelectExperiment: (exp: AirtableRecord<ExperimentFields>) => void
  onEditBatch: () => void
  revenue: string
  showActions?: boolean
  getBatchStatusBadge: (status?: string) => any
  getTestStatusBadge: (status?: string) => any
}

export function BatchRowGroup({
  batch,
  isExpanded,
  isClient,
  onToggle,
  onSelectExperiment,
  onEditBatch,
  revenue,
  showActions = true,
  getBatchStatusBadge,
  getTestStatusBadge,
}: BatchRowGroupProps) {
  return (
    <>
      <TooltipProvider>
        <TableRow
          className="hover:bg-muted/50 cursor-pointer"
          onClick={onToggle}
        >
          <TableCell>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </TableCell>
          {!isClient && (
            <TableCell className="font-medium">
              <span>{batch.clientName || batch.fields["Client Name"] || "-"}</span>
            </TableCell>
          )}
          <TableCell>
            {batch.launchDate
              ? new Date(batch.launchDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not set"}
          </TableCell>
          <TableCell>
            {batch.fields["PTA (Scheduled Finish)"]
              ? new Date(batch.fields["PTA (Scheduled Finish)"]).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "-"}
          </TableCell>
          <TableCell>{getBatchStatusBadge(batch.fields["All Tests Status"])}</TableCell>
          <TableCell>
            <Badge variant="secondary">{batch.experiments.length} test{batch.experiments.length !== 1 ? "s" : ""}</Badge>
          </TableCell>
          <TableCell>
            <span className={cn("text-sm font-medium", revenue !== "$0" ? "text-emerald-600" : "text-muted-foreground")}>
              {revenue}
            </span>
          </TableCell>
          {showActions && (
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Play className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Launch Batch</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditBatch()
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Edit Batch Date</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Delete Batch</TooltipContent>
                </Tooltip>
              </div>
            </TableCell>
          )}
        </TableRow>

        {/* Expanded experiments */}
        {isExpanded && batch.experiments.length > 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={showActions ? 8 : 7} className="p-0">
              <div className="bg-muted/30 border-y border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-12">Experiment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Devices</TableHead>
                      <TableHead>GEOs</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Revenue</TableHead>
                      {!isClient && <TableHead className="w-[50px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.experiments.map((exp: AirtableRecord<ExperimentFields>) => (
                      <TableRow
                        key={exp.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => onSelectExperiment(exp)}
                      >
                        <TableCell className="pl-12">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{exp.fields["Test Description"]}</span>
                            {exp.fields.Hypothesis && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                    {exp.fields.Hypothesis}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <p className="text-sm">{exp.fields.Hypothesis}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTestStatusBadge(exp.fields["Test Status"])}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm">{exp.fields.Placement || "-"}</span>
                            {exp.fields["Placement URL"] && (
                              <a
                                href={exp.fields["Placement URL"]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-teal-700 hover:text-teal-600 hover:underline block break-all"
                              >
                                {exp.fields["Placement URL"]}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{exp.fields.Devices || "All"}</span>
                        </TableCell>
                        <TableCell>
                          {exp.fields["GEOs Flags"] && (
                            <span className="text-sm">{exp.fields["GEOs Flags"]}</span>
                          )}
                          {!exp.fields["GEOs Flags"] && (
                            <span className="text-sm text-muted-foreground">{exp.fields.GEOs || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {exp.fields.Variants && exp.fields.Variants.length > 0 ? (
                            <span className="text-xs text-teal-700 font-medium">
                              {exp.fields.Variants.length} variant{exp.fields.Variants.length !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {exp.fields["Revenue Added (MRR)"] ? (
                            <span className="text-xs font-medium text-emerald-600">
                              ${exp.fields["Revenue Added (MRR)"]}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {!isClient && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {exp.fields["Post-Test Analysis (Loom)"] && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={exp.fields["Post-Test Analysis (Loom)"]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Video className="h-4 w-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>View PTA Video</TooltipContent>
                                </Tooltip>
                              )}
                              {exp.fields["FIGMA Url"] && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={exp.fields["FIGMA Url"]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <ImageIcon className="h-4 w-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>View Figma</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TableCell>
          </TableRow>
        )}

        {isExpanded && batch.experiments.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={showActions ? 8 : 7} className="text-center py-6 text-sm text-muted-foreground bg-muted/30">
              No experiments attached to this batch yet.
            </TableCell>
          </TableRow>
        )}
      </TooltipProvider>
    </>
  )
}
