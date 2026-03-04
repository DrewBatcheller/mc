'use client'

import { usePathname } from "next/navigation"
import { Suspense } from "react"
import { PageSkeleton, DirectorySkeleton } from "@/components/shared/skeleton"

// Content wrapper with Suspense boundaries for loading states
export function DashboardContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDirectoryPage = pathname.includes('directory') || pathname === '/affiliates'
  const LoadingComponent = isDirectoryPage ? DirectorySkeleton : PageSkeleton

  return isDirectoryPage ? (
    <div className="w-full h-full overflow-hidden">
      <Suspense fallback={<LoadingComponent />}>
        {children}
      </Suspense>
    </div>
  ) : (
    <div className="w-full h-full px-4 md:px-6 py-6 overflow-y-auto min-h-0">
      <div className="w-full flex flex-col gap-6">
        <Suspense fallback={<LoadingComponent />}>
          {children}
        </Suspense>
      </div>
    </div>
  )
}
