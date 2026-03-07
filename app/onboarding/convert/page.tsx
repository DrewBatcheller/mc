"use client"

/**
 * Legacy redirect: /onboarding/convert → /forms/convert-lead
 *
 * This form has been moved to the hosted forms system.
 * Preserves all query parameters for backward compatibility.
 */

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

function RedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = searchParams.toString()
    const newUrl = `/forms/convert-lead${params ? `?${params}` : ""}`
    router.replace(newUrl)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="flex items-center gap-2 text-[13px] text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting…
      </div>
    </div>
  )
}

export default function ConvertLeadLegacyRedirect() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
        </div>
      }
    >
      <RedirectInner />
    </Suspense>
  )
}
