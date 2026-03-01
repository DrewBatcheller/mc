"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  Search, ChevronDown, ChevronRight, Mail, Globe, Users, Briefcase, Clock, FileText,
  ChevronLeft, CalendarDays, Plus, MoreHorizontal, Pencil, Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { MetricCard } from "@/components/shared/metric-card"
import { ContentCard } from "@/components/shared/content-card"
import { AddMemberModal, type MemberFormData } from "./add-member-modal"

/* ── Data ── */
type Dept = "Strategy" | "QA" | "Development" | "Management" | "Design"
type Status = "Active" | "Inactive"
interface AssignedClient { name: string; status: string; experiments: number; lastActive: string }
interface ScheduleTask { day: number; month: number; year: number; title: string; client: string; time: string; type: "strategy" | "design" | "dev" | "qa" | "review" }
interface Member {
  id: number; name: string; initials: string; department: Dept;
  email: string; employment: Status; status: Status;
  clients: number; role: string; startDate: string;
  slackId: string; timezone: string;
  assignedClients: AssignedClient[]; bio: string;
  schedule: ScheduleTask[];
}

const members: Member[] = [
  {
    id: 1, name: "Andrew Vo", initials: "AV", department: "Strategy",
    email: "andrew@moreconversions.com", employment: "Inactive", status: "Inactive",
    clients: 0, role: "CRO Strategist", startDate: "2024-03-15",
    slackId: "U07AV01", timezone: "EST", assignedClients: [],
    bio: "CRO strategist with a focus on data-driven experimentation and user behavior analysis.",
    schedule: [],
  },
  {
    id: 2, name: "Anna Anikeieva", initials: "AA", department: "QA",
    email: "a.anikeieva23@gmail.com", employment: "Active", status: "Active",
    clients: 14, role: "QA Lead", startDate: "2023-06-01",
    slackId: "U07AA01", timezone: "EST",
    assignedClients: [
      { name: "Sereneherbs", status: "Active", experiments: 3, lastActive: "Feb 12, 2026" },
      { name: "Live Love Locks LLC", status: "Active", experiments: 1, lastActive: "Feb 10, 2026" },
      { name: "Goose Creek Candles", status: "Active", experiments: 4, lastActive: "Feb 8, 2026" },
      { name: "Perfect White Tee", status: "Active", experiments: 3, lastActive: "Feb 7, 2026" },
      { name: "Cosara", status: "Active", experiments: 2, lastActive: "Feb 14, 2026" },
      { name: "Vita Hustle", status: "Active", experiments: 2, lastActive: "Feb 13, 2026" },
      { name: "The Ayurveda Experience", status: "Active", experiments: 3, lastActive: "Feb 6, 2026" },
      { name: "Fake Brand", status: "Active", experiments: 4, lastActive: "Feb 11, 2026" },
      { name: "Dr Woof Apparel", status: "Active", experiments: 3, lastActive: "Feb 15, 2026" },
      { name: "Shop Noble", status: "Active", experiments: 1, lastActive: "Feb 3, 2026" },
      { name: "Infinite Age", status: "Inactive", experiments: 1, lastActive: "Jan 20, 2026" },
      { name: "TryAyuri", status: "Inactive", experiments: 0, lastActive: "Jan 18, 2026" },
      { name: "Arrowhead", status: "Inactive", experiments: 2, lastActive: "Jan 25, 2026" },
      { name: "Gatsby", status: "Inactive", experiments: 1, lastActive: "Jan 22, 2026" },
    ],
    bio: "Quality assurance specialist ensuring all experiments meet production standards before launch.",
    schedule: [
      { day: 3, month: 1, year: 2026, title: "QA Review: Cart Redesign", client: "Perfect White Tee", time: "10:00 AM", type: "qa" },
      { day: 5, month: 1, year: 2026, title: "QA Review: PDP Restructure", client: "Cosara", time: "2:00 PM", type: "qa" },
      { day: 10, month: 1, year: 2026, title: "QA Review: Free Shipping Topbar", client: "Sereneherbs", time: "11:00 AM", type: "qa" },
      { day: 12, month: 1, year: 2026, title: "QA Review: Mobile Nav Tabs", client: "Dr Woof Apparel", time: "9:30 AM", type: "qa" },
      { day: 14, month: 1, year: 2026, title: "Bug Verification: Checkout Flow", client: "Vita Hustle", time: "3:00 PM", type: "review" },
      { day: 18, month: 1, year: 2026, title: "QA Review: Search Header", client: "Goose Creek Candles", time: "10:30 AM", type: "qa" },
      { day: 20, month: 1, year: 2026, title: "Final QA Pass: Nav Bubbles", client: "Live Love Locks LLC", time: "1:00 PM", type: "qa" },
      { day: 24, month: 1, year: 2026, title: "Regression Testing: Homepage", client: "Fake Brand", time: "11:00 AM", type: "review" },
    ],
  },
  {
    id: 3, name: "Arafat Islam", initials: "AI", department: "Development",
    email: "alarafatislam@gmail.com", employment: "Active", status: "Active",
    clients: 8, role: "Lead Developer", startDate: "2023-04-10",
    slackId: "U07AF01", timezone: "EST",
    assignedClients: [
      { name: "Sereneherbs", status: "Active", experiments: 3, lastActive: "Feb 12, 2026" },
      { name: "Live Love Locks LLC", status: "Active", experiments: 1, lastActive: "Feb 10, 2026" },
      { name: "Cosara", status: "Active", experiments: 2, lastActive: "Feb 14, 2026" },
      { name: "Vita Hustle", status: "Active", experiments: 2, lastActive: "Feb 13, 2026" },
      { name: "The Ayurveda Experience", status: "Active", experiments: 3, lastActive: "Feb 6, 2026" },
      { name: "Perfect White Tee", status: "Active", experiments: 3, lastActive: "Feb 7, 2026" },
      { name: "Fake Brand", status: "Active", experiments: 4, lastActive: "Feb 11, 2026" },
      { name: "Dr Woof Apparel", status: "Active", experiments: 3, lastActive: "Feb 15, 2026" },
    ],
    bio: "Full-stack developer specializing in A/B test implementation and front-end optimization.",
    schedule: [
      { day: 2, month: 1, year: 2026, title: "Dev: Cart Redesign", client: "Perfect White Tee", time: "9:00 AM", type: "dev" },
      { day: 4, month: 1, year: 2026, title: "Dev: Free Shipping Topbar", client: "Sereneherbs", time: "10:00 AM", type: "dev" },
      { day: 6, month: 1, year: 2026, title: "Dev: PDP Restructure", client: "Cosara", time: "9:00 AM", type: "dev" },
      { day: 9, month: 1, year: 2026, title: "Dev: Mobile Nav Tabs", client: "Dr Woof Apparel", time: "11:00 AM", type: "dev" },
      { day: 11, month: 1, year: 2026, title: "Code Review: Checkout Fix", client: "Vita Hustle", time: "2:00 PM", type: "review" },
      { day: 16, month: 1, year: 2026, title: "Dev: Search Header", client: "Goose Creek Candles", time: "9:30 AM", type: "dev" },
      { day: 19, month: 1, year: 2026, title: "Dev: Nav Bubbles", client: "Live Love Locks LLC", time: "10:00 AM", type: "dev" },
      { day: 23, month: 1, year: 2026, title: "Dev: Hero Video", client: "The Ayurveda Experience", time: "9:00 AM", type: "dev" },
      { day: 25, month: 1, year: 2026, title: "Hotfix: Cart Drawer", client: "Vita Hustle", time: "3:00 PM", type: "dev" },
    ],
  },
  {
    id: 4, name: "Connor Shelefontiuk", initials: "CS", department: "Management",
    email: "connor@moreconversions.com", employment: "Active", status: "Active",
    clients: 13, role: "Account Manager", startDate: "2022-11-01",
    slackId: "U07CS01", timezone: "EST",
    assignedClients: [
      { name: "Sereneherbs", status: "Active", experiments: 3, lastActive: "Feb 12, 2026" },
      { name: "Perfect White Tee", status: "Active", experiments: 3, lastActive: "Feb 7, 2026" },
      { name: "Cosara", status: "Active", experiments: 2, lastActive: "Feb 14, 2026" },
      { name: "Goose Creek Candles", status: "Active", experiments: 4, lastActive: "Feb 8, 2026" },
      { name: "Vita Hustle", status: "Active", experiments: 2, lastActive: "Feb 13, 2026" },
    ],
    bio: "Account manager overseeing client relationships and ensuring project delivery timelines are met.",
    schedule: [
      { day: 3, month: 1, year: 2026, title: "Strategy Review: Q1 Roadmap", client: "Sereneherbs", time: "10:00 AM", type: "strategy" },
      { day: 7, month: 1, year: 2026, title: "Client Sync: Monthly Review", client: "Perfect White Tee", time: "2:00 PM", type: "review" },
      { day: 13, month: 1, year: 2026, title: "Strategy Review: Test Pipeline", client: "Cosara", time: "11:00 AM", type: "strategy" },
      { day: 17, month: 1, year: 2026, title: "Client Sync: Results Review", client: "Goose Creek Candles", time: "3:00 PM", type: "review" },
      { day: 21, month: 1, year: 2026, title: "Strategy Session: Growth Plan", client: "Vita Hustle", time: "10:00 AM", type: "strategy" },
    ],
  },
  {
    id: 5, name: "Connor Shelefontiuk Strat", initials: "CS", department: "Strategy",
    email: "connor.strat@moreconversions.com", employment: "Active", status: "Active",
    clients: 13, role: "CRO Strategist", startDate: "2022-11-01",
    slackId: "U07CS02", timezone: "EST",
    assignedClients: [
      { name: "Sereneherbs", status: "Active", experiments: 3, lastActive: "Feb 12, 2026" },
      { name: "Cosara", status: "Active", experiments: 2, lastActive: "Feb 14, 2026" },
      { name: "Vita Hustle", status: "Active", experiments: 2, lastActive: "Feb 13, 2026" },
    ],
    bio: "Strategist responsible for building test hypotheses and experiment roadmaps across client accounts.",
    schedule: [
      { day: 4, month: 1, year: 2026, title: "Hypothesis Workshop", client: "Sereneherbs", time: "10:00 AM", type: "strategy" },
      { day: 8, month: 1, year: 2026, title: "Test Prioritization", client: "Cosara", time: "1:00 PM", type: "strategy" },
      { day: 15, month: 1, year: 2026, title: "Roadmap Planning: Q2", client: "Vita Hustle", time: "11:00 AM", type: "strategy" },
    ],
  },
  {
    id: 6, name: "David Sondervan", initials: "DS", department: "Strategy",
    email: "david@moreconversions.com", employment: "Inactive", status: "Inactive",
    clients: 0, role: "CRO Strategist", startDate: "2024-01-10",
    slackId: "U07DS01", timezone: "CST", assignedClients: [],
    bio: "Former strategist who supported multiple DTC brands with conversion optimization.",
    schedule: [],
  },
  {
    id: 7, name: "Drew Batcheller", initials: "DB", department: "Management",
    email: "dbatchell@gmail.com", employment: "Active", status: "Active",
    clients: 0, role: "CEO", startDate: "2021-01-01",
    slackId: "U07DB01", timezone: "EST", assignedClients: [],
    bio: "Founder and CEO. Oversees company strategy, partnerships, and growth initiatives.",
    schedule: [
      { day: 6, month: 1, year: 2026, title: "All-Hands Meeting", client: "Internal", time: "9:00 AM", type: "review" },
      { day: 14, month: 1, year: 2026, title: "Board Strategy Session", client: "Internal", time: "10:00 AM", type: "strategy" },
    ],
  },
  {
    id: 8, name: "Ivan Guzman", initials: "IG", department: "Development",
    email: "ivan@moreconversions.com", employment: "Active", status: "Active",
    clients: 6, role: "Developer", startDate: "2024-02-20",
    slackId: "U07IG01", timezone: "CST",
    assignedClients: [
      { name: "Goose Creek Candles", status: "Active", experiments: 4, lastActive: "Feb 8, 2026" },
      { name: "Fake Brand", status: "Active", experiments: 4, lastActive: "Feb 11, 2026" },
      { name: "Shop Noble", status: "Active", experiments: 1, lastActive: "Feb 3, 2026" },
    ],
    bio: "Front-end developer focused on building and deploying A/B test variants.",
    schedule: [
      { day: 5, month: 1, year: 2026, title: "Dev: ATC Button Variants", client: "Goose Creek Candles", time: "10:00 AM", type: "dev" },
      { day: 10, month: 1, year: 2026, title: "Dev: Hero Banner Test", client: "Fake Brand", time: "9:00 AM", type: "dev" },
      { day: 17, month: 1, year: 2026, title: "Dev: Collection Redesign", client: "Shop Noble", time: "11:00 AM", type: "dev" },
      { day: 22, month: 1, year: 2026, title: "Code Review: Banner Fix", client: "Fake Brand", time: "2:00 PM", type: "review" },
    ],
  },
  {
    id: 9, name: "Jayden Grayston", initials: "JG", department: "Management",
    email: "jayden@moreconversions.com", employment: "Active", status: "Active",
    clients: 0, role: "COO", startDate: "2021-06-01",
    slackId: "U07JG01", timezone: "EST", assignedClients: [],
    bio: "Chief Operations Officer managing team operations, client delivery, and process optimization.",
    schedule: [
      { day: 2, month: 1, year: 2026, title: "Ops Review: Weekly", client: "Internal", time: "9:00 AM", type: "review" },
      { day: 9, month: 1, year: 2026, title: "Ops Review: Weekly", client: "Internal", time: "9:00 AM", type: "review" },
      { day: 16, month: 1, year: 2026, title: "Ops Review: Weekly", client: "Internal", time: "9:00 AM", type: "review" },
      { day: 23, month: 1, year: 2026, title: "Ops Review: Weekly", client: "Internal", time: "9:00 AM", type: "review" },
    ],
  },
  {
    id: 10, name: "Jayden Grayston Design", initials: "JG", department: "Design",
    email: "jayden.Design@moreconversions.com", employment: "Active", status: "Active",
    clients: 1, role: "Designer", startDate: "2023-09-01",
    slackId: "U07JGD1", timezone: "EST",
    assignedClients: [
      { name: "Dr Woof Apparel", status: "Active", experiments: 3, lastActive: "Feb 15, 2026" },
    ],
    bio: "UI/UX designer creating high-converting test variants and visual assets.",
    schedule: [
      { day: 3, month: 1, year: 2026, title: "Design: Mobile Nav Tabs", client: "Dr Woof Apparel", time: "10:00 AM", type: "design" },
      { day: 11, month: 1, year: 2026, title: "Design: Search Header", client: "Dr Woof Apparel", time: "11:00 AM", type: "design" },
      { day: 19, month: 1, year: 2026, title: "Design Review: Final Mocks", client: "Dr Woof Apparel", time: "2:00 PM", type: "review" },
    ],
  },
  {
    id: 11, name: "Jayden Grayston Dev", initials: "JG", department: "Development",
    email: "jayden.Dev@moreconversions.com", employment: "Active", status: "Active",
    clients: 1, role: "Developer", startDate: "2023-09-01",
    slackId: "U07JGV1", timezone: "EST",
    assignedClients: [
      { name: "The Ayurveda Experience", status: "Active", experiments: 3, lastActive: "Feb 6, 2026" },
    ],
    bio: "Developer handling A/B test variant implementation and Shopify theme development.",
    schedule: [
      { day: 7, month: 1, year: 2026, title: "Dev: Menu Hierarchy", client: "The Ayurveda Experience", time: "9:00 AM", type: "dev" },
      { day: 15, month: 1, year: 2026, title: "Dev: Shipping Progress Bar", client: "The Ayurveda Experience", time: "10:00 AM", type: "dev" },
    ],
  },
  {
    id: 12, name: "Jayden Grayston QA", initials: "JG", department: "QA",
    email: "jayden.QA@moreconversions.com", employment: "Active", status: "Active",
    clients: 1, role: "QA Specialist", startDate: "2023-09-01",
    slackId: "U07JGQ1", timezone: "EST",
    assignedClients: [
      { name: "Cosara", status: "Active", experiments: 2, lastActive: "Feb 14, 2026" },
    ],
    bio: "QA specialist responsible for cross-browser testing and variant validation.",
    schedule: [
      { day: 8, month: 1, year: 2026, title: "QA: Mobile Search Input", client: "Cosara", time: "10:00 AM", type: "qa" },
      { day: 18, month: 1, year: 2026, title: "QA: CTA Injection Test", client: "Cosara", time: "11:00 AM", type: "qa" },
    ],
  },
  {
    id: 13, name: "Jayden Grayston Strategist", initials: "JG", department: "Strategy",
    email: "jayden.Strat@moreconversions.com", employment: "Active", status: "Active",
    clients: 2, role: "CRO Strategist", startDate: "2023-09-01",
    slackId: "U07JGS1", timezone: "EST",
    assignedClients: [
      { name: "Sereneherbs", status: "Active", experiments: 3, lastActive: "Feb 12, 2026" },
      { name: "Vita Hustle", status: "Active", experiments: 2, lastActive: "Feb 13, 2026" },
    ],
    bio: "CRO strategist building test roadmaps and analyzing experiment results for optimization wins.",
    schedule: [
      { day: 5, month: 1, year: 2026, title: "Strategy: Q1 Test Pipeline", client: "Sereneherbs", time: "10:00 AM", type: "strategy" },
      { day: 12, month: 1, year: 2026, title: "Strategy: Pricing Test", client: "Vita Hustle", time: "2:00 PM", type: "strategy" },
      { day: 20, month: 1, year: 2026, title: "Results Analysis: Topbar", client: "Sereneherbs", time: "11:00 AM", type: "review" },
    ],
  },
  {
    id: 14, name: "Marcus Phellipe", initials: "MP", department: "Design",
    email: "marcus.phellipe@toptal.com", employment: "Active", status: "Active",
    clients: 3, role: "Senior Designer", startDate: "2024-06-01",
    slackId: "U07MP01", timezone: "BRT",
    assignedClients: [
      { name: "Cosara", status: "Active", experiments: 2, lastActive: "Feb 14, 2026" },
      { name: "Live Love Locks LLC", status: "Active", experiments: 1, lastActive: "Feb 10, 2026" },
      { name: "Goose Creek Candles", status: "Active", experiments: 4, lastActive: "Feb 8, 2026" },
    ],
    bio: "Senior UI designer crafting engaging experiment designs across multiple DTC brands.",
    schedule: [
      { day: 4, month: 1, year: 2026, title: "Design: CTA Button Variants", client: "Cosara", time: "9:00 AM", type: "design" },
      { day: 9, month: 1, year: 2026, title: "Design: Collection Page", client: "Live Love Locks LLC", time: "10:00 AM", type: "design" },
      { day: 14, month: 1, year: 2026, title: "Design: ATC Badges", client: "Goose Creek Candles", time: "11:00 AM", type: "design" },
      { day: 20, month: 1, year: 2026, title: "Design Review: All Mocks", client: "Cosara", time: "3:00 PM", type: "review" },
    ],
  },
  {
    id: 15, name: "Rajesh Bhuva", initials: "RB", department: "Design",
    email: "bhuvaraj8090@gmail.com", employment: "Inactive", status: "Inactive",
    clients: 0, role: "Designer", startDate: "2024-08-01",
    slackId: "U07RB01", timezone: "IST", assignedClients: [],
    bio: "Former designer who supported visual asset creation for experiments.",
    schedule: [],
  },
  {
    id: 16, name: "Tobi Akinloye", initials: "TA", department: "Design",
    email: "tobhyak@gmail.com", employment: "Active", status: "Active",
    clients: 11, role: "Lead Designer", startDate: "2022-08-15",
    slackId: "U07TA01", timezone: "WAT",
    assignedClients: [
      { name: "Sereneherbs", status: "Active", experiments: 3, lastActive: "Feb 12, 2026" },
      { name: "Perfect White Tee", status: "Active", experiments: 3, lastActive: "Feb 7, 2026" },
      { name: "Vita Hustle", status: "Active", experiments: 2, lastActive: "Feb 13, 2026" },
      { name: "The Ayurveda Experience", status: "Active", experiments: 3, lastActive: "Feb 6, 2026" },
      { name: "Fake Brand", status: "Active", experiments: 4, lastActive: "Feb 11, 2026" },
    ],
    bio: "Lead designer overseeing all visual design output and maintaining brand consistency across tests.",
    schedule: [
      { day: 2, month: 1, year: 2026, title: "Design: Free Shipping Bar", client: "Sereneherbs", time: "9:00 AM", type: "design" },
      { day: 5, month: 1, year: 2026, title: "Design: Cart Redesign", client: "Perfect White Tee", time: "10:00 AM", type: "design" },
      { day: 9, month: 1, year: 2026, title: "Design: Price Visualization", client: "Vita Hustle", time: "11:00 AM", type: "design" },
      { day: 12, month: 1, year: 2026, title: "Design: Hero Video BG", client: "The Ayurveda Experience", time: "9:30 AM", type: "design" },
      { day: 16, month: 1, year: 2026, title: "Design: FAQ Section", client: "Fake Brand", time: "10:00 AM", type: "design" },
      { day: 20, month: 1, year: 2026, title: "Design Review: All Clients", client: "Internal", time: "2:00 PM", type: "review" },
      { day: 24, month: 1, year: 2026, title: "Design: Subscription Toggle", client: "Vita Hustle", time: "9:00 AM", type: "design" },
    ],
  },
]

/* ── Schedule task type styles ── */
const typeStyles: Record<string, { bg: string; border: string; dot: string; label: string }> = {
  strategy: { bg: "bg-sky-50", border: "border-sky-200 text-sky-700", dot: "bg-sky-400", label: "Strategy" },
  design: { bg: "bg-rose-50", border: "border-rose-200 text-rose-700", dot: "bg-rose-400", label: "Design" },
  dev: { bg: "bg-teal-50", border: "border-teal-200 text-teal-700", dot: "bg-teal-400", label: "Development" },
  qa: { bg: "bg-amber-50", border: "border-amber-200 text-amber-700", dot: "bg-amber-400", label: "QA" },
  review: { bg: "bg-violet-50", border: "border-violet-200 text-violet-700", dot: "bg-violet-400", label: "Review" },
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const deptColors: Record<string, { bg: string; text: string }> = {
  Strategy: { bg: "bg-sky-50", text: "text-sky-700" },
  QA: { bg: "bg-amber-50", text: "text-amber-700" },
  Development: { bg: "bg-teal-50", text: "text-teal-700" },
  Management: { bg: "bg-violet-50", text: "text-violet-700" },
  Design: { bg: "bg-rose-50", text: "text-rose-700" },
}

const tabs = ["Overview", "Assigned Clients", "Schedule", "Settings"]

/* ── Main ── */
export function TeamDirectory() {
  const [memberList, setMemberList] = useState(members)
  const [selectedId, setSelectedId] = useState(members.find(m => m.assignedClients.length > 0)?.id ?? members[0].id)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Overview")
  const [deptFilter, setDeptFilter] = useState("All Departments")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = useMemo(
    () => memberList.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
      const matchDept = deptFilter === "All Departments" || m.department === deptFilter
      const matchStatus = statusFilter === "All Statuses" || m.status === statusFilter
      return matchSearch && matchDept && matchStatus
    }),
    [search, deptFilter, statusFilter, memberList]
  )

  const member = memberList.find((m) => m.id === selectedId) ?? memberList[0]

  const handleAddMember = (data: MemberFormData) => {
    const initials = data.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    const dept = data.department as Member["department"]
    const newMember: Member = {
      id: Date.now(),
      name: data.name,
      initials,
      department: dept,
      email: data.email,
      employment: data.employment as Member["employment"],
      status: data.employment as Member["status"],
      clients: 0,
      role: data.role || dept,
      startDate: data.startDate || new Date().toISOString().split("T")[0],
      slackId: data.slackId,
      timezone: data.timezone,
      assignedClients: [],
      bio: data.bio,
      schedule: [],
    }
    setMemberList(prev => [...prev, newMember])
    setSelectedId(newMember.id)
    setActiveTab("Overview")
  }

  const memberToFormData = (m: Member): MemberFormData => ({
    name: m.name, email: m.email, role: m.role, department: m.department,
    employment: m.employment, startDate: m.startDate, slackId: m.slackId,
    timezone: m.timezone, bio: m.bio,
  })

  const handleEditSave = (data: MemberFormData) => {
    const initials = data.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    setMemberList(prev => prev.map(m =>
      m.id === selectedId
        ? { ...m, ...data, initials, department: data.department as Member["department"], employment: data.employment as Member["employment"], status: data.employment as Member["status"] }
        : m
    ))
  }

  const handleDelete = () => {
    const idx = memberList.findIndex(m => m.id === selectedId)
    const next = memberList[idx + 1] ?? memberList[idx - 1]
    setMemberList(prev => prev.filter(m => m.id !== selectedId))
    if (next) setSelectedId(next.id)
    setDeleteConfirmOpen(false)
  }

  return (
    <div className="flex gap-0 w-full h-full bg-background">
      <AddMemberModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddMember} />
      <AddMemberModal
        isOpen={editModalOpen}
        mode="edit"
        initialData={memberToFormData(member)}
        onClose={() => setEditModalOpen(false)}
        onAdd={handleEditSave}
      />

      {/* Delete confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-foreground">Remove Team Member</h2>
            <p className="text-[13px] text-muted-foreground">Are you sure you want to remove <span className="font-medium text-foreground">{member.name}</span>? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-[280px] shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Directory</h2>
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-8 pr-3 text-[13px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <SelectField value={deptFilter} onChange={setDeptFilter} options={["All Departments", "Strategy", "QA", "Development", "Management", "Design"]} containerClassName="flex-1 min-w-0" />
            <SelectField value={statusFilter} onChange={setStatusFilter} options={["All Statuses", "Active", "Inactive"]} containerClassName="flex-1 min-w-0" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((m) => {
            const dept = deptColors[m.department]
            return (
              <button
                key={m.id}
                onClick={() => { setSelectedId(m.id); setActiveTab("Overview") }}
                className={cn(
                  "w-full text-left px-4 py-3.5 border-l-[3px] transition-colors flex items-center gap-3",
                  selectedId === m.id ? "bg-accent/50 border-l-sky-500" : "border-l-transparent hover:bg-accent/30"
                )}
              >
                <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-semibold text-muted-foreground">{m.initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-foreground block truncate">{m.name}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", dept?.bg, dept?.text)}>{m.department}</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", m.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>{m.status}</span>
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && <div className="py-8 text-center text-[13px] text-muted-foreground">No members found</div>}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 min-w-0 bg-card rounded-r-xl overflow-hidden flex flex-col">
        <div className="px-8 pt-6 pb-0 border-b border-border">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center">
                <span className="text-lg font-semibold text-muted-foreground">{member.initials}</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{member.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", deptColors[member.department]?.bg, deptColors[member.department]?.text)}>{member.department}</span>
                  <span className="text-[13px] text-muted-foreground">{member.role}</span>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", member.employment === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>{member.employment}</span>
                </div>
              </div>
            </div>
            <div className="relative shrink-0 pt-1" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-border bg-card shadow-md py-1">
                  <button
                    onClick={() => { setEditModalOpen(true); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-foreground hover:bg-accent transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    Edit
                  </button>
                  <button
                    onClick={() => { setDeleteConfirmOpen(true); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-6 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn(
                "text-[13px] font-medium pb-3 border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>{tab}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === "Overview" && <OverviewTab member={member} />}
          {activeTab === "Assigned Clients" && <AssignedClientsTab member={member} />}
          {activeTab === "Schedule" && <ScheduleTab member={member} />}
          {activeTab === "Settings" && <SettingsTab member={member} />}
        </div>
      </div>
    </div>
  )
}

/* ── Overview Tab ── */
function OverviewTab({ member }: { member: Member }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Department" value={member.department} />
        <StatCard label="Clients Assigned" value={member.clients} />
      </div>

      <div className="bg-background rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">About</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{member.bio}</p>
      </div>

      <CollapsibleSection title="Contact Information" defaultOpen>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <DetailField label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
            <a href={`mailto:${member.email}`} className="text-sky-600 hover:underline">{member.email}</a>
          </DetailField>
          <DetailField label="Timezone" icon={<Globe className="h-3.5 w-3.5" />}>{member.timezone}</DetailField>
          <DetailField label="Start Date" icon={<Clock className="h-3.5 w-3.5" />}>{member.startDate}</DetailField>
          <DetailField label="Slack ID" icon={<FileText className="h-3.5 w-3.5" />}>{member.slackId}</DetailField>
        </div>
      </CollapsibleSection>

      {member.assignedClients.length > 0 && (
        <CollapsibleSection title={`Assigned Clients (${member.assignedClients.length})`} defaultOpen>
          <div className="flex flex-wrap gap-2">
            {member.assignedClients.map((c) => (
              <span key={c.name} className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground">{c.name}</span>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

/* ── Assigned Clients Tab ── */
function AssignedClientsTab({ member }: { member: Member }) {
  if (member.assignedClients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-20 w-20 rounded-2xl bg-accent/40 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground/25" />
        </div>
        <span className="text-[13px] text-muted-foreground">No clients assigned</span>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-accent/30">
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Experiments</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {member.assignedClients.map((c, i) => (
            <tr key={c.name} className={cn("border-b border-border/50 transition-colors hover:bg-accent/20", i % 2 === 0 && "bg-accent/10")}>
              <td className="px-5 py-3.5 text-[13px] font-medium text-foreground">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground/50" />
                  {c.name}
                </div>
              </td>
              <td className="px-5 py-3.5">
                <span className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-md border",
                  c.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"
                )}>{c.status}</span>
              </td>
              <td className="px-5 py-3.5 text-[13px] text-foreground">{c.experiments}</td>
              <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{c.lastActive}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Schedule Tab ── */
function ScheduleTab({ member }: { member: Member }) {
  const schedule = member.schedule
  const [calYear, setCalYear] = useState(2026)
  const [calMonth, setCalMonth] = useState(1)
  const [todayInfo, setTodayInfo] = useState<{ d: number; m: number; y: number } | null>(null)

  useEffect(() => {
    const now = new Date()
    setTodayInfo({ d: now.getDate(), m: now.getMonth(), y: now.getFullYear() })
  }, [])

  const monthName = `${MONTHS[calMonth]} ${calYear}`
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDow = new Date(calYear, calMonth, 1).getDay()

  const calDays: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) calDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d)
  while (calDays.length % 7 !== 0) calDays.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7))

  const tasksForDay = (d: number) => schedule.filter((t) => t.day === d && t.month === calMonth && t.year === calYear)

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }

  const isToday = (d: number | null) => d !== null && todayInfo !== null && d === todayInfo.d && calMonth === todayInfo.m && calYear === todayInfo.y

  if (schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-20 w-20 rounded-2xl bg-accent/40 flex items-center justify-center mb-4">
          <CalendarDays className="h-8 w-8 text-muted-foreground/25" />
        </div>
        <span className="text-[13px] text-muted-foreground">No scheduled tasks</span>
      </div>
    )
  }

  const monthTasks = schedule.filter((t) => t.month === calMonth && t.year === calYear).sort((a, b) => a.day - b.day)

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors"><ChevronLeft className="h-4 w-4 text-muted-foreground" /></button>
          <span className="text-sm font-semibold text-foreground">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors"><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                const dt = day ? tasksForDay(day) : []
                return (
                  <div key={di} className={cn("h-[80px] border-t border-r border-border p-1.5 relative", di === 0 && "border-l", isToday(day) && "bg-sky-50/40")}>
                    {day && (
                      <>
                        <span className={cn(
                          "text-[11px] font-medium inline-flex items-center justify-center",
                          isToday(day) ? "bg-sky-500 text-white h-5 w-5 rounded-full" : "text-foreground"
                        )}>{day}</span>
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          {dt.slice(0, 2).map((t, ti) => {
                            const s = typeStyles[t.type]
                            return <div key={ti} className={cn("text-[9px] font-medium px-1 py-0.5 rounded truncate border", s.bg, s.border)}>{t.title}</div>
                          })}
                          {dt.length > 2 && <span className="text-[9px] text-muted-foreground pl-1">{`+${dt.length - 2} more`}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline list */}
      <ContentCard title="Upcoming Tasks">
        {monthTasks.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground">No tasks this month</div>
        ) : (
          <div className="divide-y divide-border">
            {monthTasks.map((t, i) => {
              const s = typeStyles[t.type]
              return (
                <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-accent/20 transition-colors">
                  <div className="text-center shrink-0 w-10">
                    <span className="text-[11px] text-muted-foreground block">{MONTHS[t.month].slice(0, 3)}</span>
                    <span className="text-lg font-semibold text-foreground leading-none">{t.day}</span>
                  </div>
                  <div className={cn("w-1 h-9 rounded-full shrink-0", s.dot)} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-foreground block truncate">{t.title}</span>
                    <span className="text-[12px] text-muted-foreground">{t.client}</span>
                  </div>
                  <span className="text-[12px] text-muted-foreground shrink-0">{t.time}</span>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded border shrink-0", s.bg, s.border)}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </ContentCard>
    </div>
  )
}

/* ── Settings Tab ── */
function SettingsTab({ member }: { member: Member }) {
  return (
    <div className="flex flex-col gap-8">
      <CollapsibleSection title="Account Settings" defaultOpen>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <DetailField label="Slack Member ID" icon={<FileText className="h-3.5 w-3.5" />}>{member.slackId}</DetailField>
          <DetailField label="Timezone" icon={<Globe className="h-3.5 w-3.5" />}>{member.timezone}</DetailField>
          <DetailField label="Start Date" icon={<Clock className="h-3.5 w-3.5" />}>{member.startDate}</DetailField>
          <DetailField label="Email" icon={<Mail className="h-3.5 w-3.5" />}>{member.email}</DetailField>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Employment Details" defaultOpen>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <DetailField label="Employment Status">
            <span className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-md border inline-block",
              member.employment === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"
            )}>{member.employment}</span>
          </DetailField>
          <DetailField label="Role">{member.role}</DetailField>
          <DetailField label="Department">
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", deptColors[member.department]?.bg, deptColors[member.department]?.text)}>{member.department}</span>
          </DetailField>
          <DetailField label="Clients Assigned">{member.clients}</DetailField>
        </div>
      </CollapsibleSection>
    </div>
  )
}

/* ── Helpers ── */
function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-4">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && children}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <MetricCard 
      label={label} 
      value={value}
    />
  )
}

function DetailField({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-[13px] text-foreground">{children}</div>
    </div>
  )
}
