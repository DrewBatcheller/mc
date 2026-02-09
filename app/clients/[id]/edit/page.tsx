"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useMemo, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useClients, useTeam, useContacts } from "@/hooks/v2/use-airtable"
import { AppShell } from "@/components/v2/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EditForm, FormField } from "@/components/v2/edit-form"
import { AvatarUpload } from "@/components/v2/avatar-upload"
import { ContactsEditor } from "@/components/v2/contacts-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ClientEditPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { clients } = useClients()
  const { team } = useTeam()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    "Brand Name": "",
    Website: "",
    Status: "Active",
    "Contact Name": "",
    "Contact Phone": "",
    "Contact Email": "",
    "Shopify Shop URL": "",
    Strategist: "",
    Designer: "",
    Developer: "",
    QA: "",
    "Development Hours Assigned": 0,
    "Dev Hours Logged": 0,
  })

  // Track formData changes
  useEffect(() => {
  }, [formData])

  const client = useMemo(() => {
    const found = clients.find((c) => c.id === clientId)
    return found
  }, [clientId])
  
  // Load contacts for this client
  const contactIds = client?.fields.Contacts || []
  const { contacts, isLoading: loadingContacts } = useContacts(contactIds.length > 0 ? contactIds : undefined)
  
  const activeTeamByDepartment = {
    strategist: team.filter(
      (t) => t.fields.Department === "Strategy" && t.fields["Employment Status"] === "Active"
    ),
    designer: team.filter((t) => t.fields.Department === "Design" && t.fields["Employment Status"] === "Active"),
    developer: team.filter(
      (t) => t.fields.Department === "Development" && t.fields["Employment Status"] === "Active"
    ),
    qa: team.filter((t) => t.fields.Department === "QA" && t.fields["Employment Status"] === "Active"),
  }

  useEffect(() => {
    if (client) {
      const strategist = Array.isArray(client.fields.Strategist)
        ? client.fields.Strategist[0] || ""
        : client.fields.Strategist || ""
      const designer = Array.isArray(client.fields.Designer)
        ? client.fields.Designer[0] || ""
        : client.fields.Designer || ""
      const developer = Array.isArray(client.fields.Developer)
        ? client.fields.Developer[0] || ""
        : client.fields.Developer || ""
      const qa = Array.isArray(client.fields.QA)
        ? client.fields.QA[0] || ""
        : client.fields.QA || ""
      
      setFormData({
        "Brand Name": client.fields["Brand Name"] || "",
        Website: client.fields.Website || "",
        Status: (client.fields as any)["Client Status"] || "Active",
        "Contact Name": client.fields["Contact Name"] || "",
        "Contact Phone": client.fields["Contact Phone"] || "",
        "Contact Email": client.fields["Contact Email"] || "",
        "Shopify Shop URL": client.fields["Shopify Shop URL"] || "",
        Strategist: strategist,
        Designer: designer,
        Developer: developer,
        QA: qa,
        "Development Hours Assigned": (client.fields as any)["Development Hours Assigned"] || 0,
        "Dev Hours Logged": (client.fields as any)["Dev Hours Logged"] || 0,
      })
    }
  }, [client])

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true)
    try {
      const updateData: any = {
        "Brand Name": data["Brand Name"],
        Website: data.Website,
        Status: data.Status,
        "Contact Name": data["Contact Name"],
        "Contact Phone": data["Contact Phone"],
        "Contact Email": data["Contact Email"],
        "Shopify Shop URL": data["Shopify Shop URL"],
        Strategist: data.Strategist ? [data.Strategist] : undefined,
        Designer: data.Designer ? [data.Designer] : undefined,
        Developer: data.Developer ? [data.Developer] : undefined,
        QA: data.QA ? [data.QA] : undefined,
        "Development Hours Assigned": data["Development Hours Assigned"],
        "Dev Hours Logged": data["Dev Hours Logged"],
      }

      if (avatarFile) {
        const formDataMultipart = new FormData()
        formDataMultipart.append("file", avatarFile)
        formDataMultipart.append("recordId", clientId)
        formDataMultipart.append("table", "Clients")
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formDataMultipart })
        const uploadData = await uploadRes.json()
        if (uploadData.url) {
          updateData.Avatar = [{ url: uploadData.url }]
        }
      }

      const response = await fetch("/api/airtable/clients/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId, fields: updateData }),
      })

      if (!response.ok) throw new Error("Failed to update client")

      router.push(`/clients/${clientId}`)
    } catch (error) {
      console.error("Error updating client:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (!client) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
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
            <h1 className="text-3xl font-bold">Edit Client</h1>
            <p className="text-muted-foreground">{client.fields["Brand Name"]}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update client details and contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <EditForm
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              isLoading={isSubmitting}
              showSubmitButton={true}
              formData={formData}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Avatar</h3>
                  <AvatarUpload
                    currentUrl={client.fields.Avatar?.[0]?.url}
                    onUpload={setAvatarFile}
                    isLoading={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Brand Name"
                  name="Brand Name"
                  value={formData["Brand Name"]}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, "Brand Name": value }))
                  }
                />
                  <FormField
                    label="Website"
                    name="Website"
                    value={formData.Website}
                    onChange={(value) =>
                    setFormData((prev) => ({ ...prev, Website: value }))
                  }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.Status} onValueChange={(value) => setFormData((prev) => ({ ...prev, Status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold">Contacts</h3>
                  <ContactsEditor
                    contacts={contacts}
                    clientId={clientId}
                    onAdd={async (contact) => {
                      const response = await fetch("/api/airtable/contacts/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fields: contact }),
                      })
                      if (!response.ok) throw new Error("Failed to create contact")
                    }}
                    onUpdate={async (id, contact) => {
                      const response = await fetch("/api/airtable/contacts/update", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id, fields: contact }),
                      })
                      if (!response.ok) throw new Error("Failed to update contact")
                    }}
                    onDelete={async (id) => {
                      const response = await fetch("/api/airtable/contacts/delete", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id }),
                      })
                      if (!response.ok) throw new Error("Failed to delete contact")
                    }}
                    isLoading={loadingContacts}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold">Links & Resources</h3>
                  <FormField
                    label="Shopify Shop URL"
                    name="Shopify Shop URL"
                    value={formData["Shopify Shop URL"]}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, "Shopify Shop URL": value }))
                  }
                    type="url"
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold">Assigned Team</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Strategist</label>
                      <Select value={formData.Strategist || ""} onValueChange={(value) => {
                        if (value) {
                          setFormData((prev) => ({ ...prev, Strategist: value }))
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTeamByDepartment.strategist.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fields["Full Name"]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Designer</label>
                      <Select value={formData.Designer || ""} onValueChange={(value) => {
                        if (value) {
                          setFormData((prev) => ({ ...prev, Designer: value }))
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTeamByDepartment.designer.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fields["Full Name"]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Developer</label>
                      <Select value={formData.Developer || ""} onValueChange={(value) => {
                        if (value) {
                          setFormData((prev) => ({ ...prev, Developer: value }))
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTeamByDepartment.developer.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fields["Full Name"]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">QA</label>
                      <Select value={formData.QA || ""} onValueChange={(value) => {
                        if (value) {
                          setFormData((prev) => ({ ...prev, QA: value }))
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTeamByDepartment.qa.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fields["Full Name"]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold">Hours Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="developmentHoursAssigned">Development Hours Assigned</Label>
                      <Input
                        id="developmentHoursAssigned"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData["Development Hours Assigned"]}
                        onChange={(e) =>
                          handleInputChange("Development Hours Assigned", Number.parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">Total hours purchased by the client</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="devHoursLogged">Dev Hours Logged</Label>
                      <Input
                        id="devHoursLogged"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData["Dev Hours Logged"]}
                        onChange={(e) =>
                          handleInputChange("Dev Hours Logged", Number.parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">Total hours logged/used so far</p>
                    </div>
                  </div>
                </div>
              </div>
            </EditForm>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
