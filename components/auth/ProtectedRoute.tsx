'use client'

/**
 * ProtectedRoute — wraps page content and enforces auth + role-based access.
 *
 * - While session is loading: shows a full-screen skeleton shimmer
 * - If not authenticated: redirects to /login
 * - If authenticated but unauthorized for this route: redirects to role default
 * - Otherwise: renders children
 *
 * Usage (in dashboard layout):
 *   <ProtectedRoute>{children}</ProtectedRoute>
 *
 * Usage (for specific role restriction):
 *   <ProtectedRoute requiredRole="management">{children}</ProtectedRoute>
 */

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { canAccessRoute, DEFAULT_ROUTE } from '@/lib/permissions'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useUser()
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
      router.replace(DEFAULT_ROUTE[user.role])
      return
    }

    // Check route-level access
    if (!canAccessRoute(user.role, pathname)) {
      router.replace(DEFAULT_ROUTE[user.role])
    }
  }, [isLoading, isAuthenticated, user, router, pathname, requiredRole])

  // Show nothing while checking auth (layout skeleton handles this)
  if (isLoading) return null

  // Not authenticated — redirect is in progress
  if (!isAuthenticated) return null

  // Wrong role — redirect is in progress
  if (requiredRole && user?.role !== requiredRole) return null

  // Unauthorized route — redirect is in progress
  if (user && !canAccessRoute(user.role, pathname)) return null

  return <>{children}</>
}
