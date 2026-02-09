"use client"

import React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Plus } from "lucide-react"
import type { AirtableRecord, ClientFields } from "@/lib/v2/types"

interface CreateTestIdeaModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  clients: AirtableRecord<ClientFields>[]
  isClient?: boolean
  userClientId?: string
  onSuccess?: () => void
}

export function CreateTestIdeaModal({
  isOpen,
  onOpenChange,
  clients,
  isClient,
  userClientId,
  onSuccess,
}: CreateTestIdeaModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    "Test Description": "",
    Client: isClient ? userClientId || "" : "",
    Hypothesis: "",
    Rationale: "",
    "Walkthrough Video URL": "",
    Placement: "",
    "Placement URL": "",
    "Variants Weight": "",
    "Primary Goals": "",
    "Design Brief": "",
    "Development Brief": "",
    "Media/Links": "",
    GEOs: "",
    Devices: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData["Test Description"] || !formData.Client) {
      alert("Please fill in Test Description and Client")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/airtable/experiment-ideas/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            ...formData,
            Client: [formData.Client],
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to create idea")

      setFormData({
        "Test Description": "",
        Client: isClient ? userClientId || "" : "",
        Hypothesis: "",
        Rationale: "",
        "Walkthrough Video URL": "",
        Placement: "",
        "Placement URL": "",
        "Variants Weight": "",
        "Primary Goals": "",
        "Design Brief": "",
        "Development Brief": "",
        "Media/Links": "",
        GEOs: "",
        Devices: "",
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error creating idea:", error)
      alert("Failed to create test idea")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Test Idea</DialogTitle>
          <DialogDescription>
            Add a new experiment idea {isClient && "for your client"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection - Only for non-clients */}
          {!isClient && (
            <div>
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.Client}
                onValueChange={(value) =>
                  setFormData({ ...formData, Client: value })
                }
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fields["Brand Name"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Test Description */}
          <div>
            <Label htmlFor="description">Test Description *</Label>
            <Textarea
              id="description"
              value={formData["Test Description"]}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  "Test Description": e.target.value,
                })
              }
              placeholder="Describe your test idea..."
              className="h-24"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hypothesis">Hypothesis</Label>
              <Textarea
                id="hypothesis"
                value={formData.Hypothesis}
                onChange={(e) =>
                  setFormData({ ...formData, Hypothesis: e.target.value })
                }
                placeholder="What do you expect to happen?"
                className="h-20"
              />
            </div>
            <div>
              <Label htmlFor="rationale">Rationale</Label>
              <Textarea
                id="rationale"
                value={formData.Rationale}
                onChange={(e) =>
                  setFormData({ ...formData, Rationale: e.target.value })
                }
                placeholder="Why are you testing this?"
                className="h-20"
              />
            </div>
          </div>

          {/* Placement Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="placement">Placement</Label>
              <Input
                id="placement"
                value={formData.Placement}
                onChange={(e) =>
                  setFormData({ ...formData, Placement: e.target.value })
                }
                placeholder="e.g., Homepage banner"
              />
            </div>
            <div>
              <Label htmlFor="placementUrl">Placement URL</Label>
              <Input
                id="placementUrl"
                value={formData["Placement URL"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    "Placement URL": e.target.value,
                  })
                }
                type="url"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Video and Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="video">Walkthrough Video URL</Label>
              <Input
                id="video"
                value={formData["Walkthrough Video URL"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    "Walkthrough Video URL": e.target.value,
                  })
                }
                type="url"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="weight">Variants Weight</Label>
              <Input
                id="weight"
                value={formData["Variants Weight"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    "Variants Weight": e.target.value,
                  })
                }
                placeholder="e.g., 50/50"
              />
            </div>
          </div>

          {/* Goals */}
          <div>
            <Label htmlFor="goals">Primary Goals</Label>
            <Textarea
              id="goals"
              value={formData["Primary Goals"]}
              onChange={(e) =>
                setFormData({ ...formData, "Primary Goals": e.target.value })
              }
              placeholder="What are the primary goals?"
              className="h-20"
            />
          </div>

          {/* Design and Development Briefs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="designBrief">Design Brief</Label>
              <Textarea
                id="designBrief"
                value={formData["Design Brief"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    "Design Brief": e.target.value,
                  })
                }
                placeholder="Design requirements..."
                className="h-20"
              />
            </div>
            <div>
              <Label htmlFor="devBrief">Development Brief</Label>
              <Textarea
                id="devBrief"
                value={formData["Development Brief"]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    "Development Brief": e.target.value,
                  })
                }
                placeholder="Development requirements..."
                className="h-20"
              />
            </div>
          </div>

          {/* Media and Geo/Devices */}
          <div>
            <Label htmlFor="media">Media/Links</Label>
            <Textarea
              id="media"
              value={formData["Media/Links"]}
              onChange={(e) =>
                setFormData({ ...formData, "Media/Links": e.target.value })
              }
              placeholder="Links to assets, mockups, etc."
              className="h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="geos">GEOs</Label>
              <Input
                id="geos"
                value={formData.GEOs}
                onChange={(e) =>
                  setFormData({ ...formData, GEOs: e.target.value })
                }
                placeholder="e.g., US, CA, UK"
              />
            </div>
            <div>
              <Label htmlFor="devices">Devices</Label>
              <Input
                id="devices"
                value={formData.Devices}
                onChange={(e) =>
                  setFormData({ ...formData, Devices: e.target.value })
                }
                placeholder="e.g., Desktop, Mobile, Tablet"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Idea
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
