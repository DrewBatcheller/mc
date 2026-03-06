C:\Users\dbatc\.claude\plans\floofy-chasing-thimble.md

# Approval & Review Workflow System — Implementation Plan

## Context

The MoreConversions CRO agency needs cyclic approve/reject/revise workflows throughout the experiment lifecycle. Today, approvals live in Slack Block Kit messages managed by n8n and Fillout forms — disconnected from the webapp. This plan moves all **action** (approve, reject, provide feedback, re-submit) into the webapp while keeping Slack as the **attention** layer (push notifications with deep links). Airtable remains the **state** layer.

The four workflow loops this covers:
1. **Test Ideas** — Strategist syncs ideas from Experiment Ideas table into Experiments table → Client approves/rejects each experiment individually
2. **Design** — Designer submits Figma → Strategist reviews → Client approves/rejects each experiment individually
3. **Dev → QA** — Developer submits Convert ID → QA passes/fails each experiment individually with feedback
4. **Launch** — All experiments QA approved → Launch → Client notified

### Task Creation

Tasks for each stage (Design, Dev, QA, Strategy, etc.) are pre-created when a Batch is first created. Currently n8n handles this only on scheduled batch creation. **Phase 7** adds webapp-side batch creation with auto-task generation + auto-assignment to the client's designated team members. The approval workflow itself (Phases 0-6) does NOT create tasks — tasks already exist.

### Batch vs Per-Experiment Advancement

**Stages advance as a batch:** Design doesn't start until ALL ideas are approved. Dev doesn't start until ALL designs are approved. Launch can't happen until ALL experiments pass QA.

**But feedback loops are per-experiment:** When a client rejects 1 of 4 ideas, the strategist desyncs that 1 rejected experiment, syncs a replacement, and sends ONLY the new unapproved experiment back to the client. The other 3 stay approved. Similarly, if QA fails 1 of 4 experiments, only that 1 goes back to the developer — the other 3 stay QA: Approved.

**Idea rejection/replacement flow:** When a client rejects an idea-stage experiment, the strategist "desyncs" it (removes it from the batch/Experiments table in Airtable), optionally modifies the source idea in the Experiment Ideas table, and syncs a replacement experiment. The new experiment arrives as `Idea: Pending` for the client. This desync/sync happens in Airtable — the webapp just shows the current state.

### Experiment Ideas vs Experiments (Two Separate Tables)

- `Experiment Ideas` table = raw idea pool. Clients can submit ideas here. Ideas live here until synced.
- `Experiments` table = active experiments linked to batches. Created when a strategist "syncs" an idea to a batch.
- The `Experiment Status` field lives on the **Experiments** table. There are no "Idea:" statuses on the Experiment Ideas table.
- When a strategist syncs an idea, a new Experiment record is created with `Experiment Status: Idea: Pending`.
- The entire approval/review workflow operates on the **Experiments** table.

### Management & Strategy as Project Managers

Management and Strategy roles are **project managers** with god-like oversight. They don't just participate in specific workflow steps — they oversee the entire lifecycle across all clients. This means:

- **See everything**: All clients, all experiments, all stages — with the ability to drill down per client
- **Do anything**: Trigger any transition at any point (submit on behalf of a designer, approve on behalf of QA, etc.)
- **Ping anyone**: One-click Slack DM + in-app notification to remind a team member about a stuck task
- **Identify problems**: See what's overdue, what's stuck in revision, what's awaiting action

This is why `/management/team-dashboard` exists separately from `/team/dashboard`. Rather than building complex permission-aware pages, we maintain separate management vs team views as we do today.

### Role → Page Mapping (Who Uses What)

The workflow system is **NOT** a single permissions-aware component. It is **separate pages built for each role's distinct use case**, following the existing pattern of `/management/` vs `/team/` vs `/clients/` route separation.

| Role | Pages They Use | What They Do There |
|------|---------------|-------------------|
| **Client** | `/clients/approvals` | Approve/reject test ideas and designs. Give feedback on rejections. That's it — monitoring happens on their existing dashboard pages. |
| **Team (Designer)** | `/team/dashboard` → Task Modal | Submit Figma URLs, see revision feedback from strategy/client, re-submit to strategy. |
| **Team (Developer)** | `/team/dashboard` → Task Modal | Submit Convert IDs, mark task complete, see QA feedback on failures, click "Re-submit to QA". |
| **Team (QA)** | `/team/dashboard` → Task Modal | Review experiments, pass/fail with feedback. Exactly what they do now, but wired to the transition endpoint. |
| **Strategy** | `/experiments/review-queue` | Review designs, approve for client or request revision. Their primary workflow tool. |
| **Strategy** | `/management/workflow` | Oversee their assigned clients' full pipeline. See stuck items, ping team, take action on anything. |
| **Management** | `/management/workflow` | God-mode oversight across ALL clients. Same as strategy but unfiltered — sees every client, every batch, every experiment. |

**Key distinctions:**
- **Clients** have the simplest view — just approve/reject cards. Mobile-first. No sidebar on magic link access.
- **Team members** work through the existing task modal (enhanced with feedback display + re-submit buttons). They don't need a workflow overview — their dashboard + notification system tells them what needs attention.
- **Strategy** splits time between the review queue (their specific task) and the workflow overview (PM oversight of their clients). The workflow overview auto-filters to their assigned clients by default.
- **Management** lives in the workflow overview with no client filter (sees everyone). Can drill into anything and take any action.

**No shared component.** Each page is a purpose-built component for its audience. The only shared code is:
- `lib/experiment-state-machine.ts` — transition validation (used by all pages via the API)
- `lib/experiment-status-styles.ts` — consistent status badge colors
- The transition API endpoint at `/api/experiments/[id]/transition` — all pages call the same backend

### Mobile-First Design (Cross-Cutting)

The most common flow is: **Slack notification on phone → tap link → approve/reject on phone**. All new UI components must be designed mobile-first:

- **Large touch targets** — Approve/Reject buttons are full-width on mobile, minimum 44px height
- **Cards stack vertically** — single column layout on mobile, grid on desktop
- **Feedback textarea** — inline expand (not a separate modal/page) to minimize navigation
- **Minimal chrome** — on the magic-link approval pages, hide the full sidebar; show a lightweight header with logo + "Back to Dashboard" only
- **Responsive breakpoints** — use existing Tailwind `sm:` / `md:` / `lg:` breakpoints already in the codebase
- **No horizontal scrolling** — all content fits viewport width

**Design quality is critical.** These pages are the primary touchpoint for clients and the daily tool for strategists/management. The UX must be polished, intuitive, and visually impressive — not utilitarian scaffolding. Detailed design specs are provided in each phase below.

This applies to: Client Approvals (Phase 4), Strategy Review Queue (Phase 5), and the Management Workflow Overview (Phase 6).

---

## Phase 0 — Experiment State Machine (lib layer)

> **Depends on:** Nothing. Foundation for everything else.

### Create `lib/experiment-state-machine.ts`

Defines the canonical state machine that both the API and UI reference.

**Types:**
```ts
export type ExperimentStatus =
  | 'Idea: Pending' | 'Idea: Approved' | 'Idea: Rejected'
  | 'Design: In Progress' | 'Design: Awaiting Strategy Review'
  | 'Design: Strategy Revision Requested' | 'Design: Awaiting Client Approval'
  | 'Design: Client Revision Requested' | 'Design: Approved'
  | 'Dev: In Progress' | 'Awaiting QA' | 'QA: Revision Requested' | 'QA: Approved'

export type NoteType =
  | 'QA Feedback' | 'Strategy Feedback'
  | 'Client Idea Feedback' | 'Client Design Feedback'
```

**Transition map** — object keyed by current status, values are arrays of `{ to, allowedRoles[], requiresNote?: NoteType }`.

> **Management & Strategy override:** `management` and `strategy` can trigger **any** transition in the table below, regardless of the `allowedRoles` column. The `allowedRoles` column shows who *normally* takes the action. The `validateTransition` function checks: `if (role === 'management' || role === 'strategy') → always valid for any defined transition`. This gives PMs the ability to do anyone's job.

| From | To | Normal Roles | Required Note | Context |
|------|----|-------------|---------------|---------|
| Idea: Pending | Idea: Approved | client | — | Client approves an experiment |
| Idea: Pending | Idea: Rejected | client | Client Idea Feedback | Client rejects; strategist desyncs and replaces in Airtable |
| Idea: Approved | Design: In Progress | strategy | — | All ideas approved → batch enters Design stage |
| Design: In Progress | Design: Awaiting Strategy Review | team | — | Designer finishes Figma, clicks "Notify Strategy" |
| Design: Awaiting Strategy Review | Design: Strategy Revision Requested | strategy | Strategy Feedback | Strategist finds issue, sends back to designer |
| Design: Awaiting Strategy Review | Design: Awaiting Client Approval | strategy | — | Strategist approves, sends to client |
| Design: Strategy Revision Requested | Design: Awaiting Strategy Review | team | — | Designer fixes, re-submits to strategy |
| Design: Awaiting Client Approval | Design: Client Revision Requested | client | Client Design Feedback | Client wants changes |
| Design: Awaiting Client Approval | Design: Approved | client | — | Client approves design |
| Design: Client Revision Requested | Design: In Progress | strategy, team | — | Designer picks up revision based on client feedback |
| Design: Approved | Dev: In Progress | strategy | — | All designs approved → batch enters Build & QA stage |
| Dev: In Progress | Awaiting QA | team | — | Developer finishes, marks task complete → experiments go to QA |
| Awaiting QA | QA: Revision Requested | team (QA dept) | QA Feedback | QA finds issue, sends back to developer |
| Awaiting QA | QA: Approved | team (QA dept) | — | QA passes experiment |
| QA: Revision Requested | Awaiting QA | team (Dev dept) | — | Developer fixes, clicks "Re-submit to QA" → QA notified directly |

**Removed `Idea: Rejected → Idea: Pending`**: When ideas are rejected, the strategist desyncs/re-syncs in Airtable rather than modifying the same experiment record. No transition needed — the rejected record stays rejected (or gets removed) and a fresh experiment arrives as `Idea: Pending`.

**Exported functions:**
- `validateTransition(from, to, role)` → `{ valid, requiresNote?, error? }` — management/strategy bypass role check
- `getAvailableTransitions(from, role)` → `TransitionRule[]` — for management/strategy, returns ALL transitions from that status
- `isRevisionStatus(status)` → boolean helper
- `isAwaitingAction(status, role)` → boolean (used for badge counts)
- `getStatusPhase(status)` → `'idea' | 'design' | 'dev' | 'qa'` — used for grouping in management views

### Create `lib/experiment-status-styles.ts`

Shared status badge styles used by all UI pages. Maps each `ExperimentStatus` to Tailwind classes for consistent visual language:

```ts
export const STATUS_STYLES: Record<ExperimentStatus, { bg: string; text: string; dot: string; label: string }> = {
  'Idea: Pending':    { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Pending' },
  'Idea: Approved':   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
  // ... etc for all 13 statuses
}

export function StatusBadge({ status }: { status: ExperimentStatus }) { ... }
export function StatusDot({ status }: { status: ExperimentStatus }) { ... }
```

Also exports `BATCH_STATUS_STYLES` for batch-level Batch Status badges.

---

## Phase 1 — Transition API Endpoint

> **Depends on:** Phase 0

### Create `app/api/experiments/[id]/transition/route.ts`

A dedicated POST endpoint (separate from the generic PATCH proxy) that enforces the state machine.

```
POST /api/experiments/{experimentId}/transition
Headers: x-user-role, x-user-id, x-user-name, x-client-id
Body: {
  to: ExperimentStatus
  note?: { content: string }   // required when transition.requiresNote is set
}
```

**Logic:**
1. `extractQueryContext(headers)` — get auth context
2. `getRecord('Experiments', id)` — read current `Experiment Status`
3. `validateTransition(currentStatus, body.to, ctx.role)` — enforce state machine
4. Return 400 if invalid transition or missing required note
5. **Atomic writes:**
   - `updateRecord('Experiments', id, { 'Experiment Status': body.to })`
   - If QA transition: also write `{ 'Client Approval': body.to === 'QA: Approved' }` (n8n backward compat)
   - If note required: `createRecord('Notes', { 'Note Type': noteType, 'Experiments': [id], 'Note': body.note.content, 'Author': ctx.userName })`
   - `createRecord('Notifications', { ... })` — in-app notification for the next person
6. `invalidatePattern('experiments:*')`, `invalidatePattern('notes:*')`, `invalidatePattern('notifications:*')`
7. `broadcastMutation(...)` for experiments, notes, notifications
8. Fire-and-forget Slack notification (Phase 2 — can be a no-op until then)
9. Return `{ experiment, noteId? }`

### Modify `app/api/airtable/[resource]/[id]/route.ts` (line 47)

Allow `team` role to PATCH `experiments` (for Figma URL, Convert ID submission — non-status fields). The status field is protected by the dedicated transition endpoint, not the generic PATCH.

```ts
// Before:
if (resource !== 'notifications' && resource !== 'notes' && (ctx.role === 'client' || ctx.role === 'team'))

// After:
if (resource !== 'notifications' && resource !== 'notes' && resource !== 'experiments' && (ctx.role === 'client' || ctx.role === 'team'))
```

> Note: Client role stays blocked from the generic PATCH — clients only interact via the transition endpoint.

---

## Phase 2 — Slack Notification Integration

> **Depends on:** Phase 1. Can be built in parallel with Phases 3-5.

### Install `@slack/web-api`

```bash
npm install @slack/web-api
```

### Create `lib/slack.ts`

- Initializes `WebClient` with `process.env.SLACK_USER_TOKEN` (sends as the Founder's account — he can see replies and edit messages)
- `sendSlackDM(email, text, blocks)` — looks up user by email, sends DM
- `buildApprovalMessage(experimentName, actorName, deepLinkUrl)` — returns Slack Block Kit blocks with a deep link button
- Notification config map: which transitions trigger Slack, to whom, with what message template and deep link

**Transition → Slack mapping:**

| New Status | Notify Who | Deep Link |
|------------|-----------|-----------|
| Idea: Pending (re-submitted) | Client contact | `/clients/approvals` |
| Design: Awaiting Strategy Review | Strategist on experiment | `/experiments/review-queue` |
| Design: Strategy Revision Requested | Designer on experiment | `/team/dashboard` |
| Design: Awaiting Client Approval | Client contact | `/clients/approvals` |
| Design: Client Revision Requested | Designer on experiment | `/team/dashboard` |
| QA: Revision Requested | Developer on experiment | `/team/dashboard` |
| QA: Approved | Management + Strategist | `/management/team-dashboard` |
| All experiments QA: Approved in batch | Client contact | `/clients/dashboard` |

### Create `app/api/slack/notify/route.ts`

Internal-use POST endpoint called by the transition endpoint. Not exposed to clients.

```
POST /api/slack/notify
Body: { experimentId, transition: { from, to }, actorName, noteContent? }
```

Resolves the recipient:
- **Team members** (Designer, Developer, QA, Strategist): looked up by email in Team table → sent as Slack DM or posted to internal channels (#design, #development, #strategy)
- **Clients**: uses `Slack Channel ID` field from the Clients table → posted to the Slack Connect channel (not DM — clients are in separate orgs connected via Slack Connect)

### Env vars to add to `.env.local`:

```bash
# Slack — User OAuth Token (sends messages as the Founder's account so he can
# see all replies and edit messages after they're sent)
SLACK_USER_TOKEN=xoxp-...
SLACK_SIGNING_SECRET=f9d3d46d...

# Magic link signing — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# This is a one-time random string the server uses to sign URLs. Run the command above, paste the output here.
MAGIC_LINK_SECRET=<paste generated hex string here>
```

---

## Phase 3 — Task Modal Enhancements (Team Workflow)

> **Depends on:** Phase 1. Core UI work.

### Modify `components/team/task-modal.tsx`

#### 3a. Add `Experiment Status` to fetched fields

In the `useAirtable('experiments', ...)` call, add `"Experiment Status"` to the `fields` array. Extend the `AirtableExp` interface:

```ts
interface AirtableExp {
  // ... existing fields ...
  experimentStatus: string | null  // NEW — maps from "Experiment Status"
}
```

#### 3b. Replace QA submit to use transition endpoint

**Current** (`handleQASubmit`): PATCHes `Client Approval` boolean directly.

**New**: POST to `/api/experiments/{id}/transition` with:
- Pass → `{ to: 'QA: Approved' }`
- Fail → `{ to: 'QA: Revision Requested', note: { content: reportText || reportUrl } }`

The transition endpoint handles writing `Client Approval` for backward compat.

#### 3c. Wire "Notify Strategy" button (Design dept)

**Current**: Console.log stub.

**New**: For each experiment, POST to `/api/experiments/{id}/transition` with `{ to: 'Design: Awaiting Strategy Review' }`. This triggers the in-app notification + Slack DM to the strategist.

#### 3d. Wire "Mark Task Complete" (Dev dept) to also transition experiments

After PATCHing the task to `Status: "Complete"`, also transition each experiment to `Awaiting QA`:

```ts
await Promise.all(experiments.map(exp =>
  fetch(`/api/experiments/${exp.id}/transition`, {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ to: 'Awaiting QA' }),
  })
))
```

#### 3e. Show feedback notes inline on revision-requested experiments

Add a secondary `useAirtable('notes', ...)` call filtered to experiments with revision statuses. Render a feedback callout inside each experiment card when notes exist.

The feedback display is context-specific to the team member's department:
- **Designer sees** (`Design: Strategy Revision Requested`): Strategy Feedback notes — what the strategist wants changed
- **Designer sees** (`Design: Client Revision Requested`): Client Design Feedback notes — what the client wants changed
- **Developer sees** (`QA: Revision Requested`): QA Feedback notes — what QA found wrong, plus the Walkthrough Video URL if provided

Each feedback note is rendered as a compact callout with:
- Note type label + timestamp
- Note content
- Amber background for pending revisions, muted for historical

```
┌─ Experiment Card ──────────────────────────┐
│  Test Description: ...                      │
│  Status: QA: Revision Requested             │
│  ┌─ Revision Feedback ──────────────────┐  │
│  │  QA Feedback — Mar 3, 2026           │  │
│  │  "Button alignment off on mobile,    │  │
│  │   doesn't match Figma at 375px"      │  │
│  │  📹 Walkthrough: [View Video →]      │  │
│  └──────────────────────────────────────┘  │
│  [Re-submit Convert ID]  [Submit to QA →]  │
└────────────────────────────────────────────┘
```

#### 3f. Show experiment status badge

Display the current `Experiment Status` as a small colored badge on each experiment card. Use the status prefix to determine color (Idea: blue, Design: sky, Dev: violet, QA: amber).

#### 3g. Re-enable inputs and show re-submit buttons on revision status

When an experiment is in a "Revision Requested" state:

- **`QA: Revision Requested`** (Developer sees this):
  - Show QA feedback notes inline (see 3e)
  - Convert ID is already submitted (doesn't need re-entry — the experiment ID never changes)
  - Show a **"Re-submit to QA"** button that transitions the experiment to `Awaiting QA` and notifies the QA team member directly
  - This is the key button the user described: developer fixes the issue, clicks one button to send it back to QA

- **`Design: Strategy Revision Requested`** (Designer sees this):
  - Show Strategy feedback notes inline
  - Re-enable Figma URL input (designer may have updated the Figma file and the URL might change, or they can leave it)
  - Show **"Re-submit to Strategy"** button that transitions to `Design: Awaiting Strategy Review`

- **`Design: Client Revision Requested`** (Designer sees this):
  - Show Client Design Feedback notes inline
  - Same as above — re-enable Figma URL + "Re-submit to Strategy" (goes back through strategy review before client sees it again)

---

## Phase 4 — Client Approval Portal

> **Depends on:** Phase 1. Can be built in parallel with Phases 3 and 5.

### Create `app/(dashboard)/clients/approvals/page.tsx`

Page wrapper rendering the `ClientApprovals` component.

### Create `components/clients/client-approvals.tsx`

Fetches experiments where `Experiment Status` is `Idea: Pending` or `Design: Awaiting Client Approval` (the existing `buildRoleFilter` for experiments already scopes by client).

```ts
const filterExtra = `OR({Experiment Status} = "Idea: Pending", {Experiment Status} = "Design: Awaiting Client Approval")`
```

#### Design Specification — Client Approvals

**Page layout (mobile-first):**
- When accessed via magic link: no sidebar, just a clean lightweight header (logo + client name + avatar)
- When accessed from regular navigation: standard sidebar layout
- Detect via URL param or absence of sidebar context

**Header section:**
- Greeting: "Hey {clientName}" + subtitle: "{n} items need your review"
- Counts as pill badges: "3 Ideas" / "2 Designs" — clicking scrolls to that section
- If 0 items: warm empty state with illustration/icon and "You're all caught up — nothing to review right now."

**Grouping:** Experiments are grouped by batch (e.g., "March Tests — 4 ideas to review"). Batch name as section header with a subtle divider. Within each batch, individual experiment cards.

**Per-experiment approval:** Client approves or rejects EACH experiment individually. When a client rejects 1 of 4, only that 1 gets `Idea: Rejected` + feedback note. The other 3 stay approved. The strategist then handles desync/re-sync in Airtable. Once all experiments in the batch are `Idea: Approved`, the batch advances to the next stage.

**Approval cards — context-specific data:**

The data shown depends on WHAT the client is approving. Reference: these map to the Airtable fields already fetched in `task-modal.tsx`.

**Test Idea cards** (Idea: Pending) — the client is deciding: "Do I want to run this test?"
- `Test Description` — the core pitch, shown prominently
- `Placement` + `Placement URL` — where on their site this test targets (URL is clickable link)
- `Devices` — Desktop, Mobile, or both
- `Media/Links` — any reference materials the strategist attached

**Design cards** (Design: Awaiting Client Approval) — the client is deciding: "Does this design match what I want?"
- `Test Description` — reminder of what this test is about
- `FIGMA Url` — **the most important element** — prominent "View Design" button/link, visually dominant
- `Design Brief` — what the designer was asked to create
- `Placement` + `Placement URL` — context for where the design will go
- `Devices` — what devices the design targets

**Card visual treatment:**
- Full-width on mobile, `max-w-2xl` centered on desktop
- Clean white card with subtle shadow (`shadow-sm`), rounded-xl, left border accent (blue for Ideas, sky for Designs)
- **Card anatomy:**
  - Top: Experiment name (`Test Description`, semibold, `text-[15px]`) + type pill ("Test Idea" / "Design Review")
  - Middle: Context-specific fields as described above, compact `text-[13px]` muted layout. Placement URL is a clickable external link. Figma URL for designs is styled as a prominent button-like row with Figma icon.
  - Bottom: Two action buttons, full-width stacked on mobile, side-by-side on `sm:`
    - **Approve**: solid green (`bg-emerald-600 hover:bg-emerald-700`), white text, CheckCircle2 icon, `h-11` (44px touch target)
    - **Request Changes**: outline style (`border border-rose-200 text-rose-700 hover:bg-rose-50`), XCircle icon, `h-11`
  - Loading state: button shows spinner + "Approving..." / "Submitting..."
  - Success state: card briefly pulses green and slides out of the list (animated with `transition-all`)

**Reject/feedback expansion:**
- When "Request Changes" is clicked, the button area smoothly expands to reveal:
  - A textarea (`min-h-[100px]`) with placeholder "What changes would you like to see?"
  - A "Submit Feedback" button (rose solid) and a "Cancel" text link
  - The textarea auto-focuses on expansion
- No modals, no page changes — everything inline to minimize friction on mobile

**Interactions:**
- `sonner` toast on success: "Approved!" (green) or "Feedback sent" (blue)
- SSE broadcast auto-refreshes — approved items disappear from the list
- Optimistic UI: card immediately starts fade-out animation on approve, reverts if API fails
- Section headers auto-hide when their group becomes empty

**Approve** → POST `/api/experiments/{id}/transition` with `{ to: 'Idea: Approved' }` or `{ to: 'Design: Approved' }`

**Reject** → POST with `{ to: 'Idea: Rejected', note: { content: '...' } }` or `{ to: 'Design: Client Revision Requested', note: { content: '...' } }`

### Update navigation

**`components/dashboard/sidebar-nav.tsx`** — Add `{ label: "Approvals", href: "/clients/approvals" }` to the Client Dashboard section's `subItems`.

**`lib/section-config.ts`** — Add `/clients/approvals` to the `clientDashboard.routes` array.

### Magic Links for Frictionless Client Access

Clients will click Slack links on their **phone** — they won't have an active session. Requiring login kills the flow. Instead, Slack deep links use **signed magic URLs** that authenticate the client automatically.

#### Create `lib/magic-link.ts`

```ts
import crypto from 'crypto'

const SECRET = process.env.MAGIC_LINK_SECRET! // 32+ char random string

export function generateMagicUrl(userId: string, clientId: string, redirectPath: string, expiresInHours = 72): string {
  const expires = Date.now() + expiresInHours * 3600_000
  const payload = `${userId}:${clientId}:${expires}:${redirectPath}`
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  const token = Buffer.from(JSON.stringify({ userId, clientId, expires, redirectPath, sig: signature })).toString('base64url')
  return `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic?token=${token}`
}

export function verifyMagicToken(token: string): { valid: boolean, userId?: string, clientId?: string, redirectPath?: string } {
  // decode → recompute HMAC → check expiry → return payload or invalid
}
```

#### Create `app/(auth)/auth/magic/page.tsx`

Client-side page (not behind ProtectedRoute) that:
1. Reads `token` from URL search params
2. Calls `POST /api/auth/magic` to validate the token server-side and get the full `AuthUser` object
3. Stores the session in localStorage (same format as normal login: `mc_session`)
4. Redirects to the embedded `redirectPath` (e.g., `/clients/approvals`)

If the token is expired or invalid, shows a friendly "Link expired" message with a "Log in manually" button.

#### Create `app/api/auth/magic/route.ts`

```
POST /api/auth/magic
Body: { token: string }
```

1. `verifyMagicToken(token)` — validates HMAC signature + checks expiry
2. If invalid/expired → 401
3. Fetch the client record from Airtable by `userId` to get name, email, etc.
4. Return `AuthUser` object (same shape as normal login response)

#### Integration with Slack messages

When `lib/slack.ts` sends a message to a client, it generates the magic URL:
```ts
const deepLink = generateMagicUrl(clientUserId, clientId, '/clients/approvals')
```
This URL goes into the Slack Block Kit button. Client taps it on their phone → magic page validates → sets session → redirects to approvals page → all on one tap.

#### Env var to add:
- `MAGIC_LINK_SECRET` — random 32+ character secret for HMAC signing

---

## Phase 5 — Strategy Review Queue

> **Depends on:** Phase 1. Can be built in parallel with Phases 3 and 4.

### Create `app/(dashboard)/experiments/review-queue/page.tsx`

Page under the experiments section (strategy + management have access). This is the strategist's **primary action page** — where they spend most of their time reviewing designs before sending to clients.

### Create `components/experiments/strategy-review-queue.tsx`

Fetches experiments where `Experiment Status = "Design: Awaiting Strategy Review"`.

```ts
const filterExtra = `{Experiment Status} = "Design: Awaiting Strategy Review"`
```

#### Design Specification — Strategy Review Queue

**Page layout:**
- Standard sidebar layout (strategists use the full app)
- Header: "Design Review Queue" + subtitle "{n} designs awaiting your review"
- Grouped by client: client name as section header with a subtle divider

**Review cards — context-specific data:**

The strategist is deciding: "Is this design correct and ready for the client to see?" They need to compare the design against the original brief and test description.

**Fields shown** (maps to Airtable fields from `task-modal.tsx`):
- `Test Description` — what this experiment is testing (reminder of the hypothesis)
- `FIGMA Url` — **primary action** — "Open Design in Figma" as the most prominent element
- `Design Brief` — what the designer was told to create — strategist compares this against the Figma
- `Placement` + `Placement URL` — where this goes on the client's site (clickable)
- `Devices` — targeted devices
- `Media/Links` — any reference materials provided to the designer
- **Feedback history** — all Notes where `Note Type = "Strategy Feedback"` linked to this experiment, shown as a timeline. Critical for re-reviews so the strategist sees what they asked for last time.

**Card visual treatment:**
- Full-width cards, `max-w-3xl` on desktop (slightly wider than client cards — strategists need more context)
- White card with emerald left border accent (Strategy department color)
- **Card anatomy:**
  - Top row: Experiment name + Client name pill badge (muted bg)
  - Figma link: prominent full-width clickable row with Figma icon, "Open Design in Figma" text, external link arrow. This is THE thing the strategist clicks first.
  - Design brief: collapsible section (default expanded if short, collapsed if >150 chars) with "Show more" toggle
  - Placement + Devices + Media/Links as compact metadata rows
  - Previous feedback timeline (if experiment was previously revision-requested and came back):
    ```
    Previous feedback:
    │  Mar 1 — "CTA button needs more contrast against the hero image"
    │  Feb 28 — "Header copy doesn't match the approved test idea"
    ```
  - **Action buttons** (side-by-side on desktop, stacked on mobile):
    - **"Send to Client"**: solid emerald (`bg-emerald-600`), ArrowRight icon — transitions to `Design: Awaiting Client Approval`
    - **"Request Changes"**: outline rose, same expand-to-textarea pattern as client approvals
  - Success: toast + card slides out

**Feedback timeline (when re-reviews happen):**
```
Previous feedback:
│  Mar 1 — "CTA button needs more contrast against the hero image"
│  Feb 28 — "Header copy doesn't match the approved test idea"
```

This gives the strategist full context when a design comes back for a second or third review.

### Update navigation

**`components/dashboard/sidebar-nav.tsx`** — Add `{ label: "Review Queue", href: "/experiments/review-queue" }` to the Experiments section's `subItems`.

**`lib/section-config.ts`** — Add `/experiments/review-queue` to `experiments.routes`.

---

## Phase 6 — Management Workflow Overview

> **Depends on:** Phase 1 (transition endpoint), Phase 2 (Slack ping). The management view that ties it all together.

Management and Strategy need a dedicated page to oversee all workflow activity across all clients. This is **not** a permissions-aware version of a team page — it's a purpose-built oversight dashboard.

### Create `app/(dashboard)/management/workflow/page.tsx`

Page wrapper rendering the `WorkflowOverview` component.

### Create `components/management/workflow-overview.tsx`

**Data fetching:**
- `useAirtable('experiments', { fields: [..., 'Experiment Status', 'Batch Record ID', ...] })` — management role sees all experiments (no filter)
- `useAirtable('batches', { fields: ['Batch Name', 'Client', 'Batch Status', ...] })` — all batches
- `useAirtable('notes', { fields: ['Note Type', 'Experiments', 'Note', 'Created Time', 'Author'] })` — recent feedback notes

#### Design Specification — Management Workflow Overview

This is the **command center** for both Management and Strategy. It needs to feel powerful but not cluttered — think project management dashboard that a PM opens every morning to get a pulse on all clients.

**Role-aware behavior:**
- **Management** sees ALL clients by default (no initial filter)
- **Strategy** sees only their assigned clients by default (filtered by Strategist field matching their user record). They can override the filter to see all clients if needed.
- Both roles have the same functionality (god-mode transitions, ping, drill-down). The only difference is the default client scope.

**Page header:**
- Title: "Workflow" + subtitle: dynamic summary like "4 items need attention across 3 clients"
- Two filter controls (side-by-side, compact `SelectField` dropdowns matching existing management dashboard pattern):
  - Client filter: "All Clients" + individual client names with active/inactive status
  - Stage filter: "All Stages", "Ideas", "Design", "Development", "QA"

**Section 1 — Needs Attention (always visible at top):**
- Highlighted section with a warm amber/rose background wash (`bg-amber-50/50 border border-amber-200/50 rounded-xl p-4`)
- Header: "Needs Attention" with a count badge — `AlertTriangle` icon
- Auto-surfaces experiments that are:
  - In any "Revision Requested" status for > 48h
  - In any "Awaiting" status for > 48h (nobody has acted)
  - Linked to overdue tasks
- **Attention cards** — compact horizontal layout (not full cards, more like list rows):
  - Left: colored status dot (red for stuck >72h, amber for >48h)
  - Middle: Experiment name, Client name, assigned person, status badge, "Stuck 3 days"
  - Right: Two compact icon buttons:
    - **Ping** (`Zap` icon, amber bg) — sends Slack DM + in-app notification to the assigned person
    - **Act** (`ChevronRight` icon, neutral bg) — expands an inline action panel
  - The "Act" expansion reveals: available transition buttons + optional note textarea
  - After pinging: button briefly shows a checkmark, then tooltip "Pinged 2 min ago" to prevent spam
- If nothing needs attention: collapsed to a single line "All clear — no items need attention" with a green check

**Section 2 — Pipeline by Client:**
- Each client is a collapsible card (default: expanded for clients with active work, collapsed for idle clients)
- **Client card header:**
  - Client name (semibold) + avatar/initials circle
  - Summary pills: "2 in QA", "1 awaiting client", "3 in dev" — quick glance at distribution
  - Expand/collapse chevron
- **Inside each client card — Batches as sub-groups:**
  - Batch name + Batch Status badge (colored by phase: blue=Ideas, sky=Design, violet=Build & QA, emerald=Launch, etc.)
  - **Experiments as a compact list within each batch:**
    - Each row: status dot + experiment name + Experiment Status badge + assigned person avatar/initials
    - Clicking an experiment row expands an inline detail panel showing **context-specific data based on the experiment's current phase**:
      - **Idea phase** (`Idea: *`): Test Description, Placement, Placement URL, Devices, Media/Links
      - **Design phase** (`Design: *`): all of the above + FIGMA Url (prominent link), Design Brief
      - **Dev phase** (`Dev: *`): all of the above + Development Brief, Convert Experiment ID, Walkthrough Video URL
      - **QA phase** (`Awaiting QA`, `QA: *`): all of the above + Variants with Preview URLs (fetched from Variants table, same as task-modal.tsx QA section)
      - **Always**: Feedback history (Notes timeline filtered by this experiment's linked Notes)
      - **Always**: **All available transition buttons** (management sees everything via `getAvailableTransitions`) + optional note textarea
    - This inline expansion is the "god mode" — management can see every detail and take any action from here without navigating away

**Status badge color system** (consistent across all pages):
- `Idea: Pending` — blue-100 bg, blue-700 text
- `Idea: Approved` — emerald-100 bg, emerald-700 text
- `Idea: Rejected` — rose-100 bg, rose-700 text
- `Design: In Progress` — sky-100 bg, sky-700 text
- `Design: Awaiting Strategy Review` — amber-100 bg, amber-700 text
- `Design: Strategy Revision Requested` — rose-100 bg, rose-700 text
- `Design: Awaiting Client Approval` — amber-100 bg, amber-700 text
- `Design: Client Revision Requested` — rose-100 bg, rose-700 text
- `Design: Approved` — emerald-100 bg, emerald-700 text
- `Dev: In Progress` — violet-100 bg, violet-700 text
- `Awaiting QA` — amber-100 bg, amber-700 text
- `QA: Revision Requested` — rose-100 bg, rose-700 text
- `QA: Approved` — emerald-100 bg, emerald-700 text

Extract these into a shared `lib/experiment-status-styles.ts` so all pages use consistent colors.

**Empty/loading states:**
- Skeleton loaders for cards while data loads (not a full-page spinner)
- Empty state per client: "No active experiments" with muted text
- Empty state for page: "No experiments in progress" with an illustration

### Create `app/api/slack/ping/route.ts`

Lightweight endpoint for the "Ping" button — simpler than the transition-triggered Slack messages:

```
POST /api/slack/ping
Headers: auth headers (management/strategy only)
Body: {
  recipientId: string,     // Airtable record ID of team member
  experimentId: string,    // context — which experiment this is about
  message?: string         // optional custom message
}
```

1. Look up team member's email from Team table
2. Look up experiment name for context
3. Send Slack DM: "Reminder from {managerName}: {experimentName} needs your attention. {customMessage?}"
4. Create Notifications record so it also shows in the webapp
5. Returns success

### Update navigation

**`components/dashboard/sidebar-nav.tsx`** — Add `{ label: "Workflow", href: "/management/workflow" }` to the Management section.

**`lib/section-config.ts`** — Add `/management/workflow` to `management.routes`. The `management` section already has `permissionKeys: ['management', 'clients']` — strategy users who have the `management` permission flag will see this in their sidebar. If strategy doesn't currently have that flag, we'll need to add a route to the experiments or team section that strategy can access, or add a `strategy` permissionKey to the management section.

---

## Phase 7 — Batch Creation + Auto-Task Generation

> **Depends on:** Phase 0 (types). Independent of other phases.

When a strategist syncs test ideas and no suitable batch exists, they need to create one. Batch creation must auto-generate tasks and enforce strict date validation. These rules apply **uniformly** everywhere batch creation appears in the system.

### Create `lib/batch-validation.ts`

Centralized validation — used by every UI and API endpoint that creates batches:

```ts
export function validateBatchLaunchDate(
  launchDate: Date,
  existingBatchLaunchDates: Date[],  // all other batches for this client
  today: Date = new Date()
): { valid: boolean; error?: string }
```

**Rules:**
1. Launch Date must be **13+ business days** in the future (uses `date-fns` for business day calculation)
2. Launch Date must be **at least 28 calendar days** before or after any other batch's Launch Date for the same client

Returns `{ valid: false, error: "..." }` with a human-readable message on failure.

### Create `lib/batch-tasks.ts`

Task template + auto-generation:

```ts
interface TaskTemplate {
  name: string                     // e.g., "Design", "Development", "QA Review"
  department: string               // "Design" | "Development" | "QA" | "Strategy"
  assignmentField: string          // Client record field holding default team member
  startDateField: string           // Batch formula field for task start date
  dueDateField: string             // Batch formula field for task due date
}
```

All task dates are formula fields on the Batch derived from Launch Date. Auto-assignment reads the client's designated team members.

**Exported functions:**
- `generateTasksForBatch(batchRecord, clientRecord)` → creates all task records
- `deleteTasksForBatch(batchId)` → finds and deletes all linked tasks

### Create `app/api/batches/create/route.ts`

Dedicated POST endpoint:

```
POST /api/batches/create
Headers: auth headers (management/strategy only)
Body: { fields: { 'Launch Date': '2026-04-15', Client: ['recXXX'], ... } }
```

1. Fetch all existing batch launch dates for this client
2. `validateBatchLaunchDate()` — return 400 if invalid
3. Create batch record in Airtable
4. Re-fetch batch to get computed formula fields (task dates)
5. Fetch client record for default team member assignments
6. `generateTasksForBatch()` to create all tasks
7. Invalidate and broadcast `batches` + `tasks`
8. Return `{ batch, tasks }`

### Modify `components/experiments/sync-idea-modal.tsx`

**Current state:** Uses mock/hardcoded data, submit is a console.log stub.

**Changes:**
1. **Wire to real Airtable data** — fetch batches for the client via `useAirtable('batches')`, fetch team from client record
2. **Add "Create New Batch" option** in the batch selector dropdown:
   - Opens an inline form with a Launch Date calendar picker
   - Real-time validation: calls `validateBatchLaunchDate()` as user selects dates, shows error messages inline
   - "Create Batch" button calls `POST /api/batches/create`, then auto-selects the newly created batch
3. **Wire submit button** to actually create an Experiment record in Airtable (convert the idea) linked to the selected batch, with `Experiment Status: Idea: Pending`

### Modify `components/clients/sync-idea-modal.tsx`

Same changes as the experiments version — same validation rules, same "Create New Batch" option. Ensures uniform behavior.

### Handle batch deletion

Enhance DELETE handler in `app/api/airtable/[resource]/[id]/route.ts` for `batches` resource:
- Before deleting, call `deleteTasksForBatch(batchId)` to clean up linked tasks
- Then delete the batch itself

### Questions to resolve at build time:
- Exact list of task templates (need to inspect existing n8n workflow or Airtable)
- Exact Batch formula field names for task dates
- Exact Client field names for team member assignments
- Whether formula fields are immediately available after batch creation

---

## Phase 8 — Batch Status Sync

> **Depends on:** Phase 1. Backend enhancement, no new UI.

### Enhance `app/api/experiments/[id]/transition/route.ts`

After transitioning an experiment, check if all sibling experiments in the same batch have reached a milestone. If so, auto-advance the batch's `Batch Status`.

**Milestone mapping:**

| All Experiments At | Set Batch Status To |
|--------------------|------------------------------|
| All `Idea: Approved` | `Design` |
| All `Design: Approved` | `Build & QA` |
| All `QA: Approved` | `Launch` |

**Logic** (added at end of transition handler):
1. Read the experiment's batch ID from its linked `Batch Record ID` field
2. Fetch all sibling experiments in that batch
3. Check if all siblings have reached the milestone status
4. If yes, `updateRecord('Batches', batchId, { 'Batch Status': targetStatus })`
5. Invalidate and broadcast `batches` resource

Other Batch Status values (`Ideas: Client Review`, `Ideas: Revision Requested`, `Design: Client Review`, etc.) are set by the strategist manually or by future n8n automations — not auto-derived here.

---

## Files Summary

### New files to create:
| File | Phase | Purpose |
|------|-------|---------|
| `lib/experiment-state-machine.ts` | 0 | State machine types, transition map, validation |
| `lib/experiment-status-styles.ts` | 0 | Status badge colors + phase grouping — shared across all pages |
| `app/api/experiments/[id]/transition/route.ts` | 1 | Dedicated transition endpoint |
| `lib/slack.ts` | 2 | Slack Web API wrapper + notification config |
| `app/api/slack/notify/route.ts` | 2 | Slack notification sender |
| `lib/magic-link.ts` | 4 | Signed magic URL generation + verification |
| `app/(auth)/auth/magic/page.tsx` | 4 | Magic link landing page — validates token, sets session, redirects |
| `app/api/auth/magic/route.ts` | 4 | Server-side magic token validation endpoint |
| `app/(dashboard)/clients/approvals/page.tsx` | 4 | Client approval portal page |
| `components/clients/client-approvals.tsx` | 4 | Client approval UI component (mobile-first) |
| `app/(dashboard)/experiments/review-queue/page.tsx` | 5 | Strategy review queue page |
| `components/experiments/strategy-review-queue.tsx` | 5 | Strategy review UI component |
| `app/(dashboard)/management/workflow/page.tsx` | 6 | Management workflow overview page |
| `components/management/workflow-overview.tsx` | 6 | Management workflow overview component |
| `app/api/slack/ping/route.ts` | 6 | Slack ping/reminder endpoint for management |
| `lib/batch-validation.ts` | 7 | Batch launch date validation rules (13 biz days, 28-day gap) |
| `lib/batch-tasks.ts` | 7 | Task template definitions + auto-generation logic |
| `app/api/batches/create/route.ts` | 7 | Dedicated batch creation + auto-task generation endpoint |

### Existing files to modify:
| File | Phase | Change |
|------|-------|--------|
| `app/api/airtable/[resource]/[id]/route.ts` | 1 | Add `experiments` to team-allowed resources (line 47) |
| `components/team/task-modal.tsx` | 3 | QA submit → transition endpoint; wire Notify Strategy; wire Dev Complete → Awaiting QA; add Experiment Status to fields; show feedback notes inline; show status badges; re-enable inputs on revision |
| `components/dashboard/sidebar-nav.tsx` | 4,5,6 | Add Approvals under Client Dashboard; Review Queue under Experiments; Workflow under Management |
| `lib/section-config.ts` | 4,5,6 | Add `/clients/approvals`, `/experiments/review-queue`, `/management/workflow` to route arrays |
| `components/experiments/sync-idea-modal.tsx` | 7 | Wire to real data, add "Create New Batch" option with date validation, wire submit to create Experiment |
| `components/clients/sync-idea-modal.tsx` | 7 | Same changes as experiments version — uniform batch creation behavior |
| `app/api/airtable/[resource]/[id]/route.ts` | 7 | Add pre-delete task cleanup for `batches` resource |

### Reused existing infrastructure:
| What | File | How |
|------|------|-----|
| Airtable CRUD | `lib/airtable.ts` | `getRecord`, `updateRecord`, `createRecord`, `findRecords` |
| Auth extraction | `lib/role-filter.ts` | `extractQueryContext()` |
| Role filtering | `lib/role-filter.ts` | `buildRoleFilter()` — already scopes experiments by role |
| Cache invalidation | `lib/cache.ts` | `invalidatePattern()` |
| SSE broadcast | `lib/websocket-server.ts` | `broadcastMutation()` |
| SWR data fetching | `hooks/use-airtable.ts` | `useAirtable()` with `filterExtra` |
| Toast notifications | `sonner` | `toast.success()` / `toast.error()` |
| In-app notifications | `Notifications` table | Created via `createRecord` in transition endpoint |

---

## Verification Plan

### Per-phase checks:

**Phase 0:** `npx tsc --noEmit` — state machine compiles, all transitions type-safe

**Phase 1:** Manual curl/fetch tests against transition endpoint:
- Valid transition returns 200 + updated experiment
- Invalid transition (wrong role, wrong from-state) returns 400
- Missing required note returns 400
- QA: Approved writes `Client Approval: true` in Airtable
- Note created in Notes table with correct `Note Type` and `Experiments` link

**Phase 2:** After Slack bot token configured:
- Trigger a transition and verify Slack DM arrives with correct message and deep link
- Verify Slack failure doesn't block the transition (fire-and-forget)

**Phase 3:** Open task modal on `/team/dashboard`:
- Designer submits Figma → "Notify Strategy" button transitions to `Design: Awaiting Strategy Review`
- Dev marks complete → experiments move to `Awaiting QA`
- QA Pass → experiment shows `QA: Approved`, Client Approval = true in Airtable
- QA Fail → feedback note created, experiment shows `QA: Revision Requested`
- On revision status → feedback notes render inline, inputs re-enabled

**Phase 4:** Client approval portal + magic links:
- Generate a magic URL, open in incognito (no session) → lands on approvals page authenticated
- Expired magic URL → shows "Link expired" message with manual login link
- See experiments awaiting idea approval and design approval
- Approve → experiment advances, card disappears from list
- Reject with feedback → note created, experiment goes to revision requested
- Empty state shows when nothing to review
- **Mobile**: Open magic URL on phone-sized viewport → full-width cards, large buttons, no sidebar

**Phase 5:** Log in as strategy → navigate to `/experiments/review-queue`:
- See designs awaiting strategy review
- Approve for client → experiment advances to `Design: Awaiting Client Approval`
- Request revision → note created, experiment goes to `Design: Strategy Revision Requested`

**Phase 6:** Log in as management → navigate to `/management/workflow`:
- See all clients with their batches and experiments grouped
- Client filter works — scopes everything to one client
- "Needs Attention" surfaces experiments stuck > 48h in revision/awaiting status
- "Ping" button sends Slack DM + creates in-app notification
- "Take Action" shows all available transitions — management can trigger any of them
- Management can approve on behalf of client, pass QA on behalf of QA, etc.

**Phase 7:** Create a batch via `/api/batches/create`:
- Tasks are auto-generated for all departments
- Tasks are auto-assigned to the client's designated team members
- Task start/due dates come from the batch's formula fields
- Deleting the batch also deletes all linked tasks

**Phase 8:** Transition last experiment in a batch to `QA: Approved`:
- Verify batch `Batch Status` auto-advances to `Launch`
