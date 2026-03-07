"use client"

/**
 * Shared form field components for task creation / editing modals.
 * These are pure presentational components — no data fetching.
 * Parent modals fetch data via useAirtable and pass it as props.
 */

import { useState } from "react"
import { X, User } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  name: string
}

export interface LinkedRecord {
  id: string
  name: string
}

// ─── TeamMemberPicker ─────────────────────────────────────────────────────────

interface TeamMemberPickerProps {
  /** Full list fetched from the parent's useAirtable("team") call */
  options: TeamMember[]
  selected: TeamMember[]
  onChange: (members: TeamMember[]) => void
}

export function TeamMemberPicker({ options, selected, onChange }: TeamMemberPickerProps) {
  const [search, setSearch] = useState("")
  const [open,   setOpen]   = useState(false)

  const filtered = options.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) &&
    !selected.some(s => s.id === m.id)
  )

  const remove = (member: TeamMember) =>
    onChange(selected.filter(s => s.id !== member.id))

  const add = (member: TeamMember) => {
    onChange([...selected, member])
    setSearch("")
    setOpen(false)
  }

  return (
    <div>
      {/* Selected member chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(m => (
            <span
              key={m.id || m.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border text-[12px] text-foreground"
            >
              {m.name}
              <button
                type="button"
                onClick={() => remove(m)}
                className="ml-0.5 hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div className="relative">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length ? "Add another…" : "Search team members…"}
          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {open && (filtered.length > 0 || (search && filtered.length === 0)) && (
          <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-muted-foreground italic">No members found</p>
            ) : (
              filtered.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={() => add(m)}
                  className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {m.name}
                </button>
              ))
            )}
          </div>
        )}

        {/* Show all when focused with empty search */}
        {open && !search && options.length > 0 && filtered.length > 0 && (
          <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onMouseDown={() => add(m)}
                className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors flex items-center gap-2"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LinkedRecordPicker ───────────────────────────────────────────────────────

interface LinkedRecordPickerProps {
  type: "lead" | "client"
  /** Full list fetched from the parent's useAirtable call */
  options: LinkedRecord[]
  value: LinkedRecord | null
  onChange: (record: LinkedRecord | null) => void
}

export function LinkedRecordPicker({ type, options, value, onChange }: LinkedRecordPickerProps) {
  const [search, setSearch] = useState("")
  const [open,   setOpen]   = useState(false)

  const label = type === "lead" ? "lead" : "client"

  const filtered = options.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  if (value) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-accent/40">
        <span className="flex-1 text-[13px] text-foreground font-medium">{value.name}</span>
        <button
          type="button"
          onClick={() => { onChange(null); setSearch("") }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Clear ${label}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Search ${label}s…`}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {open && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-muted-foreground italic">
              {search ? "No results" : `No ${label}s available`}
            </p>
          ) : (
            filtered.map(r => (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => { onChange(r); setSearch(""); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors"
              >
                {r.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
