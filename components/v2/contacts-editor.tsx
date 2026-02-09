"use client"

import React, { useState } from "react"
import { AirtableRecord, ContactFields } from "@/lib/v2/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, Edit2, Check, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface EditableContact extends Partial<ContactFields> {
  id?: string
  isNew?: boolean
  isEditing?: boolean
}

interface ContactsEditorProps {
  contacts: AirtableRecord<ContactFields>[]
  clientId?: string
  onAdd?: (contact: Omit<EditableContact, "id" | "isNew" | "isEditing">) => Promise<void>
  onUpdate?: (id: string, contact: Partial<ContactFields>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  isLoading?: boolean
}

export function ContactsEditor({
  contacts,
  clientId,
  onAdd,
  onUpdate,
  onDelete,
  isLoading,
}: ContactsEditorProps) {
  const [editingContacts, setEditingContacts] = useState<Record<string, EditableContact>>({})
  const [newContact, setNewContact] = useState<EditableContact>({ isNew: true })
  const [showNewForm, setShowNewForm] = useState(false)

  const startEditing = (contact: AirtableRecord<ContactFields>) => {
    setEditingContacts({
      ...editingContacts,
      [contact.id]: { ...contact.fields, id: contact.id, isEditing: true },
    })
  }

  const cancelEditing = (id: string) => {
    const updated = { ...editingContacts }
    delete updated[id]
    setEditingContacts(updated)
  }

  const saveEdit = async (id: string) => {
    const edited = editingContacts[id]
    if (onUpdate && edited) {
      await onUpdate(id, edited)
      cancelEditing(id)
    }
  }

  const saveNew = async () => {
    if (!newContact["Full Name"]) return
    
    if (onAdd) {
      try {
        const isFirstContact = contacts.length === 0
        const contactData = {
          "Full Name": newContact["Full Name"],
          "User Type": isFirstContact ? "Main Point of Contact" : (newContact["User Type"] || ""),
          "User Email": newContact["User Email"] || "",
          "User Slack Member ID": newContact["User Slack Member ID"] || "",
          "Receive Notifications": newContact["Receive Notifications"] || false,
          ...(clientId && { "Brand Name": [clientId] }),
        }
        await onAdd(contactData)
        setNewContact({ isNew: true })
        setShowNewForm(false)
      } catch (error) {
        console.error("Error saving new contact:", error)
      }
    }
  }

  const updateEditingField = (id: string, field: string, value: any) => {
    setEditingContacts({
      ...editingContacts,
      [id]: { ...editingContacts[id], [field]: value },
    })
  }

  const updateNewField = (field: string, value: any) => {
    setNewContact({
      ...newContact,
      [field]: value,
    })
  }

  const canDeleteContact = (contact: AirtableRecord<ContactFields>) => {
    const isMainPOC = contact.fields["User Type"] === "Main Point of Contact"
    const mainPOCCount = contacts.filter(
      (c) => c.fields["User Type"] === "Main Point of Contact"
    ).length
    
    // Can't delete if this is the only Main Point of Contact
    if (isMainPOC && mainPOCCount === 1) {
      return false
    }
    return true
  }

  const handleDelete = (contact: AirtableRecord<ContactFields>) => {
    if (!canDeleteContact(contact)) {
      alert("Cannot delete this contact. A client must always have at least one Main Point of Contact. Please assign another contact as Main Point of Contact first.")
      return
    }
    onDelete?.(contact.id)
  }

  const Contact = ({ contact }: { contact: AirtableRecord<ContactFields> }) => {
    const edited = editingContacts[contact.id]
    const isEditing = edited?.isEditing

    if (!isEditing) {
      return (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium">
                    {contact.fields["Full Name"]}
                  </p>
                  {contact.fields["Receive Notifications"] && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">
                      Notifications
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Type: {contact.fields["User Type"] || "-"}</p>
                  <p>Email: {contact.fields["User Email"] || "-"}</p>
                  {contact.fields["User Slack Member ID"] && (
                    <p>Slack: {contact.fields["User Slack Member ID"]}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditing(contact)}
                  disabled={isLoading}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(contact)}
                  disabled={isLoading || !canDeleteContact(contact)}
                  title={
                    !canDeleteContact(contact)
                      ? "Cannot delete - must have at least one Main Point of Contact"
                      : undefined
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input
                value={edited["Full Name"] || ""}
                onChange={(e) => updateEditingField(contact.id, "Full Name", e.target.value)}
                placeholder="Full name"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label className="text-xs">User Type</Label>
              <Select
                value={edited["User Type"] || ""}
                onValueChange={(value) => updateEditingField(contact.id, "User Type", value)}
              >
                <SelectTrigger disabled={isLoading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Point of Contact">Main Point of Contact</SelectItem>
                  <SelectItem value="C-Suite">C-Suite</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="Contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Email</Label>
              <Input
                value={edited["User Email"] || ""}
                onChange={(e) => updateEditingField(contact.id, "User Email", e.target.value)}
                type="email"
                placeholder="user@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label className="text-xs">Slack Member ID</Label>
              <Input
                value={edited["User Slack Member ID"] || ""}
                onChange={(e) => updateEditingField(contact.id, "User Slack Member ID", e.target.value)}
                placeholder="U123456789"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={edited["Receive Notifications"] || false}
                onCheckedChange={(value) =>
                  updateEditingField(contact.id, "Receive Notifications", value)
                }
                disabled={isLoading}
              />
              <Label className="text-xs">Receive Notifications</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelEditing(contact.id)}
                disabled={isLoading}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => saveEdit(contact.id)}
                disabled={isLoading}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {contacts.map((contact) => (
        <Contact key={contact.id} contact={contact} />
      ))}

      {showNewForm && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={newContact["Full Name"] || ""}
                  onChange={(e) => updateNewField("Full Name", e.target.value)}
                  placeholder="Full name"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label className="text-xs">User Type</Label>
                <Select
                  value={newContact["User Type"] || ""}
                  onValueChange={(value) => updateNewField("User Type", value)}
                >
                  <SelectTrigger disabled={isLoading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main Point of Contact">Main Point of Contact</SelectItem>
                    <SelectItem value="C-Suite">C-Suite</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={newContact["User Email"] || ""}
                  onChange={(e) => updateNewField("User Email", e.target.value)}
                  type="email"
                  placeholder="user@example.com"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label className="text-xs">Slack Member ID</Label>
                <Input
                  value={newContact["User Slack Member ID"] || ""}
                  onChange={(e) => updateNewField("User Slack Member ID", e.target.value)}
                  placeholder="U123456789"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={newContact["Receive Notifications"] || false}
                  onCheckedChange={(value) =>
                    updateNewField("Receive Notifications", value)
                  }
                  disabled={isLoading}
                />
                <Label className="text-xs">Receive Notifications</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewForm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveNew}
                  disabled={isLoading || !newContact["Full Name"]}
                >
                  Save Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showNewForm && (
        <Button
          variant="outline"
          className="w-full bg-transparent"
          onClick={() => setShowNewForm(true)}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      )}
    </div>
  )
}
