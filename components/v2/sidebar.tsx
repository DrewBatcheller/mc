"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  UserPlus,
  Lightbulb,
  Building2,
  ImageIcon,
  UserCircle,
  LogOut,
  ClipboardList,
  User,
  Loader2,
  ChevronDown,
} from "lucide-react"
import { useUser } from "@/contexts/v2/user-context"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  subItems?: { name: string; href: string }[]
}

const managementNav: NavItem[] = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  {
    name: "Finances",
    href: "/finances/overview",
    icon: DollarSign,
    subItems: [
      { name: "Finance Overview", href: "/finances/overview" },
      { name: "Monthly Drilldown", href: "/finances/monthly-drilldown" },
      { name: "P&L", href: "/finances/pnl" },
      { name: "Revenue", href: "/finances/revenue" },
      { name: "Expenses", href: "/finances/expenses" },
      { name: "Dividends", href: "/finances/dividends" },
      { name: "Reserves", href: "/finances/reserves" },
    ],
  },
  {
    name: "Schedule",
    href: "/schedule/calendar",
    icon: Calendar,
    subItems: [
      { name: "Kanban", href: "/schedule/kanban" },
      { name: "Calendar", href: "/schedule/calendar" },
      { name: "List", href: "/schedule/list" },
    ],
  },
  { name: "Client Tracker", href: "/client-tracker", icon: ClipboardList },
  { name: "Test Ideas", href: "/test-ideas", icon: Lightbulb },
  { name: "Clients", href: "/clients", icon: Building2 },
  { name: "Team", href: "/team", icon: Users },
  { name: "Leads", href: "/leads", icon: UserPlus },
  { name: "Affiliates", href: "/affiliates", icon: Users },
]

const teamNav = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  {
    name: "Schedule",
    href: "/schedule/kanban",
    icon: Calendar,
    subItems: [
      { name: "Kanban", href: "/schedule/kanban" },
      { name: "Calendar", href: "/schedule/calendar" },
      { name: "List", href: "/schedule/list" },
    ],
  },
  { name: "Client Tracker", href: "/client-tracker", icon: ClipboardList },
  { name: "Test Ideas", href: "/test-ideas", icon: Lightbulb },
  { name: "Clients", href: "/clients", icon: Building2 },
]

const clientNav = [
  { name: "Client Tracker", href: "/client-tracker", icon: ClipboardList },
  { name: "Test Ideas", href: "/test-ideas", icon: Lightbulb },
]

const roleConfig: Record<string, { label: string; color: string }> = {
  management: { label: "Management", color: "bg-foreground text-background" },
  team: { label: "Team Member", color: "bg-sky-100 text-sky-800" },
  client: { label: "Client", color: "bg-emerald-100 text-emerald-800" },
}

export function Sidebar() {
  const pathname = usePathname()
  const [logoError, setLogoError] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const { currentUser, logout } = useUser()

  // Initialize from localStorage and prevent hydration mismatch
  React.useEffect(() => {
    const saved = localStorage.getItem("sidebar-expanded-menus")
    if (saved) {
      setExpandedMenus(new Set(JSON.parse(saved)))
    }
    setMounted(true)
  }, [])

  const handleExpandedMenuChange = (menuName: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(menuName)) {
        newSet.delete(menuName)
      } else {
        newSet.add(menuName)
      }
      localStorage.setItem("sidebar-expanded-menus", JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  if (!currentUser) return null

  const navigation: NavItem[] =
    currentUser.role === "management"
      ? managementNav
      : currentUser.role === "team"
        ? teamNav
        : clientNav

  const roleInfo = roleConfig[currentUser.role] || roleConfig.team

  const isItemActive = (item: NavItem): boolean => {
    if (item.subItems) {
      return item.subItems.some((sub) => pathname === sub.href)
    }
    return pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
  }

  return (
    <div className="flex h-screen w-44 flex-col bg-background border-r border-border flex-shrink-0">
      {/* Logo */}
      <div className="flex h-12 items-center justify-center px-3 py-2 border-b border-border flex-shrink-0">
        <Link href="/" className="flex items-center justify-center cursor-pointer" title="Go to dashboard">
          {!logoError ? (
            <img
              src="/images/mc-logo.png"
              alt="More Conversions Logo"
              className="h-10 w-10 select-none"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-10 w-10 bg-muted rounded select-none">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </Link>
      </div>

      {/* Navigation - starts at 50px */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto" style={{ paddingTop: "calc(50px - 12px)" }}>
        {navigation.map((item) => {
          const isActive = isItemActive(item)
          const isExpanded = expandedMenus.has(item.name)

          if (item.subItems) {
            return (
              <div key={item.name}>
                <div className="flex items-center w-full rounded-md transition-colors select-none">
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (!isExpanded) {
                        handleExpandedMenuChange(item.name)
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors select-none cursor-pointer",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    title={`Navigate to ${item.name}`}
                  >
                    <item.icon className="mr-2 h-3.5 w-3.5 flex-shrink-0 -mt-0.5" />
                    <span className="flex-1 text-left select-none">{item.name}</span>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleExpandedMenuChange(item.name)
                    }}
                    className="px-1 py-1.5 hover:bg-muted rounded transition-colors cursor-pointer flex-shrink-0"
                    title={`${isExpanded ? "Close" : "Open"} ${item.name} menu`}
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isExpanded ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-0.5 flex flex-col gap-0">
                    {/* Vertical line from parent to children */}
                    <div className="relative">
                      {item.subItems.map((subItem, idx) => {
                        const isSubActive = pathname === subItem.href
                        const isFirst = idx === 0
                        const isLast = idx === item.subItems!.length - 1

                        return (
                          <div key={subItem.href} className="relative flex items-center">
                            {/* Vertical line and connector */}
                            <div className="absolute left-3.5 top-0 w-0.5 h-full bg-border" />
                            {isFirst && (
                              <div className="absolute left-3.5 -top-1.5 w-2 h-1.5 border-l border-b border-border rounded-bl-sm" />
                            )}
                            {isLast && (
                              <div className="absolute left-3.5 bottom-1/2 w-2 h-1/2 border-l border-b border-border rounded-bl-sm" />
                            )}

                            {/* Sub-item link */}
                            <Link
                              href={subItem.href}
                              className={cn(
                                "flex items-center px-2 py-1.5 text-xs rounded-md transition-colors select-none cursor-pointer relative z-10 ml-6",
                                isSubActive
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                              title={`Navigate to ${subItem.name}`}
                            >
                              <span className="select-none">{subItem.name}</span>
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors select-none cursor-pointer",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={`Navigate to ${item.name}`}
            >
              <item.icon className="mr-2 h-3.5 w-3.5 flex-shrink-0 -mt-0.5" />
              <span className="select-none">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border px-2 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={currentUser.avatar || ""} alt={currentUser.name} />
            <AvatarFallback className="select-none">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate select-none">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground truncate select-none">{currentUser.email}</p>
          </div>

          <button
            onClick={logout}
            className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
