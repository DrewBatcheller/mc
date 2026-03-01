'use client'

import { RoleSidebar } from "@/components/dashboard/RoleSidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardContentWrapper } from "@/components/dashboard/dashboard-content-wrapper"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen">
        <RoleSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-hidden min-h-0">
            <DashboardContentWrapper>{children}</DashboardContentWrapper>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
