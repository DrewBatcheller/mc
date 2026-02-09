import { NextResponse } from "next/server"
import { updateRecord, TABLES } from "@/lib/v2/airtable"
import { getServerSession } from "next-auth/next"
import type { ExperimentIdeaFields } from "@/lib/v2/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fields } = body

    // Security: Verify the client has permission to create an idea for this client
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // If client user, verify they can only create for themselves
    if (session.user.role === "client" && fields.Client?.[0]) {
      if (fields.Client[0] !== session.user.clientRecordId) {
        return NextResponse.json(
          { error: "Unauthorized: Cannot create ideas for other clients" },
          { status: 403 }
        )
      }
    }

    // Ensure Client field is always an array with one ID
    if (!Array.isArray(fields.Client)) {
      fields.Client = fields.Client ? [fields.Client] : []
    }

    const newIdea = await updateRecord<ExperimentIdeaFields>(TABLES.EXPERIMENT_IDEAS, "", {
      fields: {
        "Test Description": fields["Test Description"],
        Client: fields.Client,
        Hypothesis: fields.Hypothesis,
        Rationale: fields.Rationale,
        "Walkthrough Video URL": fields["Walkthrough Video URL"],
        Placement: fields.Placement,
        "Placement URL": fields["Placement URL"],
        "Variants Weight": fields["Variants Weight"],
        "Primary Goals": fields["Primary Goals"],
        "Design Brief": fields["Design Brief"],
        "Development Brief": fields["Development Brief"],
        "Media/Links": fields["Media/Links"],
        GEOs: fields.GEOs,
        Devices: fields.Devices,
      },
    })

    return NextResponse.json(newIdea)
  } catch (error) {
    console.error("[API] Error creating experiment idea:", error)
    return NextResponse.json(
      { error: "Failed to create experiment idea" },
      { status: 500 }
    )
  }
}
