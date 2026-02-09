"use client"

import React from "react"
import { Sidebar } from "@/components/v2/sidebar"
import { useUser } from "@/contexts/v2/user-context"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { currentUser, isLoading } = useUser()

  // Login page has no shell
  if (pathname === "/login") {
    return <>{children}</>
  }

  // User not yet loaded - show small loader while fetching user
  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Not logged in -- the UserProvider will redirect to /login
  if (!currentUser) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Redirecting to login...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4">{children}</main>
    </div>
  )
}
