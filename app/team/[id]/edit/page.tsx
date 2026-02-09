"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTeam } from "@/hooks/v2/use-airtable"
import { AppShell } from "@/components/v2/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EditForm, FormField } from "@/components/v2/edit-form"
import { AvatarUpload } from "@/components/v2/avatar-upload"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TeamEditPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const { team } = useTeam()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const member = useMemo(() => team.find((t) => t.id === memberId), [team, memberId])

  const [formData, setFormData] = useState({
    "Full Name": member?.fields["Full Name"] || "",
    Email: member?.fields.Email || "",
    Department: member?.fields.Department || "",
    Status: member?.fields.Status || "Active",
    "Slack ID": member?.fields["Slack ID"] || "",
  })

  if (!member) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true)
    try {
      const updateData: any = {
        "Full Name": data["Full Name"],
        Email: data.Email,
        Department: data.Department,
        Status: data.Status,
        "Slack ID": data["Slack ID"],
      }

      // Handle avatar upload if file selected
      if (avatarFile) {
        const formDataMultipart = new FormData()
        formDataMultipart.append("file", avatarFile)
        formDataMultipart.append("recordId", memberId)
        formDataMultipart.append("table", "Team")
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formDataMultipart })
        const uploadData = await uploadRes.json()
        if (uploadData.url) {
          updateData["Profile Photo"] = [{ url: uploadData.url }]
        }
      }

      const response = await fetch("/api/airtable/team/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId, fields: updateData }),
      })

      if (!response.ok) throw new Error("Failed to update team member")

      router.push(`/team/${memberId}`)
    } catch (error) {
      console.error("Error updating team member:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Team Member</h1>
            <p className="text-muted-foreground">{member.fields["Full Name"]}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Member Information</CardTitle>
            <CardDescription>Update team member details and contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <EditForm
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              isLoading={isSubmitting}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Profile Photo</h3>
                  <AvatarUpload
                    currentUrl={member.fields["Profile Photo"]?.[0]?.url}
                    onUpload={setAvatarFile}
                    isLoading={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Full Name"
                    name="Full Name"
                    value={formData["Full Name"]}
                    onChange={(value) =>
                      setFormData({ ...formData, "Full Name": value })
                    }
                  />
                  <FormField
                    label="Email"
                    name="Email"
                    value={formData.Email}
                    onChange={(value) => setFormData({ ...formData, Email: value })}
                    type="email"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Department</label>
                    <Select value={formData.Department} onValueChange={(value) => setFormData({ ...formData, Department: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Strategy">Strategy</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Development">Development</SelectItem>
                        <SelectItem value="QA">QA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={formData.Status} onValueChange={(value) => setFormData({ ...formData, Status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <FormField
                  label="Slack ID"
                  name="Slack ID"
                  value={formData["Slack ID"]}
                  onChange={(value) =>
                    setFormData({ ...formData, "Slack ID": value })
                  }
                  placeholder="U01234ABCD"
                />
              </div>
            </EditForm>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
