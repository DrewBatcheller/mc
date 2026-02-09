import { NextResponse } from "next/server"
import { fetchTable, updateRecord, TABLES } from "@/lib/v2/airtable"
import type { ExperimentFields, ExperimentIdeaFields, BatchFields } from "@/lib/v2/types"

export async function POST(request: Request) {
  try {
    const { ideaId, clientId, batchId, newBatchLaunchDate, strategistId, designerId, developerId, qaId } = await request.json()

    if (!ideaId || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields: ideaId, clientId" },
        { status: 400 }
      )
    }

    // Fetch the idea directly from Airtable
    const ideas = await fetchTable<ExperimentIdeaFields>(TABLES.EXPERIMENT_IDEAS)
    const idea = ideas.find((i) => i.id === ideaId)

    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 })
    }

    let finalBatchId = batchId

    // If creating new batch, create it first
    if (!batchId && newBatchLaunchDate) {
      const newBatch: Partial<BatchFields> = {
        "Launch Date": newBatchLaunchDate,
        Client: [clientId],
      }

      const batchRes = await fetch("https://api.airtable.com/v0/meta/bases/" + process.env.AIRTABLE_BASE_ID + "/tables/" + TABLES.BATCHES + "/records", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [{ fields: newBatch }],
        }),
      })

      if (!batchRes.ok) {
        const errorData = await batchRes.json()
        console.error("Batch creation error:", errorData)
        return NextResponse.json({ error: "Failed to create batch" }, { status: 500 })
      }

      const batchData = await batchRes.json()
      finalBatchId = batchData.records[0]?.id
    }

    if (!finalBatchId) {
      return NextResponse.json({ error: "No batch selected or created" }, { status: 400 })
    }

    // Create experiment from idea
    const experimentFields: Partial<ExperimentFields> = {
      "Experiment Name": idea.fields["Test Description"] || "New Experiment",
      Client: [clientId],
      Batch: [finalBatchId],
      Hypothesis: idea.fields.Hypothesis,
      Rationale: idea.fields.Rationale,
      Placement: idea.fields.Placement,
      "Placement URL": idea.fields["Placement URL"],
      "Walkthrough Video URL": idea.fields["Walkthrough Video URL"],
      Variants: idea.fields.Variants,
      "Variants Weight": idea.fields["Variants Weight"],
      "Primary Goals": idea.fields["Primary Goals"],
      "Design Brief": idea.fields["Design Brief"],
      "Development Brief": idea.fields["Development Brief"],
      "Media/Links": idea.fields["Media/Links"],
      GEOs: idea.fields.GEOs,
      Devices: idea.fields.Devices,
      Strategist: strategistId ? [strategistId] : undefined,
      Designer: designerId ? [designerId] : undefined,
      Developer: developerId ? [developerId] : undefined,
      QA: qaId ? [qaId] : undefined,
    }

    const createRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLES.EXPERIMENTS}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [{ fields: experimentFields }],
        }),
      }
    )

    if (!createRes.ok) {
      const errorData = await createRes.json()
      console.error("Airtable error:", errorData)
      return NextResponse.json({ error: "Failed to create experiment" }, { status: 500 })
    }

    const result = await createRes.json()
    const newExperimentId = result.records[0]?.id

    return NextResponse.json({
      id: newExperimentId,
      batchId: finalBatchId,
      success: true,
    })
  } catch (error) {
    console.error("[API] Error creating experiment:", error)
    return NextResponse.json({ error: "Failed to create experiment" }, { status: 500 })
  }
}
