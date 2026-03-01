# Complete API Documentation

This document provides comprehensive API specifications for rebuilding the system from scratch. All table schemas, field relationships, and data structures are defined in the Airtable reference you have. This focuses on the backend API architecture, WebSocket/Redis implementations, and page-level data flows.

---

## Architecture Overview

### Stack
- **Frontend**: Next.js with React hooks (use-airtable.ts custom hooks)
- **Backend**: Next.js API routes (/app/api/airtable/*)
- **Database**: Airtable with 16 linked tables
- **Caching**: Redis (Upstash)
- **Real-time**: WebSocket server (pattern-based subscriptions)
- **Authentication**: Session-based with role-based access control (RBAC)

### Request/Response Flow
1. Client hook (SWR) sends request to API route
2. API route validates session from headers or cookies
3. API route checks Redis cache (pattern: `table-name:filter1:filter2`)
4. Cache miss → Fetch from Airtable API
5. Cache the result + broadcast WebSocket invalidation
6. Return standardized response: `{ records: AirtableRecord<T>[] }`

---

## Redis Caching Layer

### Configuration
```
Provider: Upstash Redis (serverless)
Environment Variables:
  - KV_REST_API_URL: Redis endpoint
  - KV_REST_API_TOKEN: Authentication token
TTL Values:
  - SHORT: 2 minutes (frequently changing data)
  - MEDIUM: 5 minutes (default)
  - LONG: 30 minutes (stable data)
```

### Cache Key Patterns
```
Format: {table-name}:{filter1}:{filter2}...

Examples:
  - "leads:all" - all leads
  - "leads:status:contacted" - leads by status
  - "clients:all" - all clients
  - "experiments:client:rec123:status:successful" - filtered experiments
  - "batches:client:rec123" - batches for specific client
```

### Cache Operations
```typescript
// Get from cache
getCachedData<T>(key: string): Promise<T | null>

// Set in cache with TTL
setCachedData<T>(key: string, data: T, ttlSeconds?: number): Promise<void>

// Invalidate single key
invalidateCacheKey(key: string): Promise<void>

// Invalidate pattern (e.g., "leads:*" clears all leads cache)
invalidateCachePattern(pattern: string): Promise<void>

// Clear all cache
clearAllCache(): Promise<void>

// Check remaining TTL
getRemainingTTL(key: string): Promise<number>
```

### Cache Invalidation Strategy
- When updating/creating records → invalidate related cache patterns
- Example: Update experiment → invalidate "experiments:*", "batches:*"
- WebSocket broadcasts invalidation to all connected clients
- Clients refetch data when notified of cache invalidation

---

## WebSocket Implementation

### Server-Side (websocket-server.ts)
```typescript
class WebSocketServer {
  // Register client connection
  registerClient(ws: WebSocket, userId: string, role: string): string
    Returns: clientId (unique identifier)
    
  // Handle client messages
  - "subscribe": { patterns: string[] }
  - "unsubscribe": { patterns: string[] }
  - "ping": { } (server responds with "pong")
  
  // Broadcast invalidation to subscribed clients
  broadcast(invalidationPattern: string, data?: any)
    Pattern matching: supports wildcards ("leads:*")
    Sends: { type: "cache-invalidated", pattern, timestamp, data }
    
  // Get connection stats
  getStats(): { totalClients, clientsByRole }
}
```

### Client-Side Hook (use-websocket.ts)
```typescript
useWebSocket(
  onCacheInvalidated?: (pattern: string) => void,
  subscribePatterns?: string[]
)

Returns: {
  isConnected: boolean
  subscribe(patterns: string[]): void
  unsubscribe(patterns: string[]): void
}

Note: WebSocket is not fully functional in next-lite runtime.
Falls back to SWR polling for real-time updates.
```

### WebSocket Message Flow
1. Client establishes WebSocket connection to `/api/websocket`
2. Server authenticates via session
3. Client subscribes to cache invalidation patterns
4. When data updates → API route broadcasts invalidation
5. Server sends `cache-invalidated` message to subscribed clients
6. Client triggers SWR revalidation for affected patterns

---

## Airtable API Integration

### Base Configuration
```
AIRTABLE_BASE_ID: from environment variables
AIRTABLE_API_KEY: from environment variables
API URL: https://api.airtable.com/v0/{BASE_ID}

Tables (16 total):
- Clients
- Contacts
- Team
- Experiments
- Batches
- Experiment Ideas
- Tasks
- Variants
- Leads
- Call Record
- Revenue
- Expenses
- Profit & Loss
- Dividends Paid
- Reserve
- Permissions
```

### Core Airtable Functions (airtable.ts)

#### fetchTable<T>(tableName: string, options?: FetchOptions)
```
Purpose: Fetch multiple records with filtering
Handles pagination automatically (Airtable limit: 100 records/request)

Options:
  - view?: string (Airtable view name)
  - filterByFormula?: string (Airtable formula syntax)
  - sort?: Array<{ field, direction }> (asc/desc)
  - maxRecords?: number
  - fields?: string[] (only fetch specific fields)
  - pageSize?: number (records per request)

Returns: AirtableRecord<T>[]

Example:
  fetchTable<ExperimentFields>(TABLES.EXPERIMENTS, {
    filterByFormula: `AND({Test Status} = "Successful", {Client} = "recXXX")`,
    sort: [{ field: "Launch Date", direction: "desc" }],
    maxRecords: 1000
  })
```

#### fetchRecord<T>(tableName: string, recordId: string)
```
Purpose: Fetch single record by ID
Cache: 30 seconds

Returns: AirtableRecord<T>

Example:
  fetchRecord<ClientFields>(TABLES.CLIENTS, "recXXX")
```

#### createRecord<T>(tableName: string, fields: Partial<T>)
```
Purpose: Create new record
Cache invalidation: Clears related cache patterns

Request body: { fields: { field1: value1, field2: value2 } }
Returns: AirtableRecord<T> (with new record ID)

Important: Linked record fields must contain array of record IDs
Example:
  createRecord<ExperimentFields>(TABLES.EXPERIMENTS, {
    "Test Description": "New experiment",
    Batch: ["recXXX"], // Array of batch IDs
    "Brand Name": ["recYYY"] // Array of client IDs
  })
```

#### updateRecord<T>(tableName: string, recordId: string, fields: Partial<T>)
```
Purpose: Update existing record
Cache invalidation: Clears related cache patterns

Returns: AirtableRecord<T> (updated record)

Important: Cannot update computed/read-only fields
Computed fields throw 422 error if attempted

Example:
  updateRecord<ExperimentFields>(TABLES.EXPERIMENTS, "recXXX", {
    "Test Status": "Successful",
    "Revenue Added (MRR) (Regular Format)": 25000
  })
```

---

## API Routes Documentation

### Authentication Routes

#### POST /api/auth/login
```
Purpose: Authenticate user and create session
Body: { email: string, password: string }

Returns: {
  id: string,
  name: string,
  email: string,
  role: "management" | "strategy" | "team" | "client",
  teamRecordId?: string,
  clientRecordId?: string (for client role)
}

Session storage: HTTP-only cookie
```

#### POST /api/auth/logout
```
Purpose: Destroy session
Returns: { success: true }
```

#### GET /api/auth/me
```
Purpose: Get current user session
Returns: Same as login response, or { error: "Unauthorized" }
```

---

### Clients API

#### GET /api/airtable/clients
```
Purpose: Fetch clients based on role/filters
Cache key: clients:all | clients:status:{status} | clients:client:{clientId}

Query parameters:
  - status?: string (Client Status field value)

Session requirements:
  - If role="client": returns only own record
  - Otherwise: returns based on filters

Response: { records: AirtableRecord<ClientFields>[] }

Example:
  GET /api/airtable/clients?status=active
```

#### PATCH /api/airtable/clients/update
```
Purpose: Update client record
Body: {
  recordId: string,
  fields: Partial<ClientFields>
}

Cache invalidation: clients:*, experiments:*
WebSocket broadcast: clients:invalidated

Returns: { success: true, record: AirtableRecord<ClientFields> }
```

---

### Experiments API

#### GET /api/airtable/experiments
```
Purpose: Fetch experiments with filtering and role-based access
Cache key: experiments:all | experiments:client:{clientId}:status:{status}

Query parameters:
  - clientId?: string
  - status?: string (Test Status field)
  - batchId?: string

Filter logic (client-side):
  - For client users: only their own experiments
  - For team users: filtered by clientId if provided
  - Status filters using Airtable formula

Response: { records: AirtableRecord<ExperimentFields>[] }

Important: Launch Date field is normalized to YYYY-MM-DD format

Example:
  GET /api/airtable/experiments?clientId=recXXX&status=Successful
```

#### POST /api/airtable/experiments/create
```
Purpose: Create new experiment
Body: {
  fields: {
    "Test Description": string,
    Batch: string[] (array of batch record IDs),
    "Brand Name": string[] (array of client IDs)
    ... other fields
  }
}

Linked record relationships:
  - Batch (many-to-one to Batches table)
  - Brand Name (many-to-one to Clients table)
  - Strategist/Designer/Developer/QA (to Team table)

Cache invalidation: experiments:*, batches:*

Returns: { success: true, record: AirtableRecord<ExperimentFields> }
```

#### PATCH /api/airtable/experiments/[id]
```
Purpose: Update experiment by record ID
Body: { fields: Partial<ExperimentFields> }

Cache invalidation: experiments:*, batches:*

Returns: { success: true, record: AirtableRecord<ExperimentFields> }

Important: Filters out read-only fields (Created By, Created Date, etc.)
```

#### POST /api/airtable/experiments/[id]/desync
```
Purpose: Detach experiment from batch
Body: { recordId: string }

Used when: Test Ideas are being separated from a batch

Cache invalidation: experiments:*, batches:*

Returns: { success: true }
```

---

### Batches API

#### GET /api/airtable/batches
```
Purpose: Fetch batches filtered by client
Cache key: batches:all | batches:client:{clientId}

Query parameters:
  - clientId?: string
  - status?: string

Filter logic:
  - Batches.Client field must match clientId
  - Linked to Clients table via Client field

Response: { records: AirtableRecord<BatchFields>[] }

Example:
  GET /api/airtable/batches?clientId=recXXX
```

---

### Experiment Ideas API

#### GET /api/airtable/experiment-ideas
```
Purpose: Fetch test ideas for client
Cache key: experiment-ideas:all | experiment-ideas:client:{clientId}

Query parameters:
  - clientId?: string (filter by Client field)

Response: { records: AirtableRecord<ExperimentIdeaFields>[] }
```

#### POST /api/airtable/experiment-ideas/create
```
Purpose: Create new experiment idea
Body: { fields: Partial<ExperimentIdeaFields> }

Linked fields:
  - Client: string[] (array of client record IDs)
  - Created By: set automatically (team member)

Cache invalidation: experiment-ideas:*

Returns: { success: true, record: AirtableRecord<ExperimentIdeaFields> }
```

#### PATCH /api/airtable/experiment-ideas/[id]
```
Purpose: Update experiment idea
Body: { fields: Partial<ExperimentIdeaFields> }

Cache invalidation: experiment-ideas:*

Returns: { success: true, record: AirtableRecord<ExperimentIdeaFields> }
```

---

### Variants API

#### GET /api/airtable/variants
```
Purpose: Fetch variants for experiments or batches
Cache key: variants:all | variants:experiment:{experimentId}

Query parameters:
  - experimentId?: string
  - batchRecordId?: string

Response: { records: AirtableRecord<VariantFields>[] }

Note: Variants linked to Experiments (many-to-many)
```

---

### Leads API

#### GET /api/airtable/leads
```
Purpose: Fetch leads for sales pipeline
Cache key: leads:all | leads:status:{status}

Query parameters:
  - status?: string (Lead Status field)

Response: { records: AirtableRecord<LeadFields>[] }
```

#### POST /api/airtable/leads/create
```
Purpose: Create new lead
Body: { fields: Partial<LeadFields> }

Cache invalidation: leads:*

Returns: { success: true, record: AirtableRecord<LeadFields> }
```

#### PATCH /api/airtable/leads/[id]
```
Purpose: Update lead
Body: { fields: Partial<LeadFields> }

Cache invalidation: leads:*

Returns: { success: true, record: AirtableRecord<LeadFields> }
```

#### POST /api/airtable/leads/[id]/sync-to-client
```
Purpose: Convert lead to client
Body: { recordId: string }

Creates new Client record from Lead data
Linked fields: Link to Client field in Leads table

Cache invalidation: leads:*, clients:*

Returns: { success: true, clientRecord: AirtableRecord<ClientFields> }
```

---

### Tasks API

#### GET /api/airtable/tasks
```
Purpose: Fetch tasks with optional filtering
Cache key: tasks:all | tasks:client:{clientId}:status:{status}

Query parameters:
  - clientId?: string
  - status?: string (Status field)
  - department?: string

Linked fields used for filtering:
  - Client (to Clients table)
  - Batch (to Batches table)

Response: { records: AirtableRecord<TaskFields>[] }

Date normalization: Start Date, End Date
```

---

### Team API

#### GET /api/airtable/team
```
Purpose: Fetch team members
Cache key: team:all
Response: { records: AirtableRecord<TeamFields>[] }
```

#### PATCH /api/airtable/team/update
```
Purpose: Update team member
Body: { recordId: string, fields: Partial<TeamFields> }

Cache invalidation: team:*

Returns: { success: true, record: AirtableRecord<TeamFields> }
```

---

### Contacts API

#### GET /api/airtable/contacts
```
Purpose: Fetch contacts for client(s)
Cache key: contacts:all | contacts:client:{clientId}

Query parameters:
  - clientId?: string (filter by linked Client)
  - contactIds?: string (comma-separated contact record IDs)

Response: { records: AirtableRecord<ContactFields>[] }
```

#### POST /api/airtable/contacts/create
```
Purpose: Create new contact
Body: { fields: Partial<ContactFields> }

Linked fields:
  - Brand Name: string[] (array of client record IDs)

Cache invalidation: contacts:*

Returns: { success: true, record: AirtableRecord<ContactFields> }
```

#### PATCH /api/airtable/contacts/update
```
Purpose: Update contact
Body: { recordId: string, fields: Partial<ContactFields> }

Cache invalidation: contacts:*

Returns: { success: true, record: AirtableRecord<ContactFields> }
```

---

### Financial APIs

#### GET /api/airtable/revenue
```
Purpose: Fetch revenue records
Cache key: revenue:all
Response: { records: AirtableRecord<RevenueFields>[] }

Fields contain monthly aggregates:
  - "Monthly Recurring Revenue"
  - "Upsell Revenue"
  - Date, Category, Amount USD, Amount CAD
```

#### GET /api/airtable/expenses
```
Purpose: Fetch expenses
Cache key: expenses:all
Response: { records: AirtableRecord<ExpenseFields>[] }

Linked to Profit & Loss table via "Profit & Loss" field
```

#### GET /api/airtable/pnl
```
Purpose: Fetch Profit & Loss records
Cache key: pnl:all
Response: { records: AirtableRecord<PLFields>[] }

Monthly snapshots with calculated margins
```

#### GET /api/airtable/dividends
```
Purpose: Fetch dividend distribution records
Cache key: dividends:all
Response: { records: AirtableRecord<DividendFields>[] }

Tracks dividend allocation per team member
```

#### GET /api/airtable/reserves
```
Purpose: Fetch account reserves/allocations
Cache key: reserves:all
Response: { records: AirtableRecord<ReserveFields>[] }

Categories: Operations, Growth, Reserves, etc.
```

---

### Utility APIs

#### GET /api/airtable/call-records
```
Purpose: Fetch Fathom call recordings linked to clients
Cache key: call-records:all | call-records:client:{clientId}

Query parameters:
  - clientId?: string

Response: { records: AirtableRecord<CallRecordFields>[] }

Date normalization: Event Start Time
```

#### GET /api/airtable/permissions
```
Purpose: Fetch role-based permissions
Returns: { records: AirtableRecord<PermissionFields>[] }

Permissions structure:
{
  Role: "Management" | "Strategy" | "Team" | "Client",
  Finances: boolean,
  Sales: boolean,
  Experiments: boolean,
  "Experiments Limited": boolean,
  Clients: boolean,
  Team: boolean,
  "Team Limited": boolean
}
```

#### GET /api/cache/clear
```
Purpose: Clear all Redis cache (admin only)
Cache invalidation: All patterns
WebSocket broadcast: Full cache invalidation
Returns: { success: true }
```

#### POST /api/upload
```
Purpose: Upload file to Vercel Blob storage
Body: FormData with file
Returns: { url: string, downloadUrl: string, size: number }

Used for: Profile photos, test images, media attachments
```

---

## Page-Level Data Flows

### Authentication Flow
**Pages**: /login
- POST /api/auth/login (no auth required)
- Sets HTTP-only session cookie
- Redirects to dashboard on success

---

### Clients Section (/clients)
**Pages**: /clients, /clients/directory, /clients/dashboard

**Data Loading**:
1. Load from GET /api/airtable/clients
2. Cache key: "clients:all"
3. Subscribe to WebSocket: "clients:*"

**Mutations**:
- Update client: PATCH /api/airtable/clients/update
- Invalidates: clients:*, experiments:*, batches:*, tasks:*

**Related Data**:
- Experiments: GET /api/airtable/experiments?clientId={clientId}
- Tasks: GET /api/airtable/tasks?clientId={clientId}
- Batches: GET /api/airtable/batches?clientId={clientId}
- Contacts: GET /api/airtable/contacts?clientId={clientId}

---

### Experiments Section (/experiments)

#### /experiments/dashboard
**Data Loading**:
- GET /api/airtable/experiments (all completed tests)
- GET /api/airtable/batches (all batches)
- Aggregate stats (successful, total MRR, ROI)

#### /experiments/ideas
**Data Loading**:
- GET /api/airtable/experiment-ideas

**Mutations**:
- Create idea: POST /api/airtable/experiment-ideas/create
- Update idea: PATCH /api/airtable/experiment-ideas/[id]

#### /experiments/live-tests
**Data Loading**:
- GET /api/airtable/experiments?status=Running
- GET /api/airtable/variants

**Real-time Updates**:
- Subscribe to "experiments:*" for live status changes
- Subscribe to "variants:*" for metric updates

#### /experiments/results
**Data Loading**:
1. GET /api/airtable/clients (filter by client selection)
2. GET /api/airtable/batches (filter where Client={selectedClient})
3. GET /api/airtable/experiments (filter where Batch={selectedBatches})

**Calculations** (performed client-side):
- Total MRR Increase: Sum of "Revenue Added (MRR) (Regular Format)" for successful tests
- Avg MRR Per Success: Total MRR / Successful count
- ROI (12-Month): (Cumulative MRR - Annual Spend) / Annual Spend * 100
- Cumulative MRR Trend: Month-by-month cumulative sum

**Filters**:
- Client dropdown (all or specific)
- Batch multi-select (filters experiments by Batch IDs)

---

### Sales Section (/sales)

#### /sales/leads
**Data Loading**:
- GET /api/airtable/leads
- Cache key: "leads:all"

**Mutations**:
- Create lead: POST /api/airtable/leads/create
- Update lead: PATCH /api/airtable/leads/[id]
- Convert to client: POST /api/airtable/leads/[id]/sync-to-client

#### /sales/tasks
**Data Loading**:
- GET /api/airtable/tasks
- Cache key: "tasks:all"

**Filtering**:
- By client
- By status
- By department

---

### Schedule Section (/schedule)

#### /schedule/calendar
**Data Loading**:
- GET /api/airtable/tasks (all tasks with dates)
- GET /api/airtable/batches (batch dates)

**Date Fields Used**:
- Tasks: Start Date, Due Date
- Batches: Launch Date, PTA Due Date

#### /schedule/kanban
**Data Loading**:
- GET /api/airtable/tasks?status={status}
- Organizes by: Department, Status, Assigned To

**Drag-and-drop**:
- Updates task status/department via PATCH /api/airtable/tasks/[id]

---

### Team Section (/team)

#### /team/directory
**Data Loading**:
- GET /api/airtable/team
- Cache key: "team:all"

#### /team/[id]
**Data Loading**:
- Single team member profile
- Team experiments (Developer/Strategist/Designer/QA fields)
- Team expenses

---

### Finances Section (/finances)

#### /finances/overview
**Data Loading**:
- GET /api/airtable/revenue
- GET /api/airtable/expenses
- Calculates: Total MRR, Total Revenue, Monthly average

#### /finances/pnl
**Data Loading**:
- GET /api/airtable/pnl
- Monthly P&L snapshots with margins

#### /finances/dividends
**Data Loading**:
- GET /api/airtable/dividends
- Tracks dividend distribution per person

#### /finances/reserves
**Data Loading**:
- GET /api/airtable/reserves
- Shows account allocations by category

---

## Session & Authorization

### Session Management
```typescript
// Session object structure
{
  id: string (user record ID from Team table),
  name: string,
  email: string,
  role: "management" | "strategy" | "team" | "client",
  teamRecordId?: string (from Team table),
  clientRecordId?: string (if role="client")
}

// Session retrieval
getSessionFromRequest(request): Session | null
// Checks: HTTP-only cookie → X-User-Id header
```

### Role-Based Access Control (RBAC)
```
Roles: Management, Strategy, Team, Client

Permissions (from Permissions table):
- Finances: view/edit financial data
- Sales: view/edit leads and tasks
- Experiments: view/edit tests (full or limited)
- Clients: view/edit client records
- Team: view/edit team (full or limited)

Client Role: Automatic filtering
- Only see own client record
- Only see own experiments/tasks
- API filters automatically
```

### Header-Based Session (Client-Side)
```
When client-side hook calls API:
  x-user-id: user ID
  x-user-name: user name
  x-user-email: email
  x-user-role: role
  x-client-record-id: (if client role)

Used as fallback when server-side session unavailable
```

---

## Error Handling

### Standard Error Responses
```typescript
// 401 Unauthorized
{ error: "Unauthorized" } - status 401

// 400 Bad Request
{ error: "Client record ID not found" } - status 400

// 422 Unprocessable Entity
{ error: "Field X cannot accept a value because the field is computed" }
- status 422 (Airtable validation error)

// 500 Server Error
{ error: "Airtable API error: {status} - {details}" } - status 500
```

### Cache Failures
- Falls back to empty array on Redis error
- Returns cached data if available
- Logs error to console but doesn't break request

### Airtable API Timeout
- 15-second timeout for all Airtable requests
- Returns empty records on timeout
- Cache miss handled gracefully

---

## Data Relationships & Lookups

### Linked Records (Key Relationships)

**Clients → Experiments**
- Clients.{Experiments} ← Experiments.{Brand Name}
- Filter experiments: Find client record ID in Brand Name field

**Batches → Experiments**
- Batches.{Experiments Attached} ← Experiments.{Batch}
- One batch contains multiple experiments

**Clients → Batches**
- Clients.{Batches} ← Batches.{Client}
- Filter batches by Client field

**Experiments → Variants**
- Experiments.{Variants (Link)} ← Variants.{Experiments}
- One experiment can have multiple variants

**Team Members → Assignments**
- Experiments: Strategist, Designer, Developer, QA fields
- Tasks: Assigned to field
- Team record IDs in array fields

**Clients → Contacts**
- Clients.{Contacts} ← Contacts.{Brand Name}

**Leads → Clients**
- Leads.{Link to Client} after sync-to-client operation

---

## Performance Optimization

### Caching Strategy
1. **Redis first**: Always check cache before Airtable
2. **TTL-based expiry**: SHORT/MEDIUM/LONG based on data volatility
3. **Pattern invalidation**: Batch-update multiple related keys
4. **WebSocket notifications**: Clients subscribe to patterns and revalidate when invalidated

### API Rate Limiting
- Airtable: 5 requests/second soft limit
- Pagination handled automatically (100 records/request)
- Large batches processed server-side

### Frontend Optimization
- SWR deduplication: 5-second window (same request not duplicated)
- Local cache layer: In-memory fallback before Redis
- Revalidation on focus disabled (prevent unnecessary requests)
- Socket subscribe/unsubscribe pattern-based (not single record)

---

## Additional Notes

### Computed Fields (Read-Only in Airtable)
These fields cannot be updated via API; throw 422 error if attempted:
- Created By, Created Date
- Last Modified By, Last Modified Date
- ID (lookup fields)
- Rollup/Summary fields marked as computed

### Date Field Handling
- Airtable dates stored as strings: "YYYY-MM-DD"
- Frontend normalizes via normalizeAirtableDateField()
- Launch Date, PTA Due Date, Start Date, End Date, Event Start Time

### Array Fields (Linked Records)
- Always arrays of record IDs: `["recXXX", "recYYY"]`
- When creating: Must include linked record IDs
- When viewing: Both ID array AND lookup field show values

### File/Image Attachments
- Stored in Airtable as attachment arrays
- Upload endpoint: POST /api/upload → Vercel Blob
- Images returned with thumbnails (small, large)

---

## Implementation Checklist for Rebuilding

✓ Database: Connect to Airtable with API key
✓ Redis: Set up Upstash Redis instance
✓ Auth: Implement session + role-based access control
✓ Core utilities: airtable.ts (fetchTable, fetchRecord, createRecord, updateRecord)
✓ Cache layer: redis-cache.ts with TTL + pattern invalidation
✓ WebSocket: Simple pub-sub for cache invalidation patterns
✓ API routes: Build routes following pattern in /app/api/airtable/*
✓ Hooks: Create SWR-based hooks in hooks/v2/use-airtable.ts
✓ Pages: Follow data flow patterns for each section
✓ Error handling: Consistent 401/422/500 responses with fallbacks
✓ Real-time: WebSocket subscribe on component mount, revalidate on invalidation
