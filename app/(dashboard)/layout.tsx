'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardContentWrapper } from "@/components/dashboard/dashboard-content-wrapper"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-hidden min-h-0">
          <DashboardContentWrapper>{children}</DashboardContentWrapper>
        </main>
      </div>
    </div>
  )
}
