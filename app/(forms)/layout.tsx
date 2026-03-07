'use client'

/**
 * Forms layout — lightweight wrapper for hosted forms.
 *
 * No sidebar or dashboard header. Just auth-checking and a clean shell.
 * If unauthenticated, redirects to /login?redirect=<current-url> so the
 * user returns here after signing in.
 */

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import Image from 'next/image'

function FormsLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      // Build the full current URL (path + query) for smart redirect
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`)
    }
  }, [isLoading, isAuthenticated, pathname, searchParams, router])

  // Show loading spinner while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="MoreConversions"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <div className="h-5 w-5 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return <FormsLayoutInner>{children}</FormsLayoutInner>
}
