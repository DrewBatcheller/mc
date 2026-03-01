"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Settings,
  LogOut,
  X,
  ChevronDown,
  DollarSign,
  Target,
  UserCircle,
  Handshake,
} from "lucide-react"
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
    icon: UserCircle,
    label: "Team",
    subItems: [
      { label: "Team Directory", href: "/team/directory" },
      { label: "Schedule", href: "/team/schedule" },
    ],
  },
  {
    icon: Handshake,
    label: "Affiliates",
    href: "/affiliates",
  },
]

const bottomItems = [
  { icon: Settings, label: "Settings" },
  { icon: LogOut, label: "Log out" },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()

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

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-card border-r border-border flex flex-col transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-[60px] border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.png"
              alt="MoreConversions logo"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span className="text-sm font-semibold text-foreground tracking-tight">
              MoreConversions
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
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
                  <Link
                    key={section.label}
                    href={section.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                      isTopLevelActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                  >
                    <section.icon className="h-4 w-4 shrink-0" />
                    <span>{section.label}</span>
                  </Link>
                )
              }

              return (
                <div key={section.label}>
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        toggleSection(section.label)
                      }
                    }}
                    className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <section.icon className="h-4 w-4 shrink-0" />
                      <span>{section.label}</span>
                    </span>
                    {hasSubItems && (
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    )}
                  </button>

                  {hasSubItems && isOpen && (
                    <div className="ml-[22px] border-l border-border pl-2.5 mt-0.5 mb-1 flex flex-col gap-0.5">
                      {section.subItems!.map((sub) => (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          onClick={onClose}
                          className={cn(
                            "block px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                            pathname === sub.href
                              ? "text-foreground font-medium bg-accent"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                          )}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-0.5 py-2 px-2.5 border-t border-border">
            {bottomItems.map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
