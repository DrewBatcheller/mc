import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fieldName = formData.get("fieldName") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Generate a unique filename to avoid collisions
    const ext = file.name.split(".").pop() || "bin"
    const filename = `experiment-${fieldName}-${uuidv4()}.${ext}`

    // Upload to Vercel Blob
    const bytes = await file.arrayBuffer()
    const blob = await put(filename, bytes, {
      access: "public",
      contentType: file.type,
    })

    console.log("[v0] File uploaded to Blob:", blob.url)

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
    })
  } catch (error) {
    console.error("[API] Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
