"use client"

import { Bell, Menu, X, LayoutDashboard, FlaskConical, Users, KanbanSquare, UserCircle, DollarSign, Target, Handshake, Clock, Settings, LogOut, CheckCircle2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { MobileNav } from "./mobile-nav"
import { useUser } from "@/contexts/UserContext"

const notifications = [
  { id: 1, title: "New experiment launched", desc: "Vita Hustle - PDP Restructure is now live", time: "2m ago", unread: true },
  { id: 2, title: "QA Report submitted", desc: "Anna submitted QA for Cosara Batch 4", time: "18m ago", unread: true },
  { id: 3, title: "Experiment completed", desc: "Perfect White Tee - Cart Redesign ended", time: "1h ago", unread: true },
  { id: 4, title: "Client onboarded", desc: "Dr Woof Apparel has been added", time: "3h ago", unread: false },
  { id: 5, title: "Strategy approved", desc: "Sereneherbs strategy doc signed off", time: "5h ago", unread: false },
  { id: 6, title: "Invoice paid", desc: "Goose Creek Candles - $5,000.00", time: "1d ago", unread: false },
]

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
  "/clients": [
    { label: "Clients", icon: Users, href: "/clients/dashboard" },
  ],
  "/clients/dashboard": [
    { label: "Clients", icon: Users, href: "/clients/dashboard" },
  ],
  "/clients/directory": [
    { label: "Clients", icon: Users, href: "/clients/dashboard" },
    { label: "Directory", icon: Users, href: "/clients/directory" },
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
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useUser()
  const avatarInitials = user?.avatarInitials ?? user?.name?.slice(0, 2).toUpperCase() ?? 'MC'

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

  const unreadCount = notifications.filter((n) => n.unread).length

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
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {n.unread && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                        )}
                        {!n.unread && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{n.desc}</p>
                          <span className="text-[11px] text-muted-foreground/60 mt-1 block">{n.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-border">
                  <button className="text-[12px] font-medium text-sky-600 hover:text-sky-700 transition-colors">
                    Mark all as read
                  </button>
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
                      // Handle edit account details
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
    </>
  )
}
