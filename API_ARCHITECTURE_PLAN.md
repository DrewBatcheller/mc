# Permission-Sensitive API: Base Architecture Implementation Plan

## Clarifications Needed

Before I write the code, I need one piece of info:

**Environment Variables:**
- `AIRTABLE_BASE_ID` — What is your Airtable base ID?
- `AIRTABLE_API_KEY` — What is your API token?
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — Do you have an Upstash account set up, or should I account for optional Redis (no-op if not configured)?

---

## Implementation Plan (No Implementation Yet)

### Phase 1: Authentication Layer (Session + localStorage)
**Files to create:**
- `lib/auth.ts` — Auth utility functions
  - `login(email, password)` → searches Team + Clients tables, returns `{ role, id, teamId?, clientId? }`
  - `getCurrentUser()` → reads localStorage, returns user object or null
  - `logout()` → clears localStorage
  - Role logic: Team members check `Department` column to determine role (Manager/Strategist = "management", else = "team")

**Temporary approach** (you clarified):
- No server-side session cookies yet
- Auth data stored in localStorage as `{ user: {...}, timestamp: ... }`
- This is **not production-safe** — will be replaced with HttpOnly cookies + server middleware later
- For now, all role-checking happens client-side using this localStorage user object

---

### Phase 2: Role-Based Route Protection
**Files to create:**
- `middleware.ts` — Next.js middleware (reads localStorage indirectly via page wrapper)
- `components/auth/ProtectedRoute.tsx` — Client-side wrapper that checks role and redirects
- `components/dashboard/RoleSidebar.tsx` — Renders different sidebar based on role (replaces static sidebar-nav)

**Route Structure:**
- Management: sees full `(dashboard)` group (current structure)
- Team: sees simplified `(dashboard)/team/*` with directory hidden
- Client: redirected to new `(client)` route group with clean URLs

---

### Phase 3: API Route Architecture
**Base utilities (created once, used everywhere):**
- `lib/airtable.ts` — Core Airtable API wrapper (fetch, create, update with error handling)
- `lib/cache.ts` — Redis cache wrapper with `getOrSet()`, `invalidatePattern()`
- `lib/role-filter.ts` — Functions to filter Airtable queries by role
  - `filterByRole(role, clientId?, teamMemberId?)` → returns Airtable formula string
  - Example: Team member → `AND({AssignedTo} = "recXXX")` in task queries
  - Example: Client → `AND({Client} = "recXXX")` in experiment queries

**API route pattern (all routes follow this):**
```
/api/airtable/[resource]
├── GET — fetch with role-based filtering
├── POST or PATCH — create/update with cache invalidation
```

Each route:
1. Extracts role from request (either localStorage-based header or middleware injection)
2. Calls role filter utility to build safe Airtable formula
3. Checks Redis cache with role-specific key
4. On miss: fetches from Airtable with formula
5. Caches result + invalidates related patterns on mutation
6. Returns `{ records: [...] }`

---

### Phase 4: Server Components + Suspense Structure
**Per-page updates** (repeatable pattern):
- Convert `page.tsx` to async Server Component
- Call API routes server-side with role header
- Wrap sections in `<Suspense>` boundaries
- Create `loading.tsx` with skeleton matching page layout
- Create `error.tsx` for graceful fallback

Example flow:
```
(dashboard)/sales/overview/page.tsx
  ├── Layout renders synchronously (no API call)
  ├── Sidebar renders (static, based on role)
  ├── <Suspense fallback={<LoadingSkeleton />}>
  │   └── await fetch('/api/airtable/leads') with role header
  │   └── render LeadsTable
  ├── <Suspense fallback={<ChartSkeleton />}>
  │   └── await fetch('/api/airtable/revenue') with role header
  │   └── render RevenueChart
```

---

### Phase 5: WebSocket + SWR Integration (Lower Priority for Now)
- For now: ignore WebSocket entirely, use SWR polling with `revalidateOnFocus`
- Later: add WebSocket for invalidation broadcasts
- Each SWR hook passes role context so it fetches role-appropriate data

---

## Sequencing

**Week 1: Foundation**
1. Create `lib/auth.ts`, `lib/airtable.ts`, `lib/cache.ts`
2. Create `lib/role-filter.ts` with role-to-formula mapping
3. Create `ProtectedRoute.tsx` and `RoleSidebar.tsx`
4. Create `/api/auth/login`, `/api/auth/logout` routes

**Week 2: First Pilot Page**
1. Pick one page (e.g., `/sales/leads`)
2. Create `/api/airtable/leads` GET route with role filtering
3. Convert `page.tsx` to Server Component + Suspense
4. Add `loading.tsx` + `error.tsx`
5. Verify data flows correctly per role

**Week 3+: Roll Out Pattern**
- Apply same pattern to other pages (each ~30 min)
- Add mutations (POST/PATCH routes) as needed
- Add WebSocket when ready

---

## Key Design Decisions

1. **Role filtering at API level** — Query includes Airtable formula, database returns pre-filtered data
2. **No browser-side filtering** — localStorage never contains unauthorized records
3. **Cache key includes role context** — Client 1's cache key `leads:client:rec123` is separate from Client 2's `leads:client:rec456`
4. **Suspense per section** — One slow API doesn't block page shell from rendering
5. **Temporary localStorage auth** — Easily replaced with server session cookies + middleware later

---

## Ready to Proceed?

Once you provide the environment variables, I'll implement:
1. Core utilities (auth, airtable, cache, role-filter)
2. ProtectedRoute + RoleSidebar
3. Login/logout routes
4. Pilot page with full Suspense + loading UX
