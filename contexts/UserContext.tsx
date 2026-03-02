'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { AuthUser } from '@/lib/types'
import { getCurrentUser, logout as authLogout } from '@/lib/auth'
import { useRouter } from 'next/navigation'

// ─── Context shape ────────────────────────────────────────────────────────────
interface UserContextValue {
  user: AuthUser | null
  isLoading: boolean       // true while reading from localStorage on mount
  isAuthenticated: boolean
  logout: () => void
  refreshUser: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function UserContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const readSession = useCallback(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setIsLoading(false)
  }, [])

  // Fetch permissions after user is loaded
  useEffect(() => {
    readSession()
  }, [readSession])

  useEffect(() => {
    if (!user || user.permissions) return // Skip if no user or permissions already loaded

    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/auth/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department: user.department,
            role: user.role,
          }),
        })

        if (response.ok) {
          const { permissions } = await response.json()
          setUser(prev => prev ? { ...prev, permissions } : null)
        }
      } catch (err) {
        console.error('[UserContext] Failed to fetch permissions:', err)
      }
    }

    fetchPermissions()
  }, [user?.id])  // Only run when user changes

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        logout,
        refreshUser: readSession,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser must be used inside <UserContextProvider>')
  }
  return ctx
}

// ─── Typed hook shortcuts ─────────────────────────────────────────────────────
export function useAuthUser(): AuthUser {
  const { user } = useUser()
  if (!user) throw new Error('useAuthUser called while not authenticated')
  return user
}
