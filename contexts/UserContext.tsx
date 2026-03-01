'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { AuthUser } from '@/lib/types'
import { getCurrentUser, logout as authLogout } from '@/lib/auth'
import { DEFAULT_ROUTE } from '@/lib/permissions'
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

  useEffect(() => {
    readSession()
  }, [readSession])

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
