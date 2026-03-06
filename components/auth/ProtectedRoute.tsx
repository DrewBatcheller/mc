'use client'

/**
 * ProtectedRoute — enforces auth + basic role checks.
 *
 * - While loading: shows nothing
 * - If not authenticated: redirects to /login
 * - If role required but user doesn't match: redirects to role's default route
 * - Otherwise: renders children (detailed permissions enforced elsewhere)
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

const FALLBACK_ROUTES: Record<UserRole, string> = {
  management: '/',
  strategy: '/experiments/dashboard',
  sales: '/sales/overview',
  team: '/team',
  client: '/clients/client-dashboard',
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useUser()
  const router = useRouter()
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      if (!redirectedRef.current) {
        redirectedRef.current = true
        router.replace('/login')
      }
      return
    }

    if (requiredRole && user?.role !== requiredRole) {
      if (!redirectedRef.current) {
        redirectedRef.current = true
        router.replace(FALLBACK_ROUTES[user.role])
      }
    }
  }, [isLoading, isAuthenticated, user, router, requiredRole])

  if (isLoading) return null
  if (!isAuthenticated) return null
  if (requiredRole && user?.role !== requiredRole) return null

  return <>{children}</>
}
