'use client'

/**
 * RoleSidebar — dynamic, permission-driven sidebar navigation.
 *
 * Fetches user permissions from Airtable (stored in UserContext).
 * Dynamically renders only the sections the user has access to.
 * No hardcoded NAV_CONFIG — fully Airtable-driven.
 */

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Target,
  UserCircle,
  Handshake,
  KanbanSquare,
} from 'lucide-react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useUser } from '@/contexts/UserContext'
import { usePermissions } from '@/hooks/use-permissions'
import { SECTION_DEFINITIONS } from '@/lib/section-config'
import type { DynamicNavItem } from '@/lib/permission-types'

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  FlaskConical,
  DollarSign,
  Target,
  UserCircle,
  Handshake,
  KanbanSquare,
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard
  return <Icon className={className} />
}

function SidebarSkeleton() {
  return (
    <aside className="hidden lg:flex flex-col border-r border-border bg-card h-screen sticky top-0 w-[252px]">
      <div className="flex items-center h-[60px] border-b border-border px-4">
        <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
        <div className="ml-2.5 h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
      <nav className="flex-1 flex flex-col py-2 px-2.5 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />
        ))}
      </nav>
    </aside>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RoleSidebar() {
  const { user, isLoading } = useUser()
  const { accessibleSections } = usePermissions()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  if (isLoading || !user) {
    return <SidebarSkeleton />
  }

  // Build dynamic nav sections from accessible permissions
  const navSections = useMemo<DynamicNavItem[]>(() => {
    return accessibleSections.map(section => ({
      icon: section.icon,
      label: section.label,
      href: section.routes[0],  // Primary route
    }))
  }, [accessibleSections])

  const initialOpenSections = navSections
    .filter((s) => pathname.startsWith(s.href || '/'))
    .map((s) => s.label)

  const [openSections, setOpenSections] = useState<string[]>(
    initialOpenSections.length > 0 ? initialOpenSections : []
  )

  function toggleSection(label: string) {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    )
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-card h-screen sticky top-0 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[252px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-[60px] border-b border-border px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.png"
              alt="MoreConversions logo"
              width={28}
              height={28}
              className="rounded-lg"
              loading="eager"
            />
            <span className="text-sm font-semibold text-foreground tracking-tight">
              MoreConversions
            </span>
          </div>
        )}
        {collapsed && (
          <Image
            src="/images/logo.png"
            alt="MoreConversions logo"
            width={28}
            height={28}
            className="rounded-lg"
            loading="eager"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            collapsed && 'hidden'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col py-2 px-2.5">
          {navSections.map((section) => {
            const isActive = pathname.startsWith(section.href || '/')

            return (
              <button
                key={section.label}
                onClick={() => router.push(section.href || '/')}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
                title={collapsed ? section.label : undefined}
              >
                <NavIcon name={section.icon} className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{section.label}</span>}
              </button>
            )
          })}
        </div>

        {/* Expand button when collapsed */}
        <div className="flex flex-col gap-0.5 py-2 px-2.5">
          <button
            onClick={() => setCollapsed(false)}
            className={cn(
              'flex items-center justify-center px-2 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors',
              !collapsed && 'hidden'
            )}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </nav>
    </aside>
  )
}
