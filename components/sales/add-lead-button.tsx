"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useSWRConfig } from "swr"
import { CreateLeadModal } from "./create-lead-modal"

/**
 * Page-level "Add Lead" button + modal.
 * Lives in the page header so it's clear it's a pipeline-level action.
 * On success, globally revalidates all SWR keys for the leads resource
 * so LeadsTable (and any other consumer) refreshes automatically.
 */
export function AddLeadButton() {
  const [open, setOpen] = useState(false)
  const { mutate }      = useSWRConfig()

  const handleLeadCreated = () => {
    // Revalidate every SWR key whose URL contains the leads endpoint
    mutate(
      (key: unknown) =>
        Array.isArray(key) &&
        typeof key[0] === "string" &&
        key[0].includes("/api/airtable/leads"),
      undefined,
      { revalidate: true }
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-background bg-foreground rounded-lg hover:opacity-90 transition-opacity shrink-0"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Lead
      </button>

      <CreateLeadModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onLeadCreated={handleLeadCreated}
      />
    </>
  )
}
