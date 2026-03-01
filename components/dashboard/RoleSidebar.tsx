'use client'

/**
 * RoleSidebar — role-aware sidebar navigation.
 *
 * Renders nav items based on the authenticated user's role from UserContext.
 * Falls back to a skeleton while the user session is loading.
 * Visually identical to the existing SidebarNav but driven by NAV_CONFIG.
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
import { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { NAV_CONFIG } from '@/lib/permissions'
import type { NavSection } from '@/lib/permissions'

// ─── Icon map (lucide icon name → component) ──────────────────────────────────
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
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
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  if (isLoading || !user) {
    return <SidebarSkeleton />
  }

  const navSections: NavSection[] = NAV_CONFIG[user.role] ?? []

  const initialOpenSections = navSections
    .filter((s) => s.subItems?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href)))
    .map((s) => s.label)

  const [openSections, setOpenSections] = useState<string[]>(
    initialOpenSections.length > 0 ? initialOpenSections : []
  )

  function toggleSection(label: string) {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    )
  }

  function handleCollapsedMenuClick(section: NavSection) {
    if (section.subItems && section.subItems.length > 0) {
      setCollapsed(false)
      router.push(section.subItems[0].href)
    } else if (section.href) {
      router.push(section.href)
    }
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
            const isOpen = openSections.includes(section.label)
            const hasSubItems = section.subItems && section.subItems.length > 0
            const isTopLevelActive = !hasSubItems && section.href === pathname

            if (!hasSubItems && section.href) {
              return (
                <button
                  key={section.label}
                  onClick={() => router.push(section.href!)}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
                    collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                    isTopLevelActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                  title={collapsed ? section.label : undefined}
                >
                  <NavIcon name={section.icon} className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{section.label}</span>}
                </button>
              )
            }

            return (
              <div key={section.label}>
                <button
                  onClick={() => {
                    if (collapsed) {
                      handleCollapsedMenuClick(section)
                    } else if (hasSubItems) {
                      toggleSection(section.label)
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
                    collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2 justify-between',
                    'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                  title={collapsed ? section.label : undefined}
                >
                  <span className="flex items-center gap-2.5">
                    <NavIcon name={section.icon} className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{section.label}</span>}
                  </span>
                  {!collapsed && hasSubItems && (
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  )}
                </button>

                {!collapsed && hasSubItems && isOpen && (
                  <div className="ml-[22px] border-l border-border pl-2.5 mt-0.5 mb-1 flex flex-col gap-0.5">
                    {section.subItems!.map((sub) => (
                      <button
                        key={sub.label}
                        onClick={() => router.push(sub.href)}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                          pathname === sub.href
                            ? 'text-foreground font-medium bg-accent'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
