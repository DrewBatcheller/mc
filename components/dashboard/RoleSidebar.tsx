'use client'

/**
 * RoleSidebar — dynamic, permission-driven sidebar navigation with expandable sections.
 *
 * Renders sections from SECTION_DEFINITIONS, filtered by user's Airtable permissions.
 * Each section can be expanded to show its sub-routes.
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
  Lightbulb,
  Zap,
  BarChart2,
} from 'lucide-react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@/contexts/UserContext'
import { usePermissions } from '@/hooks/use-permissions'

// ─── Route label overrides (slug → display name) ─────────────────────────────
const ROUTE_LABEL_OVERRIDES: Record<string, string> = {
  'pnl': 'P&L',
}

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
  Lightbulb,
  Zap,
  BarChart2,
}

// ─── Client route icons (flat sidebar for clients) ────────────────────────────
const CLIENT_ROUTE_ICONS: Record<string, string> = {
  '/clients/dashboard': 'LayoutDashboard',
  '/clients/test-ideas': 'Lightbulb',
  '/clients/experiments-overview': 'FlaskConical',
  '/clients/live-tests': 'Zap',
  '/clients/results': 'BarChart2',
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
  
  // Initialize collapsed state from localStorage
  const [collapsed, setCollapsed] = useState<boolean | null>(null)
  const [openSections, setOpenSections] = useState<string[] | null>(null)

  // Hydrate state from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    setCollapsed(savedCollapsed ? JSON.parse(savedCollapsed) : false)
    
    const savedOpenSections = localStorage.getItem('sidebar-open-sections')
    setOpenSections(savedOpenSections ? JSON.parse(savedOpenSections) : [])
  }, [])

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (collapsed !== null) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed))
    }
  }, [collapsed])

  // Persist open sections to localStorage
  useEffect(() => {
    if (openSections !== null) {
      localStorage.setItem('sidebar-open-sections', JSON.stringify(openSections))
    }
  }, [openSections])

  // Auto-expand sections that contain the current route
  const initialOpenSections = useMemo(() => {
    return accessibleSections
      .filter(section => section.routes.some(route => pathname.startsWith(route)))
      .map(section => section.id)
  }, [accessibleSections, pathname])

  // Update openSections if current route is in a new section
  useEffect(() => {
    if (openSections === null) return
    const currentSectionIds = initialOpenSections
    const missingSection = currentSectionIds.find(id => !openSections.includes(id))
    if (missingSection) {
      setOpenSections(prev => [...new Set([...(prev ?? []), ...currentSectionIds])])
    }
  }, [pathname, accessibleSections, initialOpenSections, openSections])

  if (isLoading || !user || collapsed === null || openSections === null) {
    return <SidebarSkeleton />
  }

  function toggleSection(sectionId: string) {
    setOpenSections((prev) => {
      if (!prev) return [sectionId]
      return prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId]
    })
  }

  function handleCollapsedSectionClick(section: typeof accessibleSections[0]) {
    // When collapsed, expand the sidebar and navigate to first route
    setCollapsed(false)
    router.push(section.routes[0])
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
        <div className="flex flex-col py-2 px-2.5 gap-0.5">
          {/* Client navigation: flat list of 5 items */}
          {user?.role === 'client' && accessibleSections.find(s => s.isFlat) ? (
            <>
              {accessibleSections
                .flatMap(section => section.routes)
                .map((route) => {
                  const slug = route.split('/').filter(Boolean).pop() ?? ''
                  const label = ROUTE_LABEL_OVERRIDES[slug] ?? slug
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')

                  const iconName = CLIENT_ROUTE_ICONS[route] || 'LayoutDashboard'
                  const isActive = pathname === route
                  
                  return (
                    <button
                      key={route}
                      onClick={() => router.push(route)}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
                        collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                        isActive
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                      )}
                      title={collapsed ? label : undefined}
                    >
                      <NavIcon name={iconName} className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{label}</span>}
                    </button>
                  )
                })}
            </>
          ) : (
            <>
              {/* Dashboard link - always visible except for clients */}
              <button
                onClick={() => router.push('/')}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                  pathname === '/'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
                title={collapsed ? 'Dashboard' : undefined}
              >
                <NavIcon name="LayoutDashboard" className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Dashboard</span>}
              </button>

              {/* Permission-based sections - exclude Team section for team members */}
              {accessibleSections
                .filter(section => !(user?.role === 'team' && section.id === 'team'))
                .map((section) => {
                const isOpen = openSections.includes(section.id)
                const hasMultipleRoutes = section.routes.length > 1
                const isActive = section.routes.some(route => pathname.startsWith(route))

                if (!hasMultipleRoutes) {
                  // Single-route sections are just buttons
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        if (collapsed) {
                          handleCollapsedSectionClick(section)
                        } else {
                          router.push(section.routes[0])
                        }
                      }}
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
                }

                // Multi-route sections are expandable
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => {
                        if (collapsed) {
                          handleCollapsedSectionClick(section)
                        } else {
                          toggleSection(section.id)
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
                        collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2 justify-between',
                        isActive && !collapsed
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                      )}
                      title={collapsed ? section.label : undefined}
                    >
                      <span className="flex items-center gap-2.5">
                        <NavIcon name={section.icon} className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{section.label}</span>}
                      </span>
                      {!collapsed && (
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                            isOpen && 'rotate-180'
                          )}
                        />
                      )}
                    </button>

                    {!collapsed && isOpen && (
                      <div className="ml-[22px] border-l border-border pl-2.5 mt-0.5 mb-1 flex flex-col gap-0.5">
                        {section.routes.slice(1).map((route) => {
                          const routeSlug = route.split('/').filter(Boolean).pop() ?? ''
                          const routeLabel = ROUTE_LABEL_OVERRIDES[routeSlug] ?? routeSlug
                            .split('-')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                          
                          return (
                            <button
                              key={route}
                              onClick={() => router.push(route)}
                              className={cn(
                                'w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                                pathname === route
                                  ? 'text-foreground font-medium bg-accent'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                              )}
                            >
                              {routeLabel}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
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
