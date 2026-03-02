# Phase 4: useAirtableMutation Integration Guide

## Overview
All CRUD components need to be updated to use the `useAirtableMutation` hook with optimistic updates and real-time sync. This guide provides the pattern to follow.

## Components to Update (11 total)

1. `components/team/team-directory.tsx` - Team member CRUD
2. `components/affiliates/affiliates-directory.tsx` - Affiliate CRUD
3. `components/sales/lead-details-modal.tsx` - Lead updates
4. `components/team/task-submission-modal.tsx` - Task creation
5. `components/experiments/ideas-table.tsx` - Experiment ideas CRUD
6. `components/finance/expenses-detail-table.tsx` - Expense CRUD
7. `components/finance/dividend-table.tsx` - Dividend CRUD
8. `components/clients/client-ideas-table.tsx` - Client ideas CRUD
9. `components/clients/client-directory.tsx` - Client CRUD
10. `components/finance/reserve-ledger-table.tsx` - Reserve ledger CRUD
11. `components/finance/revenue-details-table.tsx` - Revenue CRUD

## Integration Pattern

### 1. Import hooks at top of component
```typescript
import { useAirtableMutation } from '@/hooks/use-airtable-mutation'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'
import useSWR from 'swr'
```

### 2. Setup data fetching and mutation
```typescript
export function MyComponent() {
  // Data fetching
  const { data, mutate: revalidate } = useSWR('resource', fetcher)
  
  // Mutation hook with optimistic updates
  const { mutate: submitMutation, isLoading, error } = useAirtableMutation(
    'resource',
    {
      onMutate: async (body) => {
        // Optimistically update cache
        const previousData = data
        const optimisticData = { ...data, ...body.fields }
        revalidate(optimisticData, false)
        return { previousData }
      },
      onSuccess: (response) => {
        // Update with actual server response
        revalidate(response.record, false)
      },
      onError: (error, context) => {
        // Rollback on error
        if (context?.previousData) {
          revalidate(context.previousData, false)
        }
        // Show error toast
        toast.error(error.message)
      }
    }
  )

  // Real-time sync hook
  const { isConnected } = useRealtimeSync({
    resource: 'resource',
    onMutate: () => revalidate() // Refresh when other users mutate
  })

  return (
    <div>
      {/* Show connection status */}
      <div className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
        {isConnected ? 'Synced' : 'Offline'}
      </div>
      
      {/* Form or editor */}
      <form onSubmit={async (e) => {
        e.preventDefault()
        try {
          await submitMutation({ fields: formData }, recordId)
          toast.success('Saved successfully')
        } catch (err) {
          // Error already handled by onError callback
        }
      }}>
        {/* Form fields */}
        <button disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}
```

### 3. Key patterns per operation type

#### Create
```typescript
await submitMutation({ fields: newRecord })
```

#### Update
```typescript
await submitMutation({ fields: updatedFields }, recordId)
```

#### Delete
```typescript
// For DELETE, you may need to add to API or use PATCH to set a status
await submitMutation({ fields: { Status: 'Deleted' } }, recordId)
```

## Implementation Order (by priority/complexity)

1. **team-directory.tsx** - Simplest, most critical for team management
2. **revenue-details-table.tsx** - Financial data, important
3. **expenses-detail-table.tsx** - Financial data, important
4. **client-directory.tsx** - Core business data
5. **lead-details-modal.tsx** - Sales operations
6. **experiments/ideas-table.tsx** - Growth operations
7. Other components in any order

## Notes

- Always wrap in try/catch when calling submitMutation
- onMutate runs before the request - use it for optimistic updates
- onSuccess runs after successful response
- onError runs on failure - use it for rollback and error messages
- useRealtimeSync automatically listens for other users' changes
- Connection status is available via isConnected

## Testing Checklist

- [ ] Create/Update/Delete works
- [ ] Optimistic update shows immediately
- [ ] Error rollback restores previous state
- [ ] Loading state shows during request
- [ ] Real-time sync refreshes when other users mutate
- [ ] Offline mode gracefully degrades
