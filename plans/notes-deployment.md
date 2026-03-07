# Notes Deployment Document

> Reference guide for implementing, fixing, and extending Notes across the system.
> Covers Airtable schema, API routes, CRUD permissions, visibility rules,
> the shared `NotesPanel` component, and per-context integration examples.

---

## Table of Contents

1. [Airtable Schema — Notes Table](#1-airtable-schema--notes-table)
2. [API Routes — CRUD Operations](#2-api-routes--crud-operations)
3. [Shared Component — NotesPanel](#3-shared-component--notespanel)
4. [Role-Based Access & Visibility](#4-role-based-access--visibility)
5. [Context 1 — Client Notes](#5-context-1--client-notes)
6. [Context 2 — Task Notes](#6-context-2--task-notes)
7. [Context 3 — Batch Notes](#7-context-3--batch-notes)
8. [Context 4 — Experiment Notes (General)](#8-context-4--experiment-notes-general)
9. [Context 5 — Experiment Notes (Feedback Types)](#9-context-5--experiment-notes-feedback-types)
10. [Session Note Tracking (Bug Fix Pattern)](#10-session-note-tracking-bug-fix-pattern)
11. [Delay Notes (Auto-Generated)](#11-delay-notes-auto-generated)
12. [Implementation Checklist — Adding Notes to a New Context](#12-implementation-checklist--adding-notes-to-a-new-context)
13. [Known Gotchas & Troubleshooting](#13-known-gotchas--troubleshooting)

---

## 1. Airtable Schema — Notes Table

**Table Name:** `Notes`
**Resource Slug:** `notes` (maps via `TABLE_NAMES` in `lib/types.ts`)

### Fields

| Field Name              | Type           | Description |
|-------------------------|----------------|-------------|
| `Note`                  | Long text      | The note content body |
| `Created Time`          | Date/time      | When the note was created |
| `Experiment Type`       | Single select  | Categorizes the note for filtering. Values: `Client Idea Feedback`, `Strategy Feedback`, `Client Design Feedback`, `QA Feedback` |
| `Created By (Team)`     | Link to Team   | The team member who created the note (linked record) |
| `Created By (Client)`   | Link to Client | The client user who created the note (linked record) |
| `Visibility`            | Single select  | `Team` (default) or `All` — controls whether clients can see the note |
| `Client`                | Link to Clients| Links note to a client record (for Client Notes) |
| `Experiments`           | Link to Experiments | Links note to one or more experiment records |
| `Batches`               | Link to Batches| Links note to a batch record |
| `Lead`                  | Link to Leads  | Links note to a lead record (for Task Notes) |

### Linked Record Field on Parent Tables

Parent tables (Experiments, Batches, Clients) have a `Notes` linked record field that returns an array of note record IDs: `["recXXX", "recYYY"]`. This is the canonical source for note counts and the `RECORD_ID()` filter pattern.

---

## 2. API Routes — CRUD Operations

All Notes CRUD goes through the unified Airtable API routes.

### 2.1 GET — List Notes

**Endpoint:** `GET /api/airtable/notes`

```
Query params:
  fields[]           — e.g. Note, Created Time, Experiment Type, ...
  filterExtra        — Airtable formula (usually RECORD_ID() pattern)
  sort[0][field]     — e.g. Created Time
  sort[0][direction] — desc
```

**Role filter** (from `lib/role-filter.ts`, case `'notes'`):
- `management`, `strategy`, `sales`, `team` → `""` (no filter, sees all notes)
- `client` → `FIND("{clientId}", {Record ID (from Client)}) > 0` (only notes linked to their client record)

**Used by:** `useAirtable("notes", { ... })` hook in NotesPanel and parent components.

### 2.2 POST — Create Note

**Endpoint:** `POST /api/airtable/notes`

```typescript
// Request body
{
  fields: {
    Note: "The note text",
    [linkedField]: [linkedRecordId],  // e.g. Experiments: ["recXXX"]
    Visibility: "Team" | "All",
    "Experiment Type": "Client Idea Feedback",  // optional, context-dependent
    "Created By (Team)": [userId],              // OR
    "Created By (Client)": [userId],
  }
}
```

**Permissions** (from `app/api/airtable/[resource]/route.ts`):
- `management`, `strategy`, `sales`, `team`, `client` → **allowed**
- All other roles → forbidden

**Cache invalidation:** `notes:*` pattern is invalidated after creation.

**Important:** Creating a note does NOT invalidate the parent resource cache (e.g., `experiments:*`). This means the parent's `Notes` linked field will be stale until SWR refetches. See [Section 10](#10-session-note-tracking-bug-fix-pattern) for the session tracking fix.

### 2.3 PATCH — Update Note

**Endpoint:** `PATCH /api/airtable/notes/{noteId}`

```typescript
{
  fields: { Note: "Updated text" }
}
```

**Permissions** (from `app/api/airtable/[resource]/[id]/route.ts`):
- All roles can PATCH notes (the route allows `notifications` and `notes` for all roles)

**Cache invalidation:** `notes:*` pattern is invalidated.

### 2.4 DELETE — Delete Note

**Endpoint:** `DELETE /api/airtable/notes/{noteId}`

**Permissions:**
- `client` → **forbidden** (clients can never delete notes)
- `team` → **allowed** (team can only delete notes, not other resources)
- `management`, `strategy`, `sales` → **allowed**

**Cache invalidation:** `notes:*` pattern is invalidated.

---

## 3. Shared Component — NotesPanel

**File:** `components/shared/notes-panel.tsx`

The `NotesPanel` is the reusable component for all Notes UI. It handles fetching, creating, editing, deleting, and displaying notes.

### Props Interface

```typescript
interface NotesPanelProps {
  linkedField: string           // 'Client' | 'Experiments' | 'Batches'
  linkedRecordId: string        // Airtable record ID to link notes to
  authHeaders: HeadersInit      // Auth headers with x-user-role, x-user-id, etc.
  experimentType?: string       // Auto-set on created notes (e.g. 'QA Feedback')
  placeholder?: string          // Textarea placeholder text
  filterByType?: string         // Only show notes matching this Experiment Type
  noteIds?: string[]            // Pre-known note IDs from parent (enables RECORD_ID() filter)
  mode?: 'full' | 'add-only' | 'read-only'  // CRUD permission mode
  showVisibilityToggle?: boolean // Show "Visible to client" checkbox (team only)
  onNoteCreated?: (noteId?: string) => void  // Callback after note creation
}
```

### Key Props Explained

#### `linkedField` + `linkedRecordId`
When creating a note, the component sets `fields[linkedField] = [linkedRecordId]`. This links the note back to the parent record in Airtable.

#### `noteIds` (Preferred Fetching Pattern)
When provided, the component uses `RECORD_ID()` filters for reliable fetching:
```
OR(RECORD_ID() = "rec1", RECORD_ID() = "rec2", ...)
```
When `noteIds` is `undefined`, it falls back to the legacy `CONCATENATE` pattern which is unreliable with linked records (see Gotchas).

#### `experimentType`
If set, new notes are created with `Experiment Type` = this value. Used for feedback notes.

#### `filterByType`
If set, only notes matching `{Experiment Type} = "value"` are displayed. Used in forms to show only specific feedback types.

#### `mode`
- `full` — Create, edit, delete (default for team)
- `add-only` — Create only, no edit/delete (used in client-ideas-table)
- `read-only` — View only, no mutations (used for client role)

#### `showVisibilityToggle`
When `true` and user is not a client, shows a "Visible to client" checkbox on the note creation form. Defaults to `false`.

#### `onNoteCreated`
Called after a note is successfully created. Passes the new record ID so the parent can:
1. Track it in session state (for optimistic count updates)
2. Re-fetch parent data via `mutate()`

### Internal Fetching

The component fetches notes via `useAirtable("notes", { ... })` with:
- Fields: `Note`, `Created Time`, `Experiment Type`, `Created By (Team)`, `Created By (Client)`, `Visibility`
- Filter: `RECORD_ID()` pattern (preferred) or `CONCATENATE` fallback
- Sort: `Created Time` descending
- Enabled: only when filter formula is defined

### Visibility Filtering (Client Side)

After fetching, the component applies client-side visibility filtering:

```typescript
// Team sees everything
if (!isClient) return notes

// Client sees:
// 1. Notes they created (matching user.id or user.clientId)
// 2. Notes with Visibility = "All"
// 3. Optimistic notes (temp_* IDs, just created by this user)
```

### Optimistic Updates

The component maintains `optimisticNotes` state for immediately displaying new notes before the API responds. Optimistic notes have `id = "temp_${Date.now()}"` and are removed once the real response arrives.

---

## 4. Role-Based Access & Visibility

### CRUD Permissions by Role

| Operation | Management | Strategy | Sales | Team | Client |
|-----------|-----------|----------|-------|------|--------|
| **Read** (GET) | All notes | All notes | All notes | All notes | Only notes linked to their client |
| **Create** (POST) | Yes | Yes | Yes | Yes | Yes |
| **Update** (PATCH) | Yes | Yes | Yes | Yes | Yes |
| **Delete** | Yes | Yes | Yes | Only notes | No |

### Visibility Field Behavior

The `Visibility` field controls whether a note is visible to clients:

| Visibility Value | Team Sees | Client Sees |
|-----------------|-----------|-------------|
| `Team` (default) | Yes | No |
| `All` | Yes | Yes |

**How it's set on creation:**
- If the creator is a **client** → Visibility is always `"All"` (their notes are always visible to team)
- If the creator is a **team member** and `showVisibilityToggle` is on:
  - Checkbox checked → `"All"` (visible to client)
  - Checkbox unchecked → `"Team"` (team only, default)
- If `showVisibilityToggle` is off → `"Team"` (team only)

**Where Visibility applies:**
- Batch Notes (client-tracker) — `showVisibilityToggle={user?.role !== 'client'}`
- Experiment Notes (experiment-details-modal) — `showVisibilityToggle={user?.role !== 'client'}`
- Experiment Idea Notes (ideas-table) — `showVisibilityToggle` (always on)
- Client Notes — No visibility toggle (never visible to client)
- Task Notes — No visibility toggle (never visible to client)

---

## 5. Context 1 — Client Notes

**Purpose:** Internal notes on client profiles. Never visible to clients.

**File:** `components/clients/client-directory.tsx`
**Section:** `NotesSection` component (inside Client Details panel)

### Implementation

```tsx
<NotesPanel
  linkedField="Client"
  linkedRecordId={clientId}
  authHeaders={authHeaders}
  placeholder="Write a note about this client…"
/>
```

### Key Characteristics

| Property | Value |
|----------|-------|
| `linkedField` | `"Client"` |
| `noteIds` | **Not provided** — uses legacy CONCATENATE fallback |
| `mode` | Default (`"full"`) — team can CRUD |
| `showVisibilityToggle` | Default (`false`) — all client notes are team-only |
| `experimentType` | Not set |
| `filterByType` | Not set |
| Client visibility | **Never** — clients cannot see notes on their own profile |

### Where it appears
- `/management/client-directory` — inside the expandable client detail panel, under a "Notes" collapsible section
- Only visible to management/strategy/sales roles

### Notes
- Client notes do NOT use the `noteIds` prop — the parent Client record's `Notes` field is not fetched. This means it uses the CONCATENATE fallback filter.
- No visibility toggle is shown, so all notes default to `Visibility: "Team"`.
- This is the simplest Notes integration — no experiment type, no visibility, no feedback.

---

## 6. Context 2 — Task Notes

**Purpose:** Notes attached to sales/strategy tasks (calls, follow-ups, meetings).

**File:** `components/sales/task-details-modal.tsx`

### Implementation Pattern

Task Notes do NOT use the `NotesPanel` component. They have a **custom inline implementation** directly in the task modal.

### Custom Implementation Details

**Fetching:**
```typescript
const noteIds = task?.noteIds ?? []
const noteFilter = noteIds.length > 0
  ? `OR(${noteIds.map(id => `RECORD_ID()="${id}"`).join(",")})`
  : undefined

const { data: fetchedNoteRecs, mutate: mutateNotes } = useAirtable<{
  "Note"?: string
  "Created Time"?: string
}>("notes", {
  fields: ["Note", "Created Time"],
  filterExtra: noteFilter,
  enabled: isOpen && !!task && noteIds.length > 0,
  noCache: true,
})
```

**Creating:**
```typescript
const noteFields: Record<string, unknown> = { "Note": content }
if (capturedLinkToLead && task.leadId)   noteFields["Lead"]   = [task.leadId]
if (capturedLinkToClient && task.clientId) noteFields["Client"] = [task.clientId]

const res = await fetch("/api/airtable/notes", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...authHeaders },
  body: JSON.stringify({ fields: noteFields }),
})

// After creating note, link it back to the task record
const updatedNoteIds = [...task.noteIds, record.id]
await fetch(`/api/airtable/tasks/${task.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", ...authHeaders },
  body: JSON.stringify({ fields: { "Notes": updatedNoteIds } }),
})
```

**Deleting:**
```typescript
await fetch(`/api/airtable/notes/${noteId}`, {
  method: "DELETE",
  headers: authHeaders,
})
```

### Key Characteristics

| Property | Value |
|----------|-------|
| Linked fields | Can link to Lead, Client, or neither (task-only) |
| Uses NotesPanel | **No** — custom inline implementation |
| Visibility | No visibility field — task notes are team-only |
| Experiment Type | Not applicable |
| Two-step linking | Creates note, then PATCHes task to add note ID to `Notes` field |
| Optimistic updates | `pendingCreates` + `pendingDeletes` state arrays |
| noCache | `true` — always fetches fresh data |

### Why Not NotesPanel?

Task Notes have unique behavior:
1. **Two-step linking** — note is created, then the task's `Notes` field is manually PATCHed to include the new note ID. This is because tasks link to notes differently than experiments/batches/clients.
2. **Optional cross-linking** — notes can optionally link to a Lead and/or Client via checkboxes in the UI.
3. **No visibility toggle** — all task notes are internal.

### Where it appears
- `/management/calendar` or `/management/tasks` — inside the Task Details modal
- Only visible to management/strategy/sales roles

---

## 7. Context 3 — Batch Notes

**Purpose:** Notes attached to a batch. Team can create; clients see notes marked "All".

**File:** `components/experiments/client-tracker.tsx`

### Implementation

```tsx
<NotesPanel
  linkedField="Batches"
  linkedRecordId={notesModalBatch.id}
  authHeaders={authHeaders}
  placeholder="Write a note about this batch…"
  noteIds={notesModalBatch.noteIds}
  mode={user?.role === 'client' ? 'read-only' : 'full'}
  showVisibilityToggle={user?.role !== 'client'}
/>
```

### Key Characteristics

| Property | Value |
|----------|-------|
| `linkedField` | `"Batches"` |
| `noteIds` | Provided from batch record's `Notes` field |
| `mode` | `"read-only"` for clients, `"full"` for team |
| `showVisibilityToggle` | `true` for team, `false` for clients |
| `experimentType` | Not set |
| `filterByType` | Not set |
| Client visibility | Controlled by Visibility field ("All" = visible) |

### Data Flow

1. Batch record is fetched with `Notes` field → returns `string[]` of note IDs
2. Note IDs are passed to `NotesPanel` via `noteIds` prop
3. NotesPanel fetches notes using `RECORD_ID()` filter
4. Client visibility is filtered client-side based on `Visibility` field

### Where it appears
- Client Tracker page (batch detail panel) — accessible by all roles
- Opened via a "Batch Notes" modal button on each batch card

---

## 8. Context 4 — Experiment Notes (General)

**Purpose:** General notes on experiments. Team can create; clients see notes marked "All".

### 8.1 Experiment Details Modal

**File:** `components/experiments/experiment-details-modal.tsx`

```tsx
<NotesPanel
  linkedField="Experiments"
  linkedRecordId={experiment.id}
  authHeaders={authHeaders}
  placeholder="Write a note about this experiment…"
  noteIds={experiment.noteIds}
  mode={user?.role === "client" ? "read-only" : "full"}
  showVisibilityToggle={user?.role !== "client"}
/>
```

This is the "Notes" tab inside the experiment detail modal (visible from client tracker).

### 8.2 Ideas Table (Management View)

**File:** `components/experiments/ideas-table.tsx`

```tsx
<NotesPanel
  linkedField="Experiments"
  linkedRecordId={notesModalIdea.id}
  authHeaders={authHeaders}
  placeholder="Write a note about this idea…"
  noteIds={notesModalIdea.noteIds}
  showVisibilityToggle
  onNoteCreated={() => mutate()}
/>
```

This is accessed via a "notes" hyperlink on each row of the ideas management table.

### 8.3 Client Ideas Table

**File:** `components/clients/client-ideas-table.tsx`

```tsx
<NotesPanel
  linkedField="Experiments"
  linkedRecordId={notesModalIdea.id}
  authHeaders={authHeaders}
  placeholder="Add a note about this idea…"
  noteIds={notesModalIdea.noteIds}
  mode="add-only"
  onNoteCreated={() => mutate()}
/>
```

Client-facing view — `mode="add-only"` lets clients add notes but not edit/delete.

### Key Characteristics (General Experiment Notes)

| Property | Value |
|----------|-------|
| `linkedField` | `"Experiments"` |
| `noteIds` | From experiment record's `Notes` field |
| `experimentType` | Not set (general notes) |
| `filterByType` | Not set (shows all notes) |
| Client mode | `"read-only"` in detail modal, `"add-only"` in client ideas table |

---

## 9. Context 5 — Experiment Notes (Feedback Types)

Feedback notes are specialized notes with the `Experiment Type` field set. They are created during review workflows and displayed contextually.

### 9.1 Experiment Type Values

| Value | Context | Created By | Created During |
|-------|---------|------------|----------------|
| `Client Idea Feedback` | Idea review | Client | Client Review & Approve Ideas form |
| `Strategy Feedback` | Design review | Strategist | Strategy Review Design Mockups form |
| `Client Design Feedback` | Design review | Client | Client Review Design Mockups form |
| `QA Feedback` | QA review | QA team member | QA Report form |

### 9.2 Client Idea Feedback

**Created in:** `app/(forms)/forms/client-review-ideas/page.tsx`

When a client **rejects** an idea:

```typescript
const noteFields: Record<string, unknown> = {
  Note: feedbackText.trim(),
  Experiments: [experimentId],
}
if (user?.role === 'client') {
  noteFields['Created By (Client)'] = [user.id]
} else {
  noteFields['Created By (Team)'] = [user.id]
}
noteFields['Experiment Type'] = 'Client Idea Feedback'

await fetch('/api/airtable/notes', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({ fields: noteFields }),
})
```

**Displayed in:** `app/(forms)/forms/submit-ideas/page.tsx`

The Submit Ideas form fetches rejection feedback notes:

```typescript
const batchNoteFilter = useMemo(() => {
  // ...
  return `AND({Experiment Type} = "Client Idea Feedback", ${idFilter})`
}, [rejectedNoteIds])

const { data: rawBatchNotes } = useAirtable('notes', {
  fields: ['Note', 'Experiments', 'Created Time'],
  filterExtra: batchNoteFilter,
  enabled: rejectedNoteIds.length > 0,
})
```

Notes are grouped by experiment ID into a `Map<string, { note, createdTime }[]>` and displayed as inline callouts on rejected experiments.

### 9.3 Strategy Feedback & Client Design Feedback

**Displayed in:** `app/(forms)/forms/submit-mockups/page.tsx`

The Submit Mockups form fetches both strategy and client design feedback:

```typescript
const noteFilter = useMemo(() => {
  // ...
  return `AND(${idFilter}, OR({Experiment Type} = "Strategy Feedback", {Experiment Type} = "Client Design Feedback"))`
}, [feedbackNoteIds])

const { data: rawNotes } = useAirtable('notes', {
  fields: ['Note', 'Experiments', 'Created Time', 'Experiment Type', 'Created By (Team)', 'Created By (Client)'],
  filterExtra: noteFilter,
  sort: [{ field: 'Created Time', direction: 'desc' }],
})
```

These are displayed as contextual callouts inside experiment cards when the experiment has a revision status.

### 9.4 Feedback Notes in NotesPanel (Inline Filtering)

In the submit-ideas form, the NotesPanel is used with type filtering:

```tsx
<NotesPanel
  linkedField="Experiments"
  linkedRecordId={exp.id}
  authHeaders={authHeaders}
  experimentType="Strategy Feedback"       // New notes get this type
  filterByType="Strategy Feedback"         // Only show this type
  noteIds={exp.noteIds}
  mode="read-only"
/>
```

The `filterByType` prop adds `AND(..., {Experiment Type} = "Strategy Feedback")` to the fetch filter, ensuring only notes of that type are displayed.

### 9.5 Feedback Note Display Pattern

Feedback notes in forms are typically displayed as colored callout boxes:

```tsx
// Strategy feedback (amber callout)
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
  <div className="flex items-center gap-1.5 mb-1">
    <MessageSquare className="h-3 w-3 text-amber-600" />
    <span className="text-[11px] font-semibold text-amber-700">Strategy Feedback</span>
  </div>
  <p className="text-[12px] text-amber-800">{note.note}</p>
</div>

// Client feedback (sky callout)
<div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
  <div className="flex items-center gap-1.5 mb-1">
    <MessageSquare className="h-3 w-3 text-sky-600" />
    <span className="text-[11px] font-semibold text-sky-700">Client Feedback</span>
  </div>
  <p className="text-[12px] text-sky-800">{note.note}</p>
</div>
```

---

## 10. Session Note Tracking (Bug Fix Pattern)

### The Problem

When a user creates a note in a modal:
1. The note is saved to Airtable successfully
2. NotesPanel tracks it via internal `sessionNoteIds`
3. When the modal closes, `sessionNoteIds` is lost (component unmounts)
4. The parent's `Notes` linked field is stale (Redis cache for experiments not invalidated)
5. Reopening the modal shows the old note count and misses the new note

### The Solution

Lift session note tracking to the parent component.

### Implementation Pattern

```typescript
// 1. Add session tracking state in parent
const [sessionNotesByExp, setSessionNotesByExp] = useState<Map<string, string[]>>(new Map())

// 2. Merge helper — deduplicates server + session IDs
const getMergedNoteIds = (expId: string, serverNoteIds: string[]): string[] => {
  const sessionIds = sessionNotesByExp.get(expId) ?? []
  if (sessionIds.length === 0) return serverNoteIds
  const set = new Set(serverNoteIds)
  for (const id of sessionIds) set.add(id)
  return [...set]
}

// 3. Count helper — uses deduplicated set
const getMergedNoteCount = (expId: string, serverNoteIds: string[]): number => {
  return getMergedNoteIds(expId, serverNoteIds).length
}

// 4. Note creation handler
const handleNoteCreated = (expId: string, noteId?: string) => {
  if (noteId) {
    setSessionNotesByExp(prev => {
      const next = new Map(prev)
      const existing = next.get(expId) ?? []
      if (!existing.includes(noteId)) {
        next.set(expId, [...existing, noteId])
      }
      return next
    })
  }
  mutateExperiments()  // Re-fetch parent data to eventually sync
}

// 5. Use merged count in display
<span>{getMergedNoteCount(exp.id, exp.noteIds)} Notes</span>

// 6. Use merged IDs when opening modal
setNotesModalExp({
  id: exp.id,
  name: exp.name,
  noteIds: getMergedNoteIds(exp.id, exp.noteIds),
})

// 7. Pass handler to NotesPanel
<NotesPanel
  noteIds={notesModalExp.noteIds}
  onNoteCreated={(noteId) => handleNoteCreated(notesModalExp.id, noteId)}
/>
```

### Files Using This Pattern

- `app/(forms)/forms/submit-ideas/page.tsx` — with `mutateIdeas()` + `mutateBatchExps()`
- `app/(forms)/forms/client-review-ideas/page.tsx` — with `mutateNotes()`
- `app/(forms)/forms/submit-mockups/page.tsx` — with `mutateExperiments()`

### Why `getMergedNoteCount` Uses `.length` Not Addition

Early implementation added `sessionCount + serverCount`, which could double-count after SWR refetches caught up and the server data now included the session-created note. The fix uses `getMergedNoteIds().length` which deduplicates via a `Set`.

---

## 11. Delay Notes (Auto-Generated)

**File:** `components/forms/use-delay-tracking.ts`

When a form submission is overdue, the `useDelayTracking` hook creates an auto-generated note alongside the Delay record:

```typescript
const noteFields: Record<string, unknown> = {
  'Note': `[Delay - ${dueDateLabel}] ${delayReason.trim()} (submitted by ${assigneeName}, ${daysOverdue} days overdue)`,
}

await fetch('/api/airtable/notes', {
  method: 'POST',
  headers,
  body: JSON.stringify({ fields: noteFields }),
})
```

### Key Characteristics
- No `linkedField` — delay notes are not linked to experiments/batches/clients
- No `Experiment Type` — these are standalone delay tracking notes
- No `Visibility` — defaults to team-only
- Created alongside a Delay record but not linked to it via a field

---

## 12. Implementation Checklist — Adding Notes to a New Context

When adding Notes to a new page or component:

### Step 1: Determine the Integration Type

- **Simple (use NotesPanel)** — Most cases. Works for client profiles, batch notes, experiment notes.
- **Custom (inline implementation)** — Only if you need two-step linking (like Task Notes) or non-standard behavior.

### Step 2: Fetch Parent Data with `Notes` Field

Ensure the parent data fetch includes the `Notes` field:

```typescript
const { data } = useAirtable('experiments', {
  fields: ['Test Description', 'Notes', ...otherFields],
  // ...
})

// Map noteIds from the record
const noteIds = Array.isArray(f['Notes']) ? (f['Notes'] as string[]) : []
const noteCount = noteIds.length
```

### Step 3: Add NotesPanel

```tsx
<NotesPanel
  linkedField="Experiments"        // Which linked field to populate on note creation
  linkedRecordId={record.id}       // Parent record ID
  authHeaders={authHeaders}        // Auth headers from useUser
  noteIds={record.noteIds}         // ALWAYS pass noteIds for reliable RECORD_ID() filtering
  placeholder="Write a note…"
  mode={user?.role === 'client' ? 'read-only' : 'full'}
  showVisibilityToggle={user?.role !== 'client'}  // If visibility matters
  onNoteCreated={(noteId) => handleNoteCreated(record.id, noteId)}
/>
```

### Step 4: Add Session Note Tracking (if notes are in a modal)

If the NotesPanel lives inside a modal that opens/closes, you MUST add session tracking to avoid the stale-count bug:

```typescript
const [sessionNotesByExp, setSessionNotesByExp] = useState<Map<string, string[]>>(new Map())

const getMergedNoteIds = (id: string, serverIds: string[]): string[] => {
  const sessionIds = sessionNotesByExp.get(id) ?? []
  if (sessionIds.length === 0) return serverIds
  const set = new Set(serverIds)
  for (const sid of sessionIds) set.add(sid)
  return [...set]
}

const getMergedNoteCount = (id: string, serverIds: string[]): number => {
  return getMergedNoteIds(id, serverIds).length
}

const handleNoteCreated = (parentId: string, noteId?: string) => {
  if (noteId) {
    setSessionNotesByExp(prev => {
      const next = new Map(prev)
      const existing = next.get(parentId) ?? []
      if (!existing.includes(noteId)) {
        next.set(parentId, [...existing, noteId])
      }
      return next
    })
  }
  mutateParentData()  // Trigger SWR refetch of parent data
}
```

### Step 5: If Adding Feedback Notes

For review forms that create typed feedback:

```typescript
const noteFields: Record<string, unknown> = {
  Note: feedbackText,
  Experiments: [experimentId],
  'Experiment Type': 'Strategy Feedback',  // Set the type
}
if (user?.role === 'client') {
  noteFields['Created By (Client)'] = [user.id]
} else {
  noteFields['Created By (Team)'] = [user.id]
}

await fetch('/api/airtable/notes', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({ fields: noteFields }),
})
```

### Step 6: Auth Headers Pattern

Always construct auth headers the same way:

```typescript
const authHeaders: Record<string, string> = user ? {
  'Content-Type': 'application/json',
  'x-user-role': user.role,
  'x-user-id': user.id,
  'x-user-name': user.name,
  ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
} : { 'Content-Type': 'application/json' }
```

---

## 13. Known Gotchas & Troubleshooting

### 1. CONCATENATE Fallback is Unreliable

**Problem:** When `noteIds` is not provided, NotesPanel uses:
```
FIND("{recordId}", CONCATENATE({linkedField})) > 0
```
This uses the Airtable `CONCATENATE` function on linked record fields, which returns the **display name** (primary field value), not the record ID. This breaks filtering.

**Fix:** Always pass `noteIds` to NotesPanel. Fetch the parent record's `Notes` field and extract the array of record IDs.

### 2. Redis Cache Not Invalidated for Parent on Note Create

**Problem:** `POST /api/airtable/notes` invalidates `notes:*` but NOT `experiments:*` or `batches:*`. So the parent's `Notes` linked field stays stale.

**Fix:** Use session note tracking (Section 10) to maintain an accurate count client-side.

### 3. Client Role Filter Uses Record ID from Client

**Problem:** The role filter for clients is:
```
FIND("{clientId}", {Record ID (from Client)}) > 0
```
This field (`Record ID (from Client)`) must exist as a lookup/formula in the Notes table that extracts the record ID from the Client linked field.

**Fix:** Ensure the Notes table has this lookup field configured.

### 4. Visibility Filtering is Client-Side Only

**Problem:** The `Visibility` field filtering happens in the NotesPanel component, NOT in the Airtable formula. All notes matching the RECORD_ID() filter are fetched, then filtered client-side.

**Implication:** Clients receive all note data over the wire — they're just hidden in the UI. The server-side role filter provides base access control, but visibility is UI-level. This is acceptable because the role filter already restricts clients to notes linked to their client record.

### 5. onNoteCreated Callback Signature

The `onNoteCreated` callback was updated to pass the note ID: `(noteId?: string) => void`. If you're using an older pattern like `() => mutate()`, it still works (the `noteId` parameter is optional), but you won't get session tracking.

### 6. StickyNote Icon vs NotesPanel

Task Notes use the `StickyNote` icon from lucide-react for their section header. NotesPanel-based implementations typically use `FileText` or `MessageSquare` for note-related UI. This is a visual distinction, not a functional one.

### 7. noCache on Task Notes

Task notes use `noCache: true` to bypass Redis caching entirely. This ensures notes are always fresh when the modal opens. NotesPanel-based implementations rely on SWR's revalidation strategy instead.

---

## Quick Reference — All NotesPanel Usages

| Location | File | linkedField | mode | Visibility Toggle | experimentType | filterByType |
|----------|------|-------------|------|-------------------|----------------|--------------|
| Client Profile | `client-directory.tsx` | `"Client"` | `"full"` | No | — | — |
| Batch Notes | `client-tracker.tsx` | `"Batches"` | client: `"read-only"`, team: `"full"` | Yes (team only) | — | — |
| Experiment Details | `experiment-details-modal.tsx` | `"Experiments"` | client: `"read-only"`, team: `"full"` | Yes (team only) | — | — |
| Ideas Table (Mgmt) | `ideas-table.tsx` | `"Experiments"` | `"full"` | Yes | — | — |
| Client Ideas Table | `client-ideas-table.tsx` | `"Experiments"` | `"add-only"` | No | — | — |
| Submit Ideas Form | `submit-ideas/page.tsx` | `"Experiments"` | `"full"` | Yes | — | — |
| Client Review Ideas | `client-review-ideas/page.tsx` | `"Experiments"` | client: `"read-only"`, team: `"full"` | Yes (team only) | — | — |
| Submit Mockups Form | `submit-mockups/page.tsx` | `"Experiments"` | `"full"` | Yes | — | — |

## Quick Reference — Feedback Note Types

| Experiment Type | Created In | Created By | Displayed In |
|----------------|------------|------------|--------------|
| `Client Idea Feedback` | `client-review-ideas/page.tsx` | Client (on reject) | `submit-ideas/page.tsx` |
| `Strategy Feedback` | `strategy-review-mockups` (planned) | Strategist | `submit-mockups/page.tsx` |
| `Client Design Feedback` | `client-review-mockups` (planned) | Client | `submit-mockups/page.tsx` |
| `QA Feedback` | `qa-report` (planned) | QA team member | TBD |
