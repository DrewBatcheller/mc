/**
 * usePermissions — get the current user's permissions and utility functions.
 * Requires UserContext to be set up.
 */

'use client'

import { useMemo } from 'react'
import { useAuthUser } from '@/contexts/UserContext'
import { canAccessRoute, getAccessibleSections } from '@/lib/section-config'
import type { UserPermissions } from '@/lib/permission-types'
import type { SectionDefinition } from '@/lib/permission-types'

export function usePermissions() {
  const user = useAuthUser()
  
  const permissions = useMemo<UserPermissions>(() => {
    return user.permissions ?? {
      finances: false,
      sales: false,
      experiments: false,
      clients: false,
      clientDashboard: false,
      management: false,
      team: false,
      affiliates: false,
    }
  }, [user.permissions])

  const accessibleSections = useMemo<SectionDefinition[]>(() => {
    return getAccessibleSections(permissions)
  }, [permissions])

  const hasPermission = useMemo(() => {
    return (permission: keyof UserPermissions): boolean => {
      return permissions[permission] ?? false
    }
  }, [permissions])

  const canAccess = useMemo(() => {
    return (route: string): boolean => {
      return canAccessRoute(route, permissions)
    }
  }, [permissions])

  return {
    permissions,
    hasPermission,
    canAccess,
    accessibleSections,
  }
}
