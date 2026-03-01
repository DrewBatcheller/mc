"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Star, FileText, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/shared/metric-card"
import { ContentCard } from "@/components/shared/content-card"
import { SelectField } from "@/components/shared/select-field"
import { ResultsGrid } from "@/components/experiments/results-grid"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip } from "recharts"

/* ── Data ── */
const RESULT_IMG = "https://i.imgur.com/u50b3Yy.png"

const clients = [
  { id: 1, name: "Sereneherbs", status: "Active" as const, color: "bg-emerald-400",
    planType: "3 Tests", sentiment: 2, mrr: 10000, totalPaid: 10000, ltv: null,
    email: "ktuffour@sereneherbs.com", website: "Sereneherbs.com", devHours: null,
    closedDate: "2025-10-24", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C09NTD9QDJR", slackMembers: "U07SZ69E511",
    strategist: "Connor Shelefontifuk", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 3, inProgress: 0, inconclusive: 0, unsuccessful: 1, successful: 2,
    revenueAdded: 0.04, roi: 274,
    revenueByMonth: [{ month: "Nov 2025", revenue: 37423 }],
    results: [
      { name: "Introduce 6 Bottle Option", status: "Successful" as const, mrr: "$24.1K" },
      { name: "PDP Restructure", status: "Successful" as const, mrr: "$13.4K" },
      { name: "Introduce Founders Story", status: "Unsuccessful" as const, mrr: "$0.0K" },
    ],
    contracts: ["General_Services_Agreement_-_Serene_Herbs_LLC.pdf", "SOW_-_3_Tests.pdf"],
  },
  { id: 2, name: "Live Love Locks LLC", status: "Active" as const, color: "bg-sky-400",
    planType: "2 Tests", sentiment: 4, mrr: 6000, totalPaid: 48000, ltv: 48000,
    email: "info@livelovelocks.com", website: "livelovelocks.com", devHours: 12,
    closedDate: "2024-06-15", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C08RLOCKS", slackMembers: "U08LOCKS01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 8, inProgress: 1, inconclusive: 2, unsuccessful: 3, successful: 3,
    revenueAdded: 2.4, roi: 156,
    revenueByMonth: [{ month: "Sep 2024", revenue: 800 }, { month: "Dec 2024", revenue: 1200 }, { month: "Mar 2025", revenue: 400 }],
    results: [
      { name: "Remove Collections Outbound Link", status: "Successful" as const, mrr: "$2.4K" },
      { name: "Free Shipping Topbar", status: "Successful" as const, mrr: "$22.0K" },
    ],
    contracts: ["SOW_-_2_Tests.pdf"],
  },
  { id: 3, name: "Goose Creek Candles", status: "Active" as const, color: "bg-emerald-400",
    planType: "Course", sentiment: 5, mrr: 5000, totalPaid: 156000, ltv: 156000,
    email: "team@goosecreek.com", website: "goosecreekcandles.com", devHours: 20,
    closedDate: "2023-03-10", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C07GCC", slackMembers: "U07GCC01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 15, inProgress: 2, inconclusive: 3, unsuccessful: 4, successful: 8,
    revenueAdded: 11.8, roi: 310,
    revenueByMonth: [{ month: "Jun 2024", revenue: 3200 }, { month: "Sep 2024", revenue: 4100 }, { month: "Jan 2025", revenue: 4500 }],
    results: [
      { name: "Prominent Installments Option", status: "Unsuccessful" as const, mrr: "$0.0K" },
      { name: "Collection Tiles Redesign", status: "Unsuccessful" as const, mrr: "$0.0K" },
    ],
    contracts: ["SOW_-_Course.pdf"],
  },
  { id: 4, name: "Shop Noble", status: "Active" as const, color: "bg-violet-400",
    planType: "2 Tests", sentiment: 3, mrr: 6000, totalPaid: 42000, ltv: 42000,
    email: "hello@shopnoble.com", website: "shopnoble.com", devHours: 8,
    closedDate: "2024-02-20", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C09NOBLE", slackMembers: "U09NOBLE01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 5, inProgress: 1, inconclusive: 1, unsuccessful: 1, successful: 2,
    revenueAdded: 1.2, roi: 89,
    revenueByMonth: [{ month: "Aug 2024", revenue: 600 }, { month: "Nov 2024", revenue: 600 }],
    results: [],
    contracts: ["SOW_-_2_Tests.pdf"],
  },
  { id: 5, name: "Perfect White Tee", status: "Active" as const, color: "bg-sky-400",
    planType: "3 Tests", sentiment: 5, mrr: 6000, totalPaid: 75560, ltv: 75560,
    email: "team@perfectwhitetee.com", website: "perfectwhitetee.com", devHours: 18,
    closedDate: "2023-08-01", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C07PWT", slackMembers: "U07PWT01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 12, inProgress: 0, inconclusive: 2, unsuccessful: 5, successful: 5,
    revenueAdded: 29.2, roi: 520,
    revenueByMonth: [{ month: "Mar 2024", revenue: 8200 }, { month: "Jul 2024", revenue: 12000 }, { month: "Nov 2024", revenue: 9000 }],
    results: [
      { name: "Cart Redesign (Foundational)", status: "Unsuccessful" as const, mrr: "$0.0K" },
      { name: "Separate CTA on Homepage", status: "Successful" as const, mrr: "$29.2K" },
    ],
    contracts: ["SOW_-_3_Tests.pdf"],
  },
  { id: 6, name: "Cosara", status: "Active" as const, color: "bg-teal-400",
    planType: "3 Tests", sentiment: 4, mrr: 8000, totalPaid: 64000, ltv: 64000,
    email: "hello@cosara.com", website: "cosara.com", devHours: 15,
    closedDate: "2024-01-12", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C08COSARA", slackMembers: "U08COS01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 10, inProgress: 0, inconclusive: 3, unsuccessful: 3, successful: 4,
    revenueAdded: 21.3, roi: 245,
    revenueByMonth: [{ month: "May 2024", revenue: 5200 }, { month: "Sep 2024", revenue: 8000 }, { month: "Jan 2025", revenue: 8100 }],
    results: [
      { name: "Silent Tech Sound Comparison", status: "Successful" as const, mrr: "$21.3K" },
    ],
    contracts: ["SOW_-_3_Tests.pdf"],
  },
  { id: 7, name: "Vita Hustle", status: "Active" as const, color: "bg-emerald-400",
    planType: "3 Tests", sentiment: 4, mrr: 10000, totalPaid: 80000, ltv: 80000,
    email: "team@vitahustle.com", website: "vitahustle.com", devHours: 22,
    closedDate: "2023-11-05", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C07VH", slackMembers: "U07VH01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 14, inProgress: 2, inconclusive: 2, unsuccessful: 4, successful: 6,
    revenueAdded: 19.0, roi: 198,
    revenueByMonth: [{ month: "Apr 2024", revenue: 4500 }, { month: "Aug 2024", revenue: 7200 }, { month: "Dec 2024", revenue: 7300 }],
    results: [
      { name: "Upsell Fountain Insurance", status: "Unsuccessful" as const, mrr: "$0.0K" },
      { name: "Price Test Oxford", status: "Successful" as const, mrr: "$11.8K" },
    ],
    contracts: ["SOW_-_3_Tests.pdf"],
  },
  { id: 8, name: "The Ayurveda Experience", status: "Active" as const, color: "bg-sky-400",
    planType: "3 Tests", sentiment: 3, mrr: 8000, totalPaid: 56000, ltv: 56000,
    email: "team@theayurvedaexperience.com", website: "theayurvedaexperience.com", devHours: 14,
    closedDate: "2024-03-22", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C08TAE", slackMembers: "U08TAE01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 7, inProgress: 3, inconclusive: 1, unsuccessful: 1, successful: 2,
    revenueAdded: 4.1, roi: 102,
    revenueByMonth: [{ month: "Oct 2024", revenue: 1800 }, { month: "Jan 2025", revenue: 2300 }],
    results: [
      { name: "Amazon Style Collections on HP", status: "Successful" as const, mrr: "$4.1K" },
    ],
    contracts: ["SOW_-_3_Tests.pdf"],
  },
  { id: 9, name: "Fake Brand", status: "Active" as const, color: "bg-amber-400",
    planType: "2 Tests", sentiment: 3, mrr: 5000, totalPaid: 25000, ltv: 25000,
    email: "info@fakebrand.com", website: "fakebrand.com", devHours: 6,
    closedDate: "2025-02-11", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C09FB", slackMembers: "U09FB01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 4, inProgress: 4, inconclusive: 0, unsuccessful: 0, successful: 0,
    revenueAdded: 3069.06, roi: 0,
    revenueByMonth: [],
    results: [],
    contracts: ["SOW_-_2_Tests.pdf"],
  },
  { id: 10, name: "Dr Woof Apparel", status: "Active" as const, color: "bg-violet-400",
    planType: "3 Tests", sentiment: null, mrr: 6000, totalPaid: 12000, ltv: 12000,
    email: "hello@drwoofapparel.com", website: "drwoofapparel.com", devHours: 4,
    closedDate: "2026-02-19", churnDate: null, churnReason: null, churnFeedback: null,
    slackChannel: "C09DWA", slackMembers: "U09DWA01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 0, inProgress: 3, inconclusive: 0, unsuccessful: 0, successful: 0,
    revenueAdded: 0, roi: 0,
    revenueByMonth: [],
    results: [],
    contracts: ["SOW_-_3_Tests.pdf"],
  },
  { id: 11, name: "Infinite Age", status: "Inactive" as const, color: "bg-rose-300",
    planType: "2 Tests", sentiment: null, mrr: 4500, totalPaid: 52300, ltv: 52300,
    email: "team@infiniteage.com", website: "infiniteage.com", devHours: 16,
    closedDate: "2023-05-18", churnDate: "2025-06-01", churnReason: "Market Shift", churnFeedback: "CRO became less of a priority",
    slackChannel: "C07IA", slackMembers: "U07IA01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 11, inProgress: 0, inconclusive: 1, unsuccessful: 3, successful: 7,
    revenueAdded: 67.9, roi: 890,
    revenueByMonth: [{ month: "Sep 2023", revenue: 12000 }, { month: "Mar 2024", revenue: 25000 }, { month: "Oct 2024", revenue: 30900 }],
    results: [
      { name: "Redesign UVPs Max 3", status: "Successful" as const, mrr: "$67.9K" },
    ],
    contracts: ["SOW_-_2_Tests.pdf"],
  },
  { id: 12, name: "TryAyuri", status: "Inactive" as const, color: "bg-rose-300",
    planType: "1 Test", sentiment: null, mrr: 3000, totalPaid: 9000, ltv: 9000,
    email: "info@tryayuri.com", website: "tryayuri.com", devHours: 3,
    closedDate: "2025-01-10", churnDate: "2025-04-10", churnReason: "Budget Issues", churnFeedback: "Funds reallocated",
    slackChannel: "C09TA", slackMembers: "U09TA01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 2, inProgress: 0, inconclusive: 1, unsuccessful: 1, successful: 0,
    revenueAdded: 0, roi: 0,
    revenueByMonth: [],
    results: [],
    contracts: ["SOW_-_1_Test.pdf"],
  },
  { id: 13, name: "28Pilates", status: "Inactive" as const, color: "bg-orange-300",
    planType: "2 Tests", sentiment: null, mrr: 5000, totalPaid: 20000, ltv: 20000,
    email: "info@28pilates.com", website: "28pilates.com", devHours: 5,
    closedDate: "2024-09-01", churnDate: "2025-01-01", churnReason: "Unrealistic Expectations", churnFeedback: null,
    slackChannel: "C08P28", slackMembers: "U08P2801",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 3, inProgress: 0, inconclusive: 0, unsuccessful: 2, successful: 1,
    revenueAdded: 0, roi: 0,
    revenueByMonth: [],
    results: [],
    contracts: ["SOW_-_2_Tests.pdf"],
  },
  { id: 14, name: "Arrowhead", status: "Inactive" as const, color: "bg-violet-300",
    planType: "3 Tests", sentiment: null, mrr: 3000, totalPaid: 60850, ltv: 60850,
    email: "team@arrowhead.com", website: "arrowhead.com", devHours: 10,
    closedDate: "2023-06-20", churnDate: "2025-08-01", churnReason: "Switched to Competitor", churnFeedback: null,
    slackChannel: "C07AH", slackMembers: "U07AH01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 9, inProgress: 0, inconclusive: 2, unsuccessful: 4, successful: 3,
    revenueAdded: 11.7, roi: 130,
    revenueByMonth: [{ month: "Dec 2023", revenue: 3000 }, { month: "Jun 2024", revenue: 4500 }, { month: "Dec 2024", revenue: 4200 }],
    results: [
      { name: "ENHANCED Rapid Clasp Retention Belt", status: "Unsuccessful" as const, mrr: "$0.0K" },
      { name: "Introduce FAQ on PDP", status: "Successful" as const, mrr: "$11.7K" },
    ],
    contracts: ["SOW_-_3_Tests.pdf"],
  },
  { id: 15, name: "Gatsby", status: "Inactive" as const, color: "bg-rose-300",
    planType: "2 Tests", sentiment: null, mrr: 5000, totalPaid: 55250, ltv: 55250,
    email: "team@gatsby.com", website: "gatsby.com", devHours: 10,
    closedDate: "2023-07-01", churnDate: "2025-03-01", churnReason: "Internal Changes", churnFeedback: "Leadership change",
    slackChannel: "C07GA", slackMembers: "U07GA01",
    strategist: "Jayden Gray", designer: "Tobi Akinloye", developer: "Arafat Islam", qa: "Anna Anikeieva",
    experimentsExecuted: 6, inProgress: 0, inconclusive: 1, unsuccessful: 2, successful: 3,
    revenueAdded: 11.8, roi: 145,
    revenueByMonth: [{ month: "Jan 2024", revenue: 4000 }, { month: "Jul 2024", revenue: 7800 }],
    results: [
      { name: "Price Test Oxford", status: "Successful" as const, mrr: "$11.8K" },
    ],
    contracts: ["SOW_-_2_Tests.pdf"],
  },
]

type Client = (typeof clients)[number]

// Team member options
const teamMembers = {
  strategists: ["Connor Shelefontifuk", "Jayden Gray", "Sarah Mitchell", "Marcus Lee"],
  designers: ["Tobi Akinloye", "Emma Watson", "Carlos Rivera"],
  developers: ["Arafat Islam", "Kevin Nguyen", "Sophia Park"],
  qa: ["Anna Anikeieva", "David Kim", "Rachel Green"]
}

// Contacts data
interface Contact {
  id: number
  clientId: number
  fullName: string
  email: string
  companyName: string
  userType: "Main Point of Contact" | "C-Suite" | "Management" | "Finance" | "Marketing" | "Legal" | "Contractor"
  slackMemberId: string
  companySlackChannelId: string
  receiveNotifications: boolean
  avatar?: string
  lastModified: string
  callRecords: number // count of linked call records
}

const contactsData: Contact[] = [
  {
    id: 1, clientId: 1, fullName: "Kwabena Tuffour", email: "ktuffour@sereneherbs.com",
    companyName: "Sereneherbs", userType: "Main Point of Contact",
    slackMemberId: "U07SZ69E511", companySlackChannelId: "C09NTD9QDJR",
    receiveNotifications: true, lastModified: "2026-02-20", callRecords: 3
  },
  {
    id: 2, clientId: 2, fullName: "Sarah Johnson", email: "sarah@livelovelocks.com",
    companyName: "Live Love Locks LLC", userType: "Main Point of Contact",
    slackMemberId: "U08LOCKS01", companySlackChannelId: "C08RLOCKS",
    receiveNotifications: true, lastModified: "2026-02-18", callRecords: 5
  },
  {
    id: 3, clientId: 2, fullName: "Mike Chen", email: "mike@livelovelocks.com",
    companyName: "Live Love Locks LLC", userType: "Marketing",
    slackMemberId: "U08LOCKS02", companySlackChannelId: "C08RLOCKS",
    receiveNotifications: false, lastModified: "2026-01-15", callRecords: 1
  },
  {
    id: 4, clientId: 3, fullName: "Emily Rodriguez", email: "emily@goosecreek.com",
    companyName: "Goose Creek Candles", userType: "C-Suite",
    slackMemberId: "U07GCC01", companySlackChannelId: "C07GCC",
    receiveNotifications: true, lastModified: "2026-02-19", callRecords: 8
  },
  {
    id: 5, clientId: 1, fullName: "James Wilson", email: "james@sereneherbs.com",
    companyName: "Sereneherbs", userType: "Finance",
    slackMemberId: "U07SZ69E512", companySlackChannelId: "C09NTD9QDJR",
    receiveNotifications: false, lastModified: "2025-12-10", callRecords: 0
  },
]

const tip = {
  fontSize: 12, borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", backgroundColor: "white",
}

const tabs = [
  "Client Results",
  "Client Details",
  "Contacts",
  "Experiment Ideas",
  "Experiments in Schedule",
  "Experiment Results",
]

const statusColors = {
  Successful: { bg: "bg-emerald-50", color: "text-emerald-700", border: "border-emerald-200" },
  Unsuccessful: { bg: "bg-rose-50", color: "text-rose-700", border: "border-rose-200" },
  Inconclusive: { bg: "bg-amber-50", color: "text-amber-700", border: "border-amber-200" },
} as const

function Stars({ count }: { count: number | null }) {
  if (count === null) return <span className="text-[12px] text-muted-foreground">-</span>
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          )}
        />
      ))}
    </div>
  )
}

export function ClientDirectory() {
  const searchParams = useSearchParams()
  const clientParam = searchParams.get("client")
  
  const [selectedId, setSelectedId] = useState(clientParam || clients[0].id)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Client Results")
  const [resultFilter, setResultFilter] = useState("All Results")

  // Update selected client when URL param changes
  useEffect(() => {
    if (clientParam && clients.find((c) => c.id === clientParam)) {
      setSelectedId(clientParam)
    }
  }, [clientParam])

  const filtered = useMemo(
    () => clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  )

  const client = clients.find((c) => c.id === selectedId) ?? clients[0]

  const filteredResults = useMemo(() => {
    if (resultFilter === "All Results") return client.results
    return client.results.filter((r) => r.status === resultFilter)
  }, [client, resultFilter])

  return (
    <div className="flex gap-0 w-full h-full bg-background">
      {/* ── Sidebar ── */}
      <div className="w-[280px] shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground mb-1.5">Directory</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-3 text-[12px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setActiveTab("Client Results") }}
              className={cn(
                "w-full text-left px-3 py-2.5 border-l-[3px] transition-colors",
                selectedId === c.id
                  ? "bg-accent/50 border-l-sky-500"
                  : "border-l-transparent hover:bg-accent/30"
              )}
            >
              <span className="text-[13px] font-medium text-foreground block">{c.name}</span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block",
                c.status === "Active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              )}>
                {c.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Detail Panel ── */}
      <div className="flex-1 min-w-0 bg-card flex flex-col overflow-hidden">
        <div className="px-8 pt-6 pb-0 border-b border-border sticky top-0 bg-card z-10 flex-shrink-0">
          <h1 className="text-xl font-semibold text-foreground mb-5">{client.name}</h1>
          <div className="flex gap-6 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[13px] font-medium pb-3 border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-5">
          {activeTab === "Client Results" && <ClientResultsTab client={client} />}
          {activeTab === "Client Details" && <ClientDetailsTab client={client} />}
          {activeTab === "Contacts" && <ContactsTab clientId={client.id} />}
          {activeTab === "Experiment Ideas" && <EmptyTab label="No ideas yet" action="Add Test Idea" />}
          {activeTab === "Experiments in Schedule" && <EmptyTab label="No records yet" />}
          {activeTab === "Experiment Results" && (
            <ExperimentResultsTab
              results={filteredResults}
              filter={resultFilter}
              setFilter={setResultFilter}
            />
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

function ClientResultsTab({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Experiments Executed" value={client.experimentsExecuted} />
        <StatCard label="Experiments in Progress" value={client.inProgress} />
      </div>
      <div className="grid grid-cols-5 gap-3">
              <StatCard label="Inconclusive" value={client.inconclusive} small />
              <StatCard label="Unsuccessful" value={client.unsuccessful} small />
              <StatCard label="Successful" value={client.successful} small />
              <StatCard label="Revenue Added (MRR)" value={`$${client.revenueAdded % 1 === 0 ? client.revenueAdded.toFixed(0) : client.revenueAdded.toFixed(2)}M`} small />
              <StatCard label="ROI" value={`${client.roi}%`} small />
      </div>
      {client.revenueByMonth.length > 0 && (
        <ContentCard title="Revenue Added by Month">
          <div className="p-5 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={client.revenueByMonth}>
                <CartesianGrid vertical={false} stroke="hsl(220,13%,91%)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(200,80%,55%)" dot={{ fill: "hsl(200,80%,55%)", r: 4 }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>
        )}
      </div>
    )
  }

function ClientDetailsTab({ client }: { client: Client }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email,
    website: client.website,
    slackChannel: client.slackChannel,
    strategist: client.strategist,
    designer: client.designer,
    developer: client.developer,
    qa: client.qa,
    notes: ""
  })

  const handleSave = () => {
    // Would save to API/Airtable here
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Edit/Save button */}
      <div className="flex justify-end">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-accent hover:bg-accent/80 border border-border px-3.5 text-[12px] font-medium transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false)
                setFormData({
                  name: client.name,
                  email: client.email,
                  website: client.website,
                  slackChannel: client.slackChannel,
                  strategist: client.strategist,
                  designer: client.designer,
                  developer: client.developer,
                  qa: client.qa,
                  notes: ""
                })
              }}
              className="h-8 rounded-lg bg-muted hover:bg-muted/80 px-3.5 text-[12px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="h-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-3.5 text-[12px] font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <>
          {/* Read-only view */}
          <ContentCard title="Client Details">
            <ClientDetailsInline client={client} />
          </ContentCard>
          <CollapsibleSection title="Team">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Strategist" value={client.strategist} />
              <DetailField label="Designer" value={client.designer} />
              <DetailField label="Developer" value={client.developer} />
              <DetailField label="QA" value={client.qa} />
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Contracts">
            <div className="space-y-2">
              {client.contracts.map((c, i) => (
                <button key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors w-full text-left">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-[13px] text-foreground truncate">{c}</span>
                </button>
              ))}
            </div>
          </CollapsibleSection>
          <ContentCard title="Notes">
            <div className="min-h-[80px] text-[13px] text-muted-foreground/50 p-5">
              {formData.notes || "No notes"}
            </div>
          </ContentCard>
        </>
      ) : (
        <>
          {/* Edit mode - organized form */}
          <ContentCard title="Basic Information">
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Brand Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Slack Channel</label>
                <input
                  type="text"
                  value={formData.slackChannel}
                  onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  placeholder="C09NTD9QDJR"
                />
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Team Members">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Strategist</label>
                <SelectField
                  value={formData.strategist}
                  onChange={(v) => setFormData({ ...formData, strategist: v })}
                  options={teamMembers.strategists}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Designer</label>
                <SelectField
                  value={formData.designer}
                  onChange={(v) => setFormData({ ...formData, designer: v })}
                  options={teamMembers.designers}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Developer</label>
                <SelectField
                  value={formData.developer}
                  onChange={(v) => setFormData({ ...formData, developer: v })}
                  options={teamMembers.developers}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">QA</label>
                <SelectField
                  value={formData.qa}
                  onChange={(v) => setFormData({ ...formData, qa: v })}
                  options={teamMembers.qa}
                  containerClassName="w-full"
                  className="w-full"
                />
              </div>
            </div>
          </ContentCard>

          <CollapsibleSection title="Contracts">
            <div className="space-y-2">
              {client.contracts.map((c, i) => (
                <button key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors w-full text-left">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-[13px] text-foreground truncate">{c}</span>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          <ContentCard title="Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
              placeholder="Add notes about this client..."
            />
          </ContentCard>
        </>
      )}
    </div>
  )
}

function ClientDetailsInline({ client }: { client: Client }) {
  return (
    <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-6">
      <DetailField label="Email" value={client.email} />
      <DetailField label="Website" value={client.website} />
      <DetailField label="Slack Channel" value={client.slackChannel} />
      <DetailField label="Plan Type" value={client.planType} />
      <DetailField label="Dev Hours" value={client.devHours ? `${client.devHours} hrs` : "—"} />
      <DetailField label="Closed Date" value={client.closedDate} />
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-[14px] text-foreground">{value}</p>
    </div>
  )
}

function ContactsTab({ clientId }: { clientId: number }) {
  const [contacts, setContacts] = useState(contactsData.filter(c => c.clientId === clientId))
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)

  const userTypeOptions = ["Main Point of Contact", "C-Suite", "Management", "Finance", "Marketing", "Legal", "Contractor"] as const

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsAddingContact(true)}
          className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-3.5 text-[12px] font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[13px] text-muted-foreground mb-2">No contacts yet</p>
          <button 
            onClick={() => setIsAddingContact(true)}
            className="text-[12px] font-medium text-sky-600 hover:text-sky-700"
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">User Type</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Slack Member ID</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Notifications</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Call Records</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b last:border-0 border-border hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-foreground">{contact.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-border bg-accent text-foreground">
                      {contact.userType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{contact.slackMemberId}</td>
                  <td className="px-4 py-3 text-center">
                    {contact.receiveNotifications ? (
                      <span className="text-emerald-600 text-[11px] font-medium">Yes</span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums">{contact.callRecords}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingContact(contact)}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                        title="Edit Contact"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeletingContact(contact)}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {(isAddingContact || editingContact) && (
        <ContactModal
          contact={editingContact}
          clientId={clientId}
          userTypeOptions={userTypeOptions}
          onSave={(newContact) => {
            if (editingContact) {
              setContacts(contacts.map(c => c.id === newContact.id ? newContact : c))
            } else {
              setContacts([...contacts, { ...newContact, id: Date.now() }])
            }
            setIsAddingContact(false)
            setEditingContact(null)
          }}
          onCancel={() => {
            setIsAddingContact(false)
            setEditingContact(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">Delete Contact?</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Are you sure you want to delete {deletingContact.fullName}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingContact(null)}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setContacts(contacts.filter(c => c.id !== deletingContact.id))
                  setDeletingContact(null)
                }}
                className="px-3 py-2 text-sm font-medium bg-destructive text-white hover:bg-destructive/90 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactModal({
  contact,
  clientId,
  userTypeOptions,
  onSave,
  onCancel,
}: {
  contact: Contact | null
  clientId: number
  userTypeOptions: readonly string[]
  onSave: (contact: Contact) => void
  onCancel: () => void
}) {
  const client = clients.find(c => c.id === clientId)
  const [formData, setFormData] = useState<Partial<Contact>>(
    contact || {
      fullName: "",
      email: "",
      companyName: client?.name || "",
      userType: "Main Point of Contact",
      slackMemberId: "",
      companySlackChannelId: client?.slackChannel || "",
      receiveNotifications: true,
      lastModified: new Date().toISOString().split('T')[0],
      callRecords: 0,
      clientId,
    }
  )

  const handleSubmit = () => {
    if (formData.fullName && formData.email) {
      onSave(formData as Contact)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg border border-border p-6 max-w-2xl w-full shadow-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">
          {contact ? "Edit Contact" : "Add Contact"}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Full Name *</label>
              <input
                type="text"
                value={formData.fullName || ""}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Email *</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Company Name</label>
              <input
                type="text"
                value={formData.companyName || ""}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                disabled
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">User Type</label>
              <SelectField
                value={formData.userType || "Main Point of Contact"}
                onChange={(v) => setFormData({ ...formData, userType: v as Contact['userType'] })}
                options={userTypeOptions}
                containerClassName="w-full"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Slack Member ID</label>
              <input
                type="text"
                value={formData.slackMemberId || ""}
                onChange={(e) => setFormData({ ...formData, slackMemberId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                placeholder="U07SZ69E511"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Company Slack Channel ID</label>
              <input
                type="text"
                value={formData.companySlackChannelId || ""}
                onChange={(e) => setFormData({ ...formData, companySlackChannelId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                placeholder="C09NTD9QDJR"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.receiveNotifications || false}
                onChange={(e) => setFormData({ ...formData, receiveNotifications: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-[13px] text-foreground">Receive Notifications</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.fullName || !formData.email}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded transition-colors",
              formData.fullName && formData.email
                ? "bg-sky-600 text-white hover:bg-sky-700"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {contact ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyTab({ label, action }: { label: string; action?: string }) {
  return (
  <div className="flex flex-col items-center justify-center py-12 text-center">
  <p className="text-[13px] text-muted-foreground mb-2">{label}</p>
  {action && <button className="text-[12px] font-medium text-sky-600 hover:text-sky-700">{action}</button>}
  </div>
  )
  }

function ExperimentResultsTab({ results, filter, setFilter }: { results: Array<{ name: string; status: "Successful" | "Unsuccessful" | "Inconclusive"; mrr: string }>; filter: string; setFilter: (f: string) => void }) {
  return (
    <div>
      <ResultsGrid />
    </div>
  )
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 py-3 border-t border-border bg-background/50">{children}</div>}
    </div>
  )
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <MetricCard 
      label={label} 
      value={value}
      small={small}
    />
  )
}
