"use client"

import { Bell, Menu, X, LayoutDashboard, FlaskConical, Users, KanbanSquare, UserCircle, DollarSign, Target, Handshake, Clock, Settings, LogOut, CheckCircle2, Lightbulb, Zap, BarChart2, Archive } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { useState, useRef, useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { MobileNav } from "./mobile-nav"
import { AccountSettingsModal } from "./account-settings-modal"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Breadcrumb navigation map
const breadcrumbMap: Record<
  string,
  { label: string; icon: typeof LayoutDashboard; href: string }[]
> = {
  "/": [{ label: "Dashboard", icon: LayoutDashboard, href: "/" }],
  "/experiments": [
    { label: "Experiments", icon: FlaskConical, href: "/experiments/dashboard" },
  ],
  "/experiments/dashboard": [
    { label: "Experiments", icon: FlaskConical, href: "/experiments/dashboard" },
    { label: "Dashboard", icon: LayoutDashboard, href: "/experiments/dashboard" },
  ],
  "/experiments/ideas": [
    { label: "Experiments", icon: FlaskConical, href: "/experiments/dashboard" },
    { label: "Ideas", icon: Clock, href: "/experiments/ideas" },
  ],
  "/experiments/live-tests": [
    { label: "Experiments", icon: FlaskConical, href: "/experiments/dashboard" },
    { label: "Live Tests", icon: FlaskConical, href: "/experiments/live-tests" },
  ],
  "/experiments/results": [
    { label: "Experiments", icon: FlaskConical, href: "/experiments/dashboard" },
    { label: "Results", icon: FlaskConical, href: "/experiments/results" },
  ],
  "/experiments/timeline": [
    { label: "Experiments", icon: FlaskConical, href: "/experiments/dashboard" },
    { label: "Timeline", icon: Clock, href: "/experiments/timeline" },
  ],
  "/experiments/client-tracker": [
    { label: "Experiments", icon: FlaskConical, href: "/experiments/dashboard" },
    { label: "Client Tracker", icon: Users, href: "/experiments/client-tracker" },
  ],
  "/clients/dashboard": [
    { label: "Dashboard", icon: LayoutDashboard, href: "/clients/dashboard" },
  ],
  "/management/client-directory": [
    { label: "Management", icon: UserCircle, href: "/management/client-directory" },
    { label: "Client Directory", icon: Users, href: "/management/client-directory" },
  ],
  "/management/client-dashboard": [
    { label: "Management", icon: UserCircle, href: "/management/client-dashboard" },
    { label: "Client Dashboard", icon: KanbanSquare, href: "/management/client-dashboard" },
  ],
  "/clients/test-ideas": [
    { label: "Test Ideas", icon: Lightbulb, href: "/clients/test-ideas" },
  ],
  "/clients/experiments-overview": [
    { label: "Experiments Overview", icon: FlaskConical, href: "/clients/experiments-overview" },
  ],
  "/clients/live-tests": [
    { label: "Live Tests", icon: Zap, href: "/clients/live-tests" },
  ],
  "/clients/results": [
    { label: "Results", icon: BarChart2, href: "/clients/results" },
  ],
  "/clients/client-ideas": [
    { label: "Clients", icon: Users, href: "/clients/dashboard" },
    { label: "Ideas", icon: Clock, href: "/clients/client-ideas" },
  ],
  "/clients/client-dashboard": [
    { label: "Client Dashboard", icon: KanbanSquare, href: "/clients/client-dashboard" },
  ],
  "/clients/client-live-tests": [
    { label: "Client Dashboard", icon: KanbanSquare, href: "/clients/client-dashboard" },
    { label: "Live Tests", icon: FlaskConical, href: "/clients/client-live-tests" },
  ],
  "/clients/client-results": [
    { label: "Client Dashboard", icon: KanbanSquare, href: "/clients/client-dashboard" },
    { label: "Results", icon: CheckCircle2, href: "/clients/client-results" },
  ],
  "/finances": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
  ],
  "/finances/overview": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
    { label: "Overview", icon: LayoutDashboard, href: "/finances/overview" },
  ],
  "/finances/revenue": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
    { label: "Revenue", icon: DollarSign, href: "/finances/revenue" },
  ],
  "/finances/expenses": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
    { label: "Expenses", icon: DollarSign, href: "/finances/expenses" },
  ],
  "/finances/pnl": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
    { label: "P&L", icon: DollarSign, href: "/finances/pnl" },
  ],
  "/finances/reserves": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
    { label: "Reserves", icon: DollarSign, href: "/finances/reserves" },
  ],
  "/finances/dividends": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
    { label: "Dividends", icon: DollarSign, href: "/finances/dividends" },
  ],
  "/finances/monthly-drilldown": [
    { label: "Finance", icon: DollarSign, href: "/finances/overview" },
    { label: "Monthly Drilldown", icon: DollarSign, href: "/finances/monthly-drilldown" },
  ],
  "/sales": [
    { label: "Sales", icon: Target, href: "/sales/overview" },
  ],
  "/sales/overview": [
    { label: "Sales", icon: Target, href: "/sales/overview" },
    { label: "Overview", icon: LayoutDashboard, href: "/sales/overview" },
  ],
  "/sales/leads": [
    { label: "Sales", icon: Target, href: "/sales/overview" },
    { label: "Leads", icon: Users, href: "/sales/leads" },
  ],
  "/sales/tasks": [
    { label: "Sales", icon: Target, href: "/sales/overview" },
    { label: "Tasks", icon: Clock, href: "/sales/tasks" },
  ],
  "/sales/kanban": [
    { label: "Sales", icon: Target, href: "/sales/overview" },
    { label: "Kanban", icon: KanbanSquare, href: "/sales/kanban" },
  ],
  "/team": [
    { label: "Team", icon: UserCircle, href: "/team/directory" },
  ],
  "/team/directory": [
    { label: "Team", icon: UserCircle, href: "/team/directory" },
    { label: "Directory", icon: Users, href: "/team/directory" },
  ],
  "/team/schedule": [
    { label: "Team", icon: UserCircle, href: "/team/directory" },
    { label: "Schedule", icon: Clock, href: "/team/schedule" },
  ],
  "/affiliates": [
    { label: "Affiliates", icon: Handshake, href: "/affiliates" },
  ],
  "/team-member-dashboard": [
    { label: "Team Member Dashboard", icon: UserCircle, href: "/team-member-dashboard" },
  ],
}

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useUser()
  const avatarInitials = user?.avatarInitials ?? user?.name?.slice(0, 2).toUpperCase() ?? 'MC'

  const [notifTab, setNotifTab] = useState<'unread' | 'read'>('unread')
  const [showArchived, setShowArchived] = useState(false)
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null)

  const { data: notificationRecords, error: notifError, mutate: mutateNotifs } = useAirtable('notifications', {
    fields: ['Notification Title', 'Notification Description', 'Status', 'Created Time', 'Display Time', 'Priority', 'Action URL', 'Type', 'Archive'],
    sort: [{ field: 'Created Time', direction: 'desc' }],
    noCache: true,
    refreshInterval: 60_000,     // poll every 60 seconds
    revalidateOnFocus: true,     // also refresh when returning to the tab
  })

  const [notifOverrides, setNotifOverrides] = useState<Map<string, { unread?: boolean; archived?: boolean }>>(new Map())

  async function patchNotification(
    id: string,
    fields: Record<string, unknown>,
    optimistic?: { unread?: boolean; archived?: boolean }
  ) {
    if (!user) return
    if (optimistic) {
      setNotifOverrides(prev => new Map(prev).set(id, { ...prev.get(id), ...optimistic }))
    }
    await fetch(`/api/airtable/notifications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-id': user.id,
        'x-user-name': user.name,
      },
      body: JSON.stringify({ fields }),
    })
    mutateNotifs() // fire-and-forget — don't await stale Next.js cache
  }

  // Clear overrides only once server data confirms the change
  useEffect(() => {
    if (!notificationRecords) return
    setNotifOverrides(prev => {
      if (prev.size === 0) return prev
      const next = new Map(prev)
      for (const [id, ov] of prev) {
        const record = notificationRecords.find(r => r.id === id)
        if (!record) { next.delete(id); continue }
        const serverUnread = record.fields['Status'] === 'Unread'
        const serverArchived = record.fields['Archive'] === true
        if (
          (ov.unread === undefined || serverUnread === ov.unread) &&
          (ov.archived === undefined || serverArchived === ov.archived)
        ) {
          next.delete(id)
        }
      }
      return next.size !== prev.size ? next : prev
    })
  }, [notificationRecords])

  const notifications = useMemo(() => (notificationRecords ?? []).map(r => {
    const ov = notifOverrides.get(r.id)
    return {
      id: r.id,
      title: String(r.fields['Notification Title'] ?? ''),
      desc: String(r.fields['Notification Description'] ?? ''),
      time: formatRelativeTime(String(r.fields['Created Time'] ?? '')),
      unread: ov?.unread !== undefined ? ov.unread : r.fields['Status'] === 'Unread',
      archived: ov?.archived !== undefined ? ov.archived : r.fields['Archive'] === true,
      actionUrl: String(r.fields['Action URL'] ?? ''),
    }
  }), [notificationRecords, notifOverrides])

  // Get breadcrumb items based on current pathname
  const getBreadcrumbs = () => {
    // Try exact match first
    if (breadcrumbMap[pathname]) {
      return breadcrumbMap[pathname]
    }

    // Try partial match (for dynamic routes)
    for (const [route, items] of Object.entries(breadcrumbMap)) {
      if (pathname.startsWith(route) && route !== "/") {
        return items
      }
    }

    // Default to dashboard
    return breadcrumbMap["/"]
  }

  const breadcrumbs = getBreadcrumbs()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const unreadNotifs = notifications.filter(n => n.unread && !n.archived)
  const readNotifs = notifications.filter(n => !n.unread && !n.archived)
  const archivedNotifs = notifications.filter(n => n.archived)
  const unreadCount = unreadNotifs.length

  const visibleNotifs = notifTab === 'unread' ? unreadNotifs : readNotifs

  return (
    <>
      <header className="h-[60px] border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <Image src="/images/logo.png" alt="MoreConversions logo" width={24} height={24} className="rounded-md" loading="eager" />
            <span className="text-sm font-semibold text-foreground tracking-tight">
              MoreConversions
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <nav className="flex items-center gap-2">
              {breadcrumbs.map((crumb, idx) => {
                const Icon = crumb.icon
                const isFirst = idx === 0
                const isLast = idx === breadcrumbs.length - 1
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {idx > 0 && <span className="text-muted-foreground text-xs">/</span>}
                    {isLast ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {isFirst && <Icon className="h-4 w-4" />}
                        <span>{crumb.label}</span>
                      </div>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isFirst && <Icon className="h-4 w-4" />}
                        <span>{crumb.label}</span>
                      </Link>
                    )}
                  </div>
                )
              })}
            </nav>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-[360px] bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Tabs: Unread + Read only */}
                <div className="flex border-b border-border">
                  {(['unread', 'read'] as const).map((tab) => {
                    const count = tab === 'unread' ? unreadNotifs.length : readNotifs.length
                    return (
                      <button
                        key={tab}
                        onClick={() => setNotifTab(tab)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium capitalize transition-colors border-b-2 ${
                          notifTab === tab
                            ? 'text-foreground border-foreground'
                            : 'text-muted-foreground border-transparent hover:text-foreground'
                        }`}
                      >
                        {tab}
                        {count > 0 && (
                          <span className={`text-[10px] rounded-full px-1.5 py-px leading-none ${
                            tab === 'unread' ? 'bg-sky-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Main list */}
                <div className="max-h-[320px] overflow-y-auto">
                  {notifError ? (
                    <p className="px-4 py-6 text-center text-[13px] text-red-500">
                      Failed to load notifications
                    </p>
                  ) : visibleNotifs.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                      No {notifTab} notifications
                    </p>
                  ) : (
                    visibleNotifs.map((n) => (
                      <div key={n.id} className="px-4 py-3 border-b border-border last:border-b-0">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.unread ? 'bg-sky-500' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-medium text-foreground leading-snug">{n.title}</p>
                              {notifTab === 'unread' && (
                                <button
                                  onClick={() => patchNotification(n.id, { Status: 'Read' }, { unread: false })}
                                  className="text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors whitespace-nowrap shrink-0"
                                >
                                  Mark read
                                </button>
                              )}
                              {notifTab === 'read' && (
                                <button
                                  onClick={() => patchNotification(n.id, { Status: 'Unread' }, { unread: true })}
                                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
                                >
                                  Un-read
                                </button>
                              )}
                            </div>
                            {n.desc && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{n.desc}</p>}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[11px] text-muted-foreground/60">{n.time}</span>
                              {notifTab === 'read' && (
                                <button
                                  onClick={() => setArchiveConfirmId(n.id)}
                                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                  title="Archive"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Archived toggle footer */}
                {archivedNotifs.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-border">
                    <button
                      onClick={() => setShowArchived(v => !v)}
                      className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <Archive className="h-3 w-3" />
                      {showArchived ? 'Hide archived' : `Show archived (${archivedNotifs.length})`}
                    </button>
                  </div>
                )}

                {/* Archived list (when toggled) */}
                {showArchived && archivedNotifs.length > 0 && (
                  <div className="border-t border-border max-h-[200px] overflow-y-auto bg-muted/20">
                    {archivedNotifs.map((n) => (
                      <div key={n.id} className="px-4 py-3 border-b border-border last:border-b-0 opacity-60">
                        <div className="flex items-start gap-3">
                          <span className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-transparent" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground leading-snug">{n.title}</p>
                            {n.desc && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{n.desc}</p>}
                            <span className="text-[11px] text-muted-foreground/60 mt-1 block">{n.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Archive confirm modal */}
            {archiveConfirmId && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
                <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-[300px] mx-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">Archive notification?</h3>
                  <p className="text-[13px] text-muted-foreground mb-5">This action cannot be undone.</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setArchiveConfirmId(null)}
                      className="px-3 py-1.5 text-[13px] rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        patchNotification(
                          archiveConfirmId,
                          { Archive: true, 'Archived On': new Date().toISOString() },
                          { archived: true }
                        )
                        setArchiveConfirmId(null)
                      }}
                      className="px-3 py-1.5 text-[13px] rounded-lg bg-foreground text-card hover:opacity-90 transition-opacity font-medium"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="w-px h-5 bg-border mx-1.5" />
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                {user?.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={user.name ?? ''} className="object-cover" />
                )}
                <AvatarFallback className="bg-foreground text-card text-[11px] font-semibold">
                  {avatarInitials}
                </AvatarFallback>
              </Avatar>
            </button>
            {userMenuOpen && (
              <div className="absolute -right-2 top-full mt-3 w-[200px] bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                <div className="py-1.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      setAccountSettingsOpen(true)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-foreground hover:bg-accent/40 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-foreground hover:bg-accent/40 transition-colors"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <AccountSettingsModal
        open={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
    </>
  )
}
