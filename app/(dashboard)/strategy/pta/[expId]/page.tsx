"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Loader2, ExternalLink } from "lucide-react"
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"
import { PTAFormContent } from "@/components/team/specialized-task-modals"
import type { PTAExp, PTAFormState } from "@/components/team/specialized-task-modals"

// Helper to extract URL from Airtable attachment field
function getAttachmentUrl(field: unknown): string {
  if (!field) return ""
  if (typeof field === "string") return field
  if (Array.isArray(field) && field.length > 0) {
    const first = field[0] as Record<string, unknown>
    return (first.url as string) ?? ""
  }
  return ""
}

function initForm(exp: PTAExp) {
  return {
    imageType: exp.imageType,
    controlImageUrl: exp.controlImageUrl,
    variantImageUrl: exp.variantImageUrl,
    ptaResultImageUrl: exp.ptaResultImageUrl,
    figmaUrl: exp.figmaUrl,
    resultsVideoUrl: exp.ptaLoomUrl,
    goalMetric1: exp.goalMetric1,
    metric1Increase: exp.metric1Increase != null ? String(exp.metric1Increase) : "",
    goalMetric2: exp.goalMetric2,
    metric2Increase: exp.metric2Increase != null ? String(exp.metric2Increase) : "",
    revenueAdded: exp.revenueAdded != null ? String(exp.revenueAdded) : "",
    confidenceLevel: exp.confidenceLevel != null ? String(exp.confidenceLevel) : "",
    finalStatus: exp.testStatus,
    segmentDeploy: exp.segmentDeploy,
    description: exp.description,
    nextSteps: exp.nextSteps,
    deployed: exp.deployed,
    saving: false,
    saved: false,
  } satisfies PTAFormState
}

export default function PTAPage() {
  const params = useParams()
  const expId = params.expId as string
  const { user } = useUser()

  const authHeaders: Record<string, string> = user
    ? {
        "Content-Type": "application/json",
        "x-user-role": user.role,
        "x-user-id": user.id,
        "x-user-name": user.name,
        ...(user.clientId ? { "x-client-id": user.clientId } : {}),
      }
    : { "Content-Type": "application/json" }

  // Fetch the single experiment by ID
  const { data: rawExp, isLoading } = useAirtable<Record<string, unknown>>("experiments", {
    fields: [
      "Test Description", "Placement", "Placement URL", "Convert Experiment ID", "FIGMA Url",
      "Image Type", "Control Image", "Variant Image", "PTA Result Image",
      "Post-Test Analysis (Loom)", "Goal Metric 1", "Metric #1 Increase",
      "Goal Metric 2", "Metric #2 Increase", "Revenue Added (MRR) (Regular Format)",
      "Confidence Level", "Test Status", "Segment Deploy Applied to",
      "Describe what happened & what we learned", "Next Steps (Action)", "Deployed",
    ],
    filterExtra: `RECORD_ID() = "${expId}"`,
    maxRecords: 1,
    enabled: !!expId,
  })

  const exp = useMemo<PTAExp | null>(() => {
    if (!rawExp || rawExp.length === 0) return null
    const r = rawExp[0]
    const f = r.fields as Record<string, unknown>
    const segRaw = f["Segment Deploy Applied to"]
    return {
      id: r.id,
      testDescription: (f["Test Description"] as string) ?? "",
      placement: (f["Placement"] as string) ?? "",
      placementUrl: (f["Placement URL"] as string) ?? "",
      convertId: (f["Convert Experiment ID"] as string) ?? "",
      figmaUrl: (f["FIGMA Url"] as string) ?? "",
      imageType: ((f["Image Type"] as string) ?? "") as "Mobile" | "Desktop" | "",
      controlImageUrl: getAttachmentUrl(f["Control Image"]),
      variantImageUrl: getAttachmentUrl(f["Variant Image"]),
      ptaResultImageUrl: getAttachmentUrl(f["PTA Result Image"]),
      ptaLoomUrl: (f["Post-Test Analysis (Loom)"] as string) ?? "",
      goalMetric1: (f["Goal Metric 1"] as string) ?? "",
      metric1Increase: typeof f["Metric #1 Increase"] === "number" ? (f["Metric #1 Increase"] as number) : null,
      goalMetric2: (f["Goal Metric 2"] as string) ?? "",
      metric2Increase: typeof f["Metric #2 Increase"] === "number" ? (f["Metric #2 Increase"] as number) : null,
      revenueAdded: typeof f["Revenue Added (MRR) (Regular Format)"] === "number" ? (f["Revenue Added (MRR) (Regular Format)"] as number) : null,
      confidenceLevel: typeof f["Confidence Level"] === "number" ? (f["Confidence Level"] as number) : null,
      testStatus: (f["Test Status"] as string) ?? "",
      segmentDeploy: Array.isArray(segRaw) ? (segRaw as string[]) : segRaw ? [segRaw as string] : [],
      description: (f["Describe what happened & what we learned"] as string) ?? "",
      nextSteps: (f["Next Steps (Action)"] as string) ?? "",
      deployed: !!f["Deployed"],
    }
  }, [rawExp])

  const [form, setForm] = useState<PTAFormState | null>(null)

  // Init form once exp loads
  const activeForm = form ?? (exp ? initForm(exp) : null)

  async function handleSave() {
    if (!exp || !activeForm) return
    setForm(prev => ({ ...(prev ?? initForm(exp)), saving: true, saved: false }))
    try {
      const f = activeForm
      const fields: Record<string, unknown> = {
        "Image Type": f.imageType || null,
        "FIGMA Url": f.figmaUrl || null,
        "Post-Test Analysis (Loom)": f.resultsVideoUrl || null,
        "Goal Metric 1": f.goalMetric1 || null,
        "Metric #1 Increase": f.metric1Increase ? parseFloat(f.metric1Increase) : null,
        "Goal Metric 2": f.goalMetric2 || null,
        "Metric #2 Increase": f.metric2Increase ? parseFloat(f.metric2Increase) : null,
        "Revenue Added (MRR) (Regular Format)": f.revenueAdded ? parseFloat(f.revenueAdded) : null,
        "Confidence Level": f.confidenceLevel ? parseFloat(f.confidenceLevel) : null,
        "Test Status": f.finalStatus || null,
        "Segment Deploy Applied to": f.segmentDeploy,
        "Describe what happened & what we learned": f.description || null,
        "Next Steps (Action)": f.nextSteps || null,
        "Deployed": f.deployed,
      }
      // Images are uploaded directly via /api/upload-experiment-image — not re-saved here
      await fetch(`/api/airtable/experiments/${exp.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      })
      setForm(prev => ({ ...(prev ?? initForm(exp)), saving: false, saved: true }))
    } catch {
      setForm(prev => ({ ...(prev ?? initForm(exp)), saving: false }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading experiment…
      </div>
    )
  }

  if (!exp || !activeForm) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-muted-foreground">
        Experiment not found (ID: {expId})
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Page header */}
      <div className="mb-8">
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold mb-2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          Strategy · Post-Test Analysis
        </span>
        <h1 className="text-xl font-bold text-foreground">{exp.testDescription || "Untitled Experiment"}</h1>
        {exp.convertId && (
          <p className="text-[12px] font-mono text-muted-foreground mt-1">{exp.convertId}</p>
        )}
        {exp.placement && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[13px] text-muted-foreground">{exp.placement}</span>
            {exp.placementUrl && (
              <a href={exp.placementUrl} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-600">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      <PTAFormContent
        exp={exp}
        form={activeForm}
        onChange={updates => setForm(prev => ({ ...(prev ?? initForm(exp)), ...updates }))}
        onSave={handleSave}
        authHeaders={authHeaders}
      />
    </div>
  )
}
