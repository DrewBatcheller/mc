"use client"

import { cn } from "@/lib/utils"
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
} from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

interface NavSubItem {
  label: string
  href: string
}

interface NavSection {
  icon: React.ElementType
  label: string
  href?: string
  subItems?: NavSubItem[]
}

const navSections: NavSection[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/",
  },
  {
    icon: DollarSign,
    label: "Finances",
    subItems: [
      { label: "Finance Overview", href: "/finances/overview" },
      { label: "Monthly Drilldown", href: "/finances/monthly-drilldown" },
      { label: "P&L", href: "/finances/pnl" },
      { label: "Revenue", href: "/finances/revenue" },
      { label: "Expenses", href: "/finances/expenses" },
      { label: "Dividends", href: "/finances/dividends" },
      { label: "Reserves", href: "/finances/reserves" },
    ],
  },
  {
    icon: Target,
    label: "Sales",
    subItems: [
      { label: "Overview", href: "/sales/overview" },
      { label: "Leads", href: "/sales/leads" },
      { label: "Kanban", href: "/sales/kanban" },
      { label: "Tasks", href: "/sales/tasks" },
    ],
  },
  {
    icon: FlaskConical,
    label: "Experiments",
    subItems: [
      { label: "Dashboard", href: "/experiments/dashboard" },
      { label: "Client Tracker", href: "/experiments/client-tracker" },
      { label: "Ideas", href: "/experiments/ideas" },
      { label: "Live Tests", href: "/experiments/live-tests" },
      { label: "Results", href: "/experiments/results" },
      { label: "Timeline", href: "/experiments/timeline" },
    ],
  },
  {
    icon: Users,
    label: "Clients",
    subItems: [
      { label: "Directory", href: "/clients/directory" },
      { label: "Dashboard", href: "/clients/dashboard" },
    ],
  },
  {
    icon: KanbanSquare,
    label: "Client Dashboard",
    subItems: [
      { label: "Dashboard", href: "/clients/client-dashboard" },
      { label: "Test Ideas", href: "/clients/client-ideas" },
      { label: "Experiments Overview", href: "/clients/experiments-overview" },
      { label: "Live Tests", href: "/clients/client-live-tests" },
      { label: "Results", href: "/clients/client-results" },
    ],
  },
  {
    icon: UserCircle,
    label: "Team",
    subItems: [
      { label: "Team Directory", href: "/team/directory" },
      { label: "Team Dashboard", href: "/team/dashboard" },
      { label: "Schedule", href: "/team/schedule" },
    ],
  },
  {
    icon: Handshake,
    label: "Affiliates",
    href: "/affiliates",
  },
]

const bottomItems: NavSection[] = []

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  // Auto-open the section that matches the current path
  const initialOpenSections = navSections
    .filter((s) => s.subItems?.some((sub) => pathname === sub.href))
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
      router.push(section.subItems![0].href)
    } else if (section.href) {
      router.push(section.href!)
    }
  }

  function handleNavClick(href: string) {
    router.push(href)
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-border bg-card h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[252px]"
      )}
    >
      <div
        className={cn(
          "flex items-center h-[60px] border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between"
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
            "h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            collapsed && "hidden"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

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
                  onClick={() => handleNavClick(section.href!)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors",
                    collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                    isTopLevelActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                  title={collapsed ? section.label : undefined}
                >
                  <section.icon className="h-4 w-4 shrink-0" />
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
                    "w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors",
                    collapsed ? "justify-center px-2 py-2" : "px-3 py-2 justify-between",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                  title={collapsed ? section.label : undefined}
                >
                  <span className="flex items-center gap-2.5">
                    <section.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{section.label}</span>}
                  </span>
                  {!collapsed && hasSubItems && (
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {!collapsed && hasSubItems && isOpen && (
                  <div className="ml-[22px] border-l border-border pl-2.5 mt-0.5 mb-1 flex flex-col gap-0.5">
                    {section.subItems!.map((sub) => (
                      <button
                        key={sub.label}
                        onClick={() => handleNavClick(sub.href)}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                          pathname === sub.href
                            ? "text-foreground font-medium bg-accent"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
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

        <div className="flex flex-col gap-0.5 py-2 px-2.5">
          <button
            onClick={() => setCollapsed(false)}
            className={cn(
              "flex items-center justify-center px-2 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors",
              !collapsed && "hidden"
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
