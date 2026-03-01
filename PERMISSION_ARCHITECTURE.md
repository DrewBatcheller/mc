# Permission-Based Access Control Architecture Plan

## Executive Summary

This plan outlines how to restructure the application to support 4 distinct user roles (Client, Team Member, Project Manager, Founder) with role-specific visibility, UI behavior, and data access patterns. The approach prioritizes architecture design now, with actual gating logic implemented after auth is connected.

---

## Part 1: Data Architecture & Schema

### Current State
- **Clients Table**: Company-level records (Brand Name, Email, Password, etc.)
- **Team Table**: Employee records (Full Name, Email, Password, Department, etc.)
- **Contacts Table**: Individual contacts per Client (User Email, Brand Name lookup, User Type field)

### Key Relationships
- Clients → multiple Contacts (1:N)
- Team Members → multiple Client assignments (N:N) via `Dev Client Link`, `Design Client Link`, `Strategist Client Link`, `QA Client Link`
- All data entities (Experiments, Batches, Tasks, etc.) have `client_id` lookups

### Role Identification Logic (Pre-Auth)

```
IF login email found in Clients.Email → Role = "Client"
  Set client_id = Client.Brand Name (or Record ID)

IF login email found in Team.Email → Determine role:
  IF Team.Department = "Management" → Role = "Project Manager"
  IF Team is flagged as "Founder" (needs flag) → Role = "Founder"
  ELSE → Role = "Team Member"
```

### Permission Structure CSV

Create `/lib/permissions.csv` with the following structure:

| Role | CanView_Dashboard | CanView_Experiments | CanView_Finances | CanView_Affiliates | CanViewOthersData | CanViewTeamPages | DefaultPage | SidebarItems |
|------|---|---|---|---|---|---|---|---|
| Client | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | /client-dashboard | Dashboard, Experiments, Batches, Results |
| Team Member | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ (own only) | /team-member-dashboard | Team Dashboard, Schedule, Tasks, My Experiments |
| Project Manager | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | / | Dashboard, Experiments, Team, Clients, Schedule, Tasks |
| Founder | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | / | Dashboard, Experiments, Team, Clients, Schedule, Tasks, Finances, Affiliates |

---

## Part 2: Component Restructuring Strategy

### 2.1 Context-Aware Components

Components that should behave differently based on role:

#### Client Dashboard Pages
- **`/client-dashboard`** - Clients see personal view, PM/Founders see with client dropdown
- **`/client-dashboard/experiments`** - Same pattern
- **`/client-dashboard/batches`** - Same pattern
- **`/client-dashboard/results`** - Same pattern

#### Team Pages  
- **`/team-member-dashboard`** - Team members see own data only, PM/Founders see with team member dropdown
- **`/team/schedule`** - Same pattern
- **`/team/tasks`** - Same pattern

#### PM/Founder Pages
- **`/dashboard`** - Full system overview (redirects Team Members & Clients)
- **`/finances`** - Founder only (redirects others)
- **`/affiliates`** - Founder only (redirects others)

### 2.2 Component Modification Pattern

**Example: ClientDashboard component**

```tsx
// BEFORE: No role awareness
<ClientDashboard clientId={clientId} />

// AFTER: Role-aware rendering
<ClientDashboard 
  role={userRole}
  clientId={role === 'Client' ? userClientId : selectedClientId}
  onClientChange={role !== 'Client' ? setSelectedClientId : undefined}
  showClientDropdown={role !== 'Client'}
/>
```

All components with "context view" behavior should:
1. Accept `role` prop
2. Accept `selectedEntityId` (client/team member ID being viewed)
3. Accept `onEntityChange` callback
4. Conditionally render filter dropdown/selector based on role
5. Conditionally show/hide edit controls based on role

---

## Part 3: Data Access Layer

### 3.1 API Filtering Architecture

Every API endpoint that returns entity data should accept and filter by role:

```typescript
// /api/experiments
// Expects: ?role=team-member&userId=xyz OR ?role=pm&clientId=abc
// Returns: filtered experiments only user can access

// /api/team-member-dashboard  
// Team Members: GET ?role=team-member&userId=xyz → own data only
// PM/Founder: GET ?role=pm OR GET ?role=founder → all team data
```

### 3.2 Data Filtering Rules (API Level)

| Page | Role | Filter Applied |
|------|------|---|
| Client Dashboard | Client | WHERE client_id = userClientId |
| Client Dashboard | PM/Founder | WHERE client_id = selectedClientId (from query/state) |
| Team Dashboard | Team Member | WHERE team_member_id = userId |
| Team Dashboard | PM/Founder | WHERE team_member_id = selectedTeamMemberId (from query/state) |
| Experiments | Team Member | WHERE client_id IN (userAssignedClients) |
| Finances | Team Member/PM | 403 Forbidden |
| Finances | Founder | No filter, return all |

---

## Part 4: Sidebar & Navigation

### 4.1 Sidebar Structure

Parse `SidebarItems` from permissions CSV and build navigation dynamically:

```typescript
const navItems = getNavItemsForRole(userRole);
// Client: [Dashboard, Experiments, Batches, Results]
// Team Member: [Team Dashboard, Schedule, Tasks, My Experiments]
// PM: [Dashboard, Experiments, Team, Clients, Schedule, Tasks]
// Founder: [Dashboard, Experiments, Team, Clients, Schedule, Tasks, Finances, Affiliates]
```

### 4.2 URL Protection

- Client trying to access `/team-member-dashboard` → redirect to `/client-dashboard`
- Team Member trying to access `/` (PM dashboard) → redirect to `/team-member-dashboard`
- Team Member trying to access `/finances` → redirect to home
- Non-Founder trying to access `/finances` → 403 or redirect

---

## Part 5: Entity Selection UI

### 5.1 Dropdown Placement (Consistent)

All "view-as" dropdowns should appear in the **page header**, above the main content:

```tsx
<div className="flex items-center justify-between px-6 py-4 border-b">
  <h1>Experiments</h1>
  {showDropdown && (
    <ClientSelector 
      selectedClientId={selectedClient}
      onSelect={setSelectedClient}
    />
  )}
</div>
```

### 5.2 Dropdown Behavior

- **Clients**: No dropdown, ever
- **Team Members**: No dropdown, ever
- **PM/Founder on Client pages**: Dropdown shows list of Clients (paginated if many)
- **PM/Founder on Team pages**: Dropdown shows list of Team Members
- **Founder on Finances**: No dropdown (single system view)

---

## Part 6: Account Settings Modal

### Implementation

Replace "Account Settings" dropdown item with "Account Details" that opens a modal:

```tsx
interface AccountDetailsModalProps {
  role: 'client' | 'team-member' | 'project-manager' | 'founder'
  userId: string
}

// Client sees: Company name, primary contact info, payment plan
// Team Member sees: Name, department, email, assigned clients (read-only)
// PM/Founder sees: Full employee info + management controls
```

---

## Part 7: Implementation Phases

### Phase 1: Architecture & Permissions (Now)
- [ ] Create `/lib/permissions.csv` with 4 roles × 7+ permission types
- [ ] Create permission utility: `getPermissions(role)`, `canUserAccessPage(role, page)`
- [ ] Create type definitions: `UserRole`, `Permission`, `UserContext`
- [ ] Add "Founder" flag to Team table schema (if needed)
- [ ] Document role identification logic in `/lib/auth/roleDetection.ts` (pseudocode)

### Phase 2: Component Preparation (After Auth API)
- [ ] Wrap app in `<UserContext>` provider to expose `{role, userId, clientId}`
- [ ] Refactor Client Dashboard to accept `showClientDropdown` prop
- [ ] Refactor Team Dashboard to accept `showTeamMemberDropdown` prop
- [ ] Refactor Experiments page for role-aware rendering
- [ ] Update Sidebar to use `getNavItemsForRole()`
- [ ] Create "Account Details" modal component

### Phase 3: API Integration (After Auth API)
- [ ] Update all data-fetching endpoints to include `role` + `userId`/`clientId` in query params
- [ ] Add role-based filtering in backend (or client-side if API doesn't support)
- [ ] Add route guards to redirect users to appropriate home page
- [ ] Test data isolation (Team Member can't see other Team Member's data)

### Phase 4: Polish & Security
- [ ] Add unit tests for `getPermissions()` and filtering logic
- [ ] Test each role's full user flow (login → dashboard → navigation → attempt unauthorized access)
- [ ] Security audit: ensure no data leaks via API

---

## Part 8: Pseudocode Examples

### Example 1: Conditional Rendering in Client Dashboard

```tsx
export function ClientDashboard({ role, clientId, selectedClientId, onClientChange }) {
  const displayClientId = role === 'Client' ? clientId : selectedClientId;
  
  return (
    <>
      <div className="flex justify-between items-center">
        <h1>Client Dashboard</h1>
        {role !== 'Client' && (
          <ClientSelector 
            value={selectedClientId} 
            onChange={onClientChange}
          />
        )}
      </div>
      <ExperimentsGrid clientId={displayClientId} />
    </>
  );
}
```

### Example 2: API Query with Role

```typescript
async function getExperiments(role: UserRole, userId: string, clientId?: string) {
  const params = new URLSearchParams();
  params.append('role', role);
  
  if (role === 'client') {
    params.append('clientId', clientId);
  } else if (role === 'team-member') {
    params.append('userId', userId);
  } else if (role === 'founder') {
    // no filter, return all
  }
  
  const res = await fetch(`/api/experiments?${params}`);
  return res.json();
}
```

### Example 3: Route Guard

```typescript
// In layout or middleware
const publicPages = ['/login'];
const clientPages = ['/client-dashboard', '/client-dashboard/*'];
const teamPages = ['/team-member-dashboard', '/team/*'];
const pmPages = ['/dashboard', '/experiments', '/team', '/clients'];
const founderPages = [...pmPages, '/finances', '/affiliates'];

function getAccessiblePages(role: UserRole): string[] {
  switch(role) {
    case 'client': return [...publicPages, ...clientPages];
    case 'team-member': return [...publicPages, ...teamPages];
    case 'project-manager': return [...publicPages, ...pmPages];
    case 'founder': return [...publicPages, ...founderPages];
  }
}

// In middleware: redirect if page not in getAccessiblePages(userRole)
```

---

## Summary

**Now (Pre-Auth):**
- Design permission matrix in CSV
- Create role detection logic (pseudocode)
- Identify all components needing "context view" modification
- Prepare TypeScript types

**After Auth Connected:**
- Implement UserContext provider
- Refactor components to accept role-aware props
- Add entity selection dropdowns (Client/Team Member selector)
- Update API layer to filter by role
- Add route protection
- Test full user flows per role

This approach ensures clean separation between design and implementation, allowing you to make architectural decisions now without building throwaway code.
