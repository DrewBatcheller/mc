'use client'

/**
 * ProtectedRoute — enforces auth + permission-based access using dynamic Airtable permissions.
 *
 * - While loading: shows nothing (layout skeleton handles this)
 * - If not authenticated: redirects to /login
 * - If authenticated but unauthorized for this route: redirects to default route
 * - Otherwise: renders children
 *
 * Permissions are fetched from Airtable and checked against current route.
 */

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { usePermissions } from '@/hooks/use-permissions'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

// Default fallback routes per role (used if no permissions available)
const FALLBACK_ROUTES: Record<UserRole, string> = {
  management: '/',
  strategy: '/experiments/dashboard',
  sales: '/sales/overview',
  team: '/team/dashboard',
  client: '/clients/client-dashboard',
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useUser()
  const { canAccess } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (!user) return

    // Check specific role requirement
    if (requiredRole && user.role !== requiredRole) {
      router.replace(FALLBACK_ROUTES[user.role])
      return
    }

    // Check route-level access using dynamic permissions
    if (!canAccess(pathname)) {
      router.replace(FALLBACK_ROUTES[user.role])
    }
  }, [isLoading, isAuthenticated, user, router, pathname, requiredRole, canAccess])

  if (isLoading) return null
  if (!isAuthenticated) return null
  if (requiredRole && user?.role !== requiredRole) return null
  if (user && !canAccess(pathname)) return null

  return <>{children}</>
}
