"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { useRouter, usePathname } from "next/navigation"
import type { UserRole } from "@/lib/v2/types"

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  teamRecordId?: string
  clientRecordId?: string
  clientName?: string
  avatar?: string
  department?: string
}

interface UserContextType {
  currentUser: AppUser | null
  isLoading: boolean
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const COOKIE_NAME = "mc_session"

function readSessionCookie(): AppUser | null {
  if (typeof document === "undefined") return null
  
  // Check sessionStorage for user data (persists across page navigations within same session)
  // Automatically clears when browser closes - good for security
  const sessionUserData = sessionStorage.getItem("__mc_user")
  if (sessionUserData) {
    try {
      return JSON.parse(sessionUserData) as AppUser
    } catch (e) {
      console.error(`[v0] UserProvider: failed to parse session user`, e)
    }
  }
  
  // Fallback: try to read from HTTP-only cookie (won't work in client-side JS but kept for completeness)
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  if (!match) return null
  try {
    return JSON.parse(atob(decodeURIComponent(match[1]))) as AppUser
  } catch {
    return null
  }
}

function clearSessionCookie() {
  // Clear HTTP-only cookie
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
  // Clear all session storage
  sessionStorage.removeItem("__mc_user")
  sessionStorage.removeItem("__mc_pending_user")
  sessionStorage.removeItem("__mc_pending_token")
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const user = readSessionCookie()
    setCurrentUser(user)
    setIsLoading(false)
  }, [])

  // Auto-login for development if enabled
  useEffect(() => {
    if (mounted && !isLoading && !currentUser && pathname !== "/login") {
      // DEV_AUTO_LOGIN: Set to "true" to automatically log in as jayden@moreconversions.com
      const devAutoLogin = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true"
      
      if (devAutoLogin) {
        console.log("[v0] DEV MODE: Auto-logging in as jayden@moreconversions.com")
        performDevAutoLogin()
      } else {
        router.push("/login")
      }
    }
  }, [mounted, isLoading, currentUser, pathname, router])

  const performDevAutoLogin = async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: "jayden@moreconversions.com", 
          password: "password" 
        }),
      })

      const data = await res.json()
      if (res.ok && data.sessionToken && data.user) {
        sessionStorage.setItem("__mc_user", JSON.stringify(data.user))
        sessionStorage.setItem("__mc_pending_token", data.sessionToken)
        setCurrentUser(data.user)
      } else {
        console.error("[v0] DEV AUTO LOGIN FAILED:", data.error)
        router.push("/login")
      }
    } catch (error) {
      console.error("[v0] DEV AUTO LOGIN ERROR:", error)
      router.push("/login")
    }
  }

  const logout = () => {
    clearSessionCookie()
    setCurrentUser(null)
    router.push("/login")
  }

  return (
    <UserContext.Provider value={{ currentUser, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

export const useUserContext = useUser
