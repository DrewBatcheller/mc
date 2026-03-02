"use client"

import { Fragment, useState, useMemo, useEffect, useRef } from "react"
import {
  ChevronDown,
  ChevronRight,
  Search,
  Play,
  Pencil,
  Trash2,
  ExternalLink,
  Layers,
  FlaskConical,
  Zap,
  CheckCircle2,
  ArrowLeftRight,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/UserContext"
import { useAirtable } from "@/hooks/use-airtable"

/* ── Types ── */
interface Experiment {
  name: string
  description: string
  status: string
  placement: string
  placementUrl?: string
  devices: string
  geos: string
  variants: string
  revenue: string
  primaryGoals?: string[]
  hypothesis?: string
  rationale?: string
  weighting?: string
  revenueAddedMrr?: string
  nextSteps?: string
  variantData?: {
    name: string
    status?: string
    trafficPercent?: number
    visitors: number
    conversions: number
    cr?: number
    crPercent?: number
    crImprovement: number
    crConfidence?: number
    rpv: number
    rpvImprovement: number
    rpvConfidence?: number
    revenue: number
    revenueImprovement: number
    appv?: number
    appvImprovement?: number
  }[]
  launchDate?: string
  endDate?: string
  deployed?: boolean
  whatHappened?: string
  [key: string]: unknown
}

interface Batch {
  client: string
  launchDate: string
  finishDate: string
  status: string
  tests: number
  revenueImpact: string
  experiments: Experiment[]
}

/* ── Data ── */
const { data: batchesData } = useAirtable('batches', {
  fields: ['Batch Key', 'Launch Date', 'All Tests Status', 'Linked Test Names', 'Revenue Added (MRR)', 'PTA Due Date'],
})

const { data: experimentsData } = useAirtable('experiments', {
  fields: ['Test Description', 'Test Status', 'Placement', 'Batch', 'Launch Date', 'End Date', 'Devices', 'GEOs'],
})

const { user } = useUser()

// Transform Airtable data into batches for THIS CLIENT ONLY
const batches: Batch[] = useMemo(() => {
  if (!batchesData) return []
  return batchesData.map(batch => {
    const linkedTests = batch.fields['Linked Test Names']
    const testCount = Array.isArray(linkedTests) 
      ? linkedTests.length 
      : typeof linkedTests === 'string' && linkedTests
      ? linkedTests.split(',').length
      : 0
    
    // Link experiments to this batch
    const batchExperiments = (experimentsData || []).filter(exp => {
      const linkedBatches = exp.fields['Batch'] as string[] | undefined
      return linkedBatches?.includes(batch.id)
    }).map(exp => ({
      name: exp.fields['Test Description'] as string || 'Unnamed Test',
      description: '',
      status: exp.fields['Test Status'] as string || 'Pending',
      placement: exp.fields['Placement'] as string || '',
      devices: exp.fields['Devices'] as string || 'All Devices',
      geos: Array.isArray(exp.fields['GEOs']) ? (exp.fields['GEOs'] as string[]).join(', ') : '',
      variants: '-',
      revenue: '$0',
    }))
    
    return {
      client: user?.name || 'Unknown Client',
      launchDate: batch.fields['Launch Date'] as string || '',
      finishDate: batch.fields['PTA Due Date'] as string || '',
      status: batch.fields['All Tests Status'] as string || 'No Tests',
      tests: testCount,
      revenueImpact: batch.fields['Revenue Added (MRR)'] as string || '$0',
      experiments: batchExperiments,
    }
  })
}, [batchesData, experimentsData, user])
  "In Progress": "bg-sky-50 text-sky-700",
  Live: "bg-emerald-50 text-emerald-700",
  Mixed: "bg-amber-50 text-amber-700",
  Pending: "bg-accent text-muted-foreground",
  "No Tests": "bg-accent text-muted-foreground",
  Unsuccessful: "bg-rose-50 text-rose-700",
  Blocked: "bg-red-50 text-red-700",
  Successful: "bg-emerald-50 text-emerald-700",
  Inconclusive: "bg-amber-50 text-amber-700",
}

// Map all statuses to 4 main batch statuses
const mapBatchStatus = (status: string): "Pending" | "In Progress" | "Live" | "Completed" => {
  const statusLower = status.toLowerCase()
  if (statusLower === "in progress") return "In Progress"
  if (statusLower === "live") return "Live"
  if (statusLower === "completed" || statusLower === "successful" || statusLower === "unsuccessful" || statusLower === "inconclusive") return "Completed"
  return "Pending"
}

const batches: Batch[] = [
  {
    client: "Dr Woof Apparel",
    launchDate: "Feb 19, 2026",
    finishDate: "Mar 5, 2026",
    status: "In Progress",
    tests: 3,
    revenueImpact: "$0",
    experiments: [
      { name: "Mobile Navigation Category Tabs (Socks vs. Scrubs)", description: "By implementing a tabbed toggle at the top of the...", status: "Pending", placement: "Mobile Menu", placementUrl: undefined, devices: "Mobile", geos: "AL", variants: "-", revenue: "-" },
      { name: "Collection Page Visual Navigation Bubbles", description: "Introducing horizontal scrolling \"bubble\" navigatio...", status: "Pending", placement: "Top of Collection Pages", placementUrl: "drwoofapparel.com/collections/", devices: "All Devices", geos: "AL", variants: "-", revenue: "-" },
      { name: "High-Visibility \"Always-On\" Search Header", description: "Making the search functionality a permanent, high...", status: "Pending", placement: "Header/Navigation", placementUrl: undefined, devices: "All Devices", geos: "AL", variants: "-", revenue: "-" },
    ],
  },
  {
    client: "Fake Brand",
    launchDate: "Feb 11, 2026",
    finishDate: "Feb 25, 2026",
    status: "Live",
    tests: 4,
    revenueImpact: "$3,069,062",
    experiments: [
      { name: "Homepage Hero Redesign", description: "Testing new hero layout with video background", status: "Live", placement: "Homepage", devices: "All Devices", geos: "US", variants: "3", revenue: "$1,200,000" },
      { name: "Cart Upsell Module", description: "Adding recommended products to cart drawer", status: "Live", placement: "Cart Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$869,062" },
      { name: "PDP Social Proof Banner", description: "Real-time purchase notification widget", status: "Successful", placement: "Product Page", devices: "Mobile", geos: "US", variants: "2", revenue: "$500,000" },
      { name: "Checkout Trust Badges", description: "Security and trust badges above checkout button", status: "Successful", placement: "Checkout", devices: "All Devices", geos: "US", variants: "2", revenue: "$500,000" },
    ],
  },
  {
    client: "Cosara",
    launchDate: "Feb 10, 2026",
    finishDate: "Feb 24, 2026",
    status: "No Tests",
    tests: 0,
    revenueImpact: "$0",
    experiments: [],
  },
  {
    client: "The Ayurveda Experience",
    launchDate: "Jan 22, 2026",
    finishDate: "Feb 5, 2026",
    status: "In Progress",
    tests: 3,
    revenueImpact: "$0",
    experiments: [
      { name: "Quiz Funnel Landing Page", description: "Interactive product finder quiz", status: "In Progress", placement: "Landing Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
      { name: "Bundle Builder Tool", description: "Custom bundle creation interface", status: "In Progress", placement: "Collection Page", devices: "Desktop", geos: "US", variants: "2", revenue: "$0" },
      { name: "Exit Intent Offer", description: "Last-chance discount popup on exit", status: "Pending", placement: "Sitewide", devices: "Desktop", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Cosara",
    launchDate: "Jan 18, 2026",
    finishDate: "Feb 1, 2026",
    status: "Mixed",
    tests: 2,
    revenueImpact: "$0",
    experiments: [
      { name: "Navigation Mega Menu", description: "Expanded category mega menu with images", status: "Successful", placement: "Header", devices: "Desktop", geos: "US", variants: "2", revenue: "$0" },
      { name: "Mobile Sticky ATC Bar", description: "Persistent add-to-cart bar on scroll", status: "Unsuccessful", placement: "Product Page", devices: "Mobile", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Vita Hustle",
    launchDate: "Jan 15, 2026",
    finishDate: "Jan 29, 2026",
    status: "Mixed",
    tests: 2,
    revenueImpact: "$19,027",
    experiments: [
      { name: "Subscription Savings Calculator", description: "Interactive savings comparison tool", status: "Successful", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$19,027" },
      { name: "Reviews Section Redesign", description: "New reviews layout with photo gallery", status: "Inconclusive", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Perfect White Tee",
    launchDate: "Jan 1, 2026",
    finishDate: "Jan 15, 2026",
    status: "In Progress",
    tests: 3,
    revenueImpact: "$0",
    experiments: [
      { name: "Size Guide Enhancement", description: "Interactive size guide with fit photos", status: "In Progress", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
      { name: "Collection Page Quick View", description: "Quick view modal on collection grid", status: "In Progress", placement: "Collection Page", devices: "Desktop", geos: "US", variants: "2", revenue: "$0" },
      { name: "Loyalty Banner", description: "Rewards program signup banner", status: "Pending", placement: "Sitewide", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Live Love Locks LLC",
    launchDate: "Dec 18, 2025",
    finishDate: "Jan 1, 2026",
    status: "In Progress",
    tests: 1,
    revenueImpact: "$0",
    experiments: [
      { name: "Gift Builder Wizard", description: "Step-by-step custom gift configuration", status: "In Progress", placement: "Gift Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Perfect White Tee",
    launchDate: "Dec 4, 2025",
    finishDate: "Dec 18, 2025",
    status: "In Progress",
    tests: 3,
    revenueImpact: "$0",
    experiments: [
      { name: "Fabric Detail Section", description: "Expandable fabric details with macro photos", status: "In Progress", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
      { name: "Mini Cart Redesign", description: "Floating mini cart with recommendations", status: "Pending", placement: "Sitewide", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
      { name: "Homepage Bestsellers Row", description: "Dynamic bestseller carousel", status: "Pending", placement: "Homepage", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Blanks By Thirty",
    launchDate: "Dec 4, 2025",
    finishDate: "Dec 18, 2025",
    status: "In Progress",
    tests: 1,
    revenueImpact: "$0",
    experiments: [
      { name: "Color Swatch Enhancement", description: "Larger, more visual color swatches", status: "In Progress", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Cosara",
    launchDate: "Nov 30, 2025",
    finishDate: "Dec 14, 2025",
    status: "Mixed",
    tests: 3,
    revenueImpact: "$21,279",
    experiments: [
      { name: "Urgency Timer on PDP", description: "Countdown timer for limited stock", status: "Successful", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$21,279" },
      { name: "Collection Filter Sidebar", description: "Advanced filtering sidebar", status: "Unsuccessful", placement: "Collection Page", devices: "Desktop", geos: "US", variants: "2", revenue: "$0" },
      { name: "Mobile Hamburger Redesign", description: "New mobile menu layout", status: "Inconclusive", placement: "Header", devices: "Mobile", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Live Love Locks LLC",
    launchDate: "Nov 20, 2025",
    finishDate: "Dec 4, 2025",
    status: "No Tests",
    tests: 1,
    revenueImpact: "$0",
    experiments: [
      { name: "Engraving Preview Tool", description: "Real-time engraving text preview", status: "Pending", placement: "Product Page", devices: "All Devices", geos: "US", variants: "-", revenue: "$0" },
    ],
  },
  {
    client: "Vita Hustle",
    launchDate: "Nov 19, 2025",
    finishDate: "Dec 3, 2025",
    status: "Unsuccessful",
    tests: 1,
    revenueImpact: "$0",
    experiments: [
      { name: "Popup Nutrition Facts", description: "Nutritional info popup on product cards", status: "Unsuccessful", placement: "Collection Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Primal Queen",
    launchDate: "Nov 9, 2025",
    finishDate: "Nov 23, 2025",
    status: "Blocked",
    tests: 4,
    revenueImpact: "$0",
    experiments: [
      { name: "Ingredient Spotlight Section", description: "Highlighted ingredient benefits carousel", status: "Blocked", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
      { name: "Before & After Gallery", description: "Customer transformation photo gallery", status: "Blocked", placement: "Product Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
      { name: "Autoship Savings Banner", description: "Subscription discount promotion", status: "Blocked", placement: "Cart Page", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
      { name: "Quiz Recommendation Engine", description: "Personalized product quiz", status: "Blocked", placement: "Homepage", devices: "All Devices", geos: "US", variants: "2", revenue: "$0" },
    ],
  },
  {
    client: "Sereneherbs",
    launchDate: "Nov 7, 2025",
    finishDate: "Nov 20, 2025",
    status: "Mixed",
    tests: 3,
    revenueImpact: "$37,423",
    experiments: [
      { name: "Herbal Benefits Accordion", description: "Expandable benefits section per herb", status: "Successful", placement: "Product Page", placementUrl: "https://example.com/products", devices: "All Devices", geos: "United States", variants: "2", revenue: "$37,423", primaryGoals: ["AOV", "Bounce Rate"], hypothesis: "Expanding herb benefits accordion will increase product understanding and AOV", rationale: "User research showed customers wanted more herb information before purchase", weighting: "50/50", goalMetric1: "Average Order Value", goalMetric2: "Add to Cart Rate", metric1Increase: "+12.3%", metric2Increase: "+8.1%", revenueAddedMrr: "$37,423", confidenceLevel: "95%", deploySegment: "All Users", deployed: true, launchDate: "Nov 7, 2025", endDate: "Nov 14, 2025", whatHappened: "Accordion performed well with older demographic, boosted AOV significantly", nextSteps: "Expand to other product pages", imageType: "Screenshot", controlImage: "Control", variantImage: "Variant", resultsImage: "Results", ptaResult: "Success", batchName: "Sereneherbs", testStatus: "Live - Collecting Data", designMockupUrl: "https://figma.com/design/sereneherbs-accordion", developmentUrl: "https://convert.com/experiments/sereneherbs-accordion", qaSignedOff: true, qaSignOffDate: "Feb 12, 2026", variantData: [{ name: "Control", status: "Completed", trafficPercent: 50, visitors: 12450, conversions: 623, revenue: 45000, revenueImprovement: 0, crPercent: 5.0, crImprovement: 0, crConfidence: 0, rpv: 3.61, rpvImprovement: 0, rpvConfidence: 0, appv: 72.18, appvImprovement: 0 }, { name: "Expandable Accordion", status: "Completed", trafficPercent: 50, visitors: 12380, conversions: 700, revenue: 82423, revenueImprovement: 83.2, crPercent: 5.65, crImprovement: 13.0, crConfidence: 92, rpv: 6.65, rpvImprovement: 84.2, rpvConfidence: 95, appv: 117.75, appvImprovement: 63.1 }] },
      { name: "Free Shipping Progress Bar", description: "Cart progress bar to free shipping threshold", status: "Unsuccessful", placement: "Cart Page", placementUrl: "https://example.com/cart", devices: "All Devices", geos: "United States", variants: "2", revenue: "$0", primaryGoals: ["AOV"], hypothesis: "Progress bar showing free shipping threshold will increase order value", rationale: "Customers were adding items to cart and leaving without hitting threshold", weighting: "50/50", goalMetric1: "Avg Cart Value", goalMetric2: "Conversion Rate", metric1Increase: "-2.1%", metric2Increase: "+0.3%", revenueAddedMrr: "$0", confidenceLevel: "72%", deploySegment: "50% of Users", deployed: false, launchDate: "Nov 10, 2025", endDate: "Nov 17, 2025", whatHappened: "Progress bar created friction in checkout flow, reduced AOV", nextSteps: "Test different placement or design", imageType: "Screenshot", controlImage: "Control", variantImage: "Variant", resultsImage: "Results", ptaResult: "Failed", batchName: "Sereneherbs", testStatus: "Unsuccessful", designMockupUrl: "https://figma.com/design/sereneherbs-progress", developmentUrl: "https://convert.com/experiments/sereneherbs-progress", qaSignedOff: true, qaSignOffDate: "Feb 10, 2026", variantData: [{ name: "Control", status: "Completed", trafficPercent: 50, visitors: 9840, conversions: 1148, revenue: 62500, revenueImprovement: 0, crPercent: 11.66, crImprovement: 0, crConfidence: 0, rpv: 6.35, rpvImprovement: 0, rpvConfidence: 0, appv: 54.41, appvImprovement: 0 }, { name: "Progress Bar", status: "Completed", trafficPercent: 50, visitors: 10020, conversions: 1133, revenue: 61200, revenueImprovement: -2.1, crPercent: 11.31, crImprovement: -3.0, crConfidence: 45, rpv: 6.11, rpvImprovement: -3.8, rpvConfidence: 38, appv: 54.04, appvImprovement: -0.7 }] },
      { name: "Blog Integration on PDP", description: "Related articles section on product pages", status: "Inconclusive", placement: "Product Page", placementUrl: "https://example.com/products", devices: "Desktop", geos: "United States", variants: "2", revenue: "$0", primaryGoals: ["Session Depth"], hypothesis: "Related blog articles will increase engagement and trust", rationale: "Blog content provides product context and SEO benefits", weighting: "50/50", goalMetric1: "Time on Page", goalMetric2: "Click Through Rate", metric1Increase: "+3.2%", metric2Increase: "-1.5%", revenueAddedMrr: "$0", confidenceLevel: "58%", deploySegment: "Desktop Users", deployed: false, launchDate: "Nov 13, 2025", endDate: "Nov 20, 2025", whatHappened: "Increased time on page but reduced product page CTR", nextSteps: "Redesign placement and article selection algorithm", imageType: "Screenshot", controlImage: "Control", variantImage: "Variant", resultsImage: "Results", ptaResult: "Inconclusive", batchName: "Sereneherbs", testStatus: "In Progress - QA", designMockupUrl: "https://figma.com/design/sereneherbs-blog", developmentUrl: "https://convert.com/experiments/sereneherbs-blog", qaSignedOff: false, pausedReason: "Waiting for blog content from editorial team", variantData: [{ name: "Control", status: "Completed", trafficPercent: 50, visitors: 7650, conversions: 842, revenue: 38900, revenueImprovement: 0, crPercent: 11.0, crImprovement: 0, crConfidence: 0, rpv: 5.08, rpvImprovement: 0, rpvConfidence: 0, appv: 46.19, appvImprovement: 0 }, { name: "Blog Section", status: "Completed", trafficPercent: 50, visitors: 7590, conversions: 815, revenue: 37750, revenueImprovement: -2.95, crPercent: 10.73, crImprovement: -2.5, crConfidence: 32, rpv: 4.97, rpvImprovement: -2.16, rpvConfidence: 28, appv: 46.32, appvImprovement: 0.28 }] },
    ],
  },
]

const allStatuses = ["All Statuses", "Pending", "In Progress", "Live", "Completed"]
const allClients = ["All Clients", ...Array.from(new Set(batches.map((b) => b.client))).sort()]

/* ── Stat Cards ── */
const trackerStats = [
  { label: "Total Batches", value: "192", icon: Layers },
  { label: "Total Experiments", value: "528", icon: FlaskConical },
  { label: "Live Now", value: "4", icon: Zap },
  { label: "Successful", value: "422", icon: CheckCircle2 },
]

/* ── Component ── */
export function ClientTracker() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Action modals state
  const [actionBatch, setActionBatch] = useState<Batch | null>(null)
  const [launchMenuBatch, setLaunchMenuBatch] = useState<Batch | null>(null)
  const [launchMenuOpen, setLaunchMenuOpen] = useState(false)
  const [editingLaunchDate, setEditingLaunchDate] = useState<string>("")
  const [confirmAction, setConfirmAction] = useState<{ type: string; batch: Batch } | null>(null)
  const [deleteTestsModal, setDeleteTestsModal] = useState<Batch | null>(null)
  const [selectBatchModal, setSelectBatchModal] = useState<Batch | null>(null)
  const [convertExperimentModal, setConvertExperimentModal] = useState<Experiment | null>(null)
  const [isCreatingNewBatch, setIsCreatingNewBatch] = useState(false)
  const [newBatchDate, setNewBatchDate] = useState("")
  const [showThankYou, setShowThankYou] = useState(false)
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set())

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedBatches(new Set())
    } else {
      setSelectedBatches(new Set(filtered.map((_, i) => i)))
    }
  }

  const toggleBatch = (i: number) => {
    setSelectedBatches(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const exportCSV = () => {
    const selected = filtered.filter((_, i) => selectedBatches.has(i))
    if (selected.length === 0) return

    const rows: string[][] = []
    rows.push([
      "Client", "Launch Date", "Finish Date", "Batch Status", "Tests",
      "Experiment", "Description", "Exp Status", "Placement", "Placement URL",
      "Devices", "GEOs", "Variants", "Revenue", "Hypothesis", "Rationale",
      "Primary Goals", "Weighting", "Revenue Added MRR", "Next Steps",
      "Launch Date (Exp)", "End Date (Exp)", "Deployed", "What Happened",
      "Variant Name", "Variant Status", "Traffic %", "Visitors", "Conversions",
      "CR", "CR Improvement", "CR Confidence", "RPV", "RPV Improvement",
      "RPV Confidence", "Variant Revenue", "Revenue Improvement"
    ])

    for (const batch of selected) {
      if (batch.experiments.length === 0) {
        rows.push([
          batch.client, batch.launchDate, batch.finishDate, mapBatchStatus(batch.status),
          String(batch.tests),
          ...Array(32).fill("")
        ])
        continue
      }
      for (const exp of batch.experiments) {
        const baseExp = [
          batch.client, batch.launchDate, batch.finishDate, mapBatchStatus(batch.status),
          String(batch.tests),
          exp.name, exp.description, exp.status, exp.placement, exp.placementUrl ?? "",
          exp.devices, exp.geos, exp.variants, exp.revenue,
          exp.hypothesis ?? "", exp.rationale ?? "",
          (exp.primaryGoals ?? []).join("; "), exp.weighting ?? "",
          exp.revenueAddedMrr ?? "", exp.nextSteps ?? "",
          exp.launchDate ?? "", exp.endDate ?? "",
          exp.deployed ? "Yes" : "No", exp.whatHappened ?? "",
        ]
        if (exp.variantData && exp.variantData.length > 0) {
          for (const v of exp.variantData) {
            rows.push([
              ...baseExp,
              v.name, v.status ?? "", String(v.trafficPercent ?? ""),
              String(v.visitors), String(v.conversions),
              String(v.crPercent ?? v.cr ?? ""), String(v.crImprovement),
              String(v.crConfidence ?? ""),
              String(v.rpv), String(v.rpvImprovement),
              String(v.rpvConfidence ?? ""),
              String(v.revenue), String(v.revenueImprovement),
            ])
          }
        } else {
          rows.push([...baseExp, ...Array(13).fill("")])
        }
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batch-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const launchMenuRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let result = [...batches]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.client.toLowerCase().includes(q) ||
          b.experiments.some((e) => e.name.toLowerCase().includes(q))
      )
    }
      if (statusFilter !== "All Statuses") result = result.filter((b) => mapBatchStatus(b.status) === statusFilter)
    return result
    }, [search, statusFilter])

  const allFilteredSelected = filtered.length > 0 && filtered.every((_, i) => selectedBatches.has(i))

  // Close launch menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (launchMenuRef.current && !launchMenuRef.current.contains(event.target as Node)) {
        setLaunchMenuOpen(false)
      }
    }
    
    if (launchMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [launchMenuOpen])

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trackerStats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Expandable table */}
      <div className="bg-card rounded-xl border border-border">
        {/* Toolbar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-border">
          <div className="flex items-center gap-2">
            <SelectField value={statusFilter} onChange={setStatusFilter} options={allStatuses} />
          </div>
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batches, experiments..."
              className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={exportCSV}
            disabled={selectedBatches.size === 0}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border hover:bg-accent text-foreground px-3 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                  />
                </th>
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Launch Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Finish Date</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground text-left">Tests</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((batch, i) => {
                const isExpanded = expandedIdx === i
                return (
                  <Fragment key={`${batch.client}-${i}`}>
                    {/* Batch row */}
                    <tr
                      className={cn(
                        "border-b border-border transition-colors hover:bg-accent/30 cursor-pointer",
                        isExpanded && "bg-accent/20"
                      )}
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    >
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedBatches.has(i)}
                          onChange={() => toggleBatch(i)}
                          className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium text-foreground whitespace-nowrap">
                        {batch.launchDate}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {batch.finishDate}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={cn(
                          "text-[12px] font-medium px-2.5 py-1 rounded-md",
                          statusStyles[mapBatchStatus(batch.status)] || "bg-accent text-foreground"
                        )}>
                          {mapBatchStatus(batch.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                        {batch.tests}
                      </td>
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="relative" ref={launchMenuBatch?.client === batch.client ? launchMenuRef : null}>
                            <button 
                              onClick={() => {
                                setLaunchMenuBatch(batch)
                                setLaunchMenuOpen(!launchMenuOpen)
                              }}
                              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                            >
                              <Play className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            {launchMenuBatch?.client === batch.client && launchMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 w-48 flex flex-col">
                                {['Launch Strategy', 'Launch Design', 'Launch Dev', 'Launch QA', 'Launch Tests', 'Launch Mid-test Checkin', 'Launch PTA'].map((action, idx, arr) => (
                                  <button
                                    key={action}
                                    onClick={() => {
                                      setConfirmAction({ type: action, batch })
                                      setLaunchMenuOpen(false)
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 text-[12px] text-foreground text-left hover:bg-muted transition-colors",
                                      idx === 0 && "rounded-t-md",
                                      idx === arr.length - 1 && "rounded-b-md"
                                    )}
                                  >
                                    {action}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => {
                              setActionBatch(batch)
                              setEditingLaunchDate(batch.launchDate)
                            }}
                            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button 
                            onClick={() => setConfirmAction({ type: 'delete', batch })}
                            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded experiment rows */}
                    {isExpanded && batch.experiments.length > 0 && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="bg-accent/10 border-b border-border">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/60">
                                  <th className="px-6 py-2.5 text-[12px] font-medium text-muted-foreground text-left pl-14">Experiment</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Status</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Placement</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Devices</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">GEOs</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-left">Variants</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-right">Revenue</th>
                                  <th className="px-4 py-2.5 text-[12px] font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.experiments.map((exp, ei) => (
                                  <tr 
                                    key={ei} 
                                    className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors cursor-pointer"
                                    onClick={() => {
                                      setSelectedExperiment(exp)
                                      setSelectedBatch(batch)
                                      setIsModalOpen(true)
                                    }}
                                  >
                                    <td className="px-6 py-3 pl-14">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[13px] font-medium text-foreground">{exp.name}</span>
                                        <span className="text-[11px] text-muted-foreground">{exp.description}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={cn(
                                        "text-[11px] font-medium px-2 py-0.5 rounded-md",
                                        statusStyles[exp.status] || "bg-accent text-foreground"
                                      )}>
                                        {exp.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[12px] text-foreground">{exp.placement}</span>
                                        {exp.placementUrl && (
                                          <span className="text-[11px] text-sky-600 flex items-center gap-0.5">
                                            <ExternalLink className="h-2.5 w-2.5" />
                                            {exp.placementUrl}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.devices}</td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.geos}</td>
                                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{exp.variants}</td>
                                    <td className={cn(
                                      "px-4 py-3 text-[12px] text-right whitespace-nowrap tabular-nums font-medium",
                                      exp.revenue !== "$0" && exp.revenue !== "-" ? "text-emerald-600" : "text-muted-foreground"
                                    )}>
                                      {exp.revenue}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setConvertExperimentModal(exp)
                                        }}
                                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors ml-auto"
                                        title="Convert Experiment back into Idea"
                                      >
                                        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Experiment Details Modal */}
      <ExperimentDetailsModal 
        isOpen={isModalOpen}
        experiment={selectedExperiment}
        batchKey={selectedBatch ? `${selectedBatch.client} | ${selectedBatch.launchDate}` : undefined}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Edit Launch Date Modal */}
      {actionBatch && !confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-3">Edit Launch Date</h3>
            <p className="text-[13px] text-muted-foreground mb-4">Batch: <span className="font-medium text-foreground">{actionBatch.client}</span></p>
            <input
              type="date"
              value={editingLaunchDate}
              onChange={(e) => setEditingLaunchDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-1 focus:ring-ring mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setActionBatch(null)}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setActionBatch(null)
                  // Handle save logic here
                }}
                className="px-3 py-2 text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 rounded transition-colors"
              >
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">
              {confirmAction.type === 'delete' ? 'Delete Batch?' : `Confirm ${confirmAction.type}?`}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              {confirmAction.type === 'delete' 
                ? `Are you sure you want to delete the "${confirmAction.batch.client}" batch? This action cannot be undone.`
                : `Proceed with ${confirmAction.type.toLowerCase()} for the "${confirmAction.batch.client}" batch?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'delete') {
                    setDeleteTestsModal(confirmAction.batch)
                    setConfirmAction(null)
                  } else {
                    setConfirmAction(null)
                    // Handle other action logic here
                  }
                }}
                className={cn(
                  "px-3 py-2 text-sm font-medium text-white rounded transition-colors",
                  confirmAction.type === 'delete' ? "bg-destructive hover:bg-destructive/90" : "bg-sky-600 hover:bg-sky-700"
                )}
              >
                {confirmAction.type === 'delete' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tests Modal - What to do with existing tests */}
      {deleteTestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-md shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">What to do with existing tests?</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              The "{deleteTestsModal.client}" batch contains {deleteTestsModal.tests} test{deleteTestsModal.tests === 1 ? '' : 's'}. Choose what to do with them:
            </p>
            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => {
                  setDeleteTestsModal(null)
                  // Handle desync logic - convert tests back to ideas
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors"
              >
                <div className="font-medium text-foreground text-sm">Desync</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">Convert tests back into test ideas</div>
              </button>
              <button
                onClick={() => {
                  setSelectBatchModal(deleteTestsModal)
                  setDeleteTestsModal(null)
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors"
              >
                <div className="font-medium text-foreground text-sm">Select Batch</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">Move tests to another batch</div>
              </button>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTestsModal(null)}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Batch Modal */}
      {selectBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-md shadow-lg">
            {!isCreatingNewBatch ? (
              <>
                <h3 className="text-base font-semibold text-foreground mb-2">Select Batch</h3>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Choose an existing {selectBatchModal.client} batch or create a new one to move the tests to:
                </p>
                <div className="mb-4 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setIsCreatingNewBatch(true)
                        setNewBatchDate("")
                      }}
                      className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-border bg-accent/50 text-left hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-foreground text-sm">+ Create New Batch</div>
                    </button>
                    {batches
                      .filter((batch) => batch.client === selectBatchModal.client)
                      .map((batch, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectBatchModal(null)
                            setIsCreatingNewBatch(false)
                            // Handle select batch
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-left hover:bg-accent transition-colors"
                        >
                          <div className="font-medium text-foreground text-sm">{batch.client}</div>
                          <div className="text-[12px] text-muted-foreground">{batch.launchDate}</div>
                        </button>
                      ))}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setSelectBatchModal(null)
                      setIsCreatingNewBatch(false)
                    }}
                    className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-foreground mb-2">Create New Batch</h3>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Select the launch date for the new {selectBatchModal.client} batch:
                </p>
                <div className="mb-4">
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Launch Date</label>
                  <input
                    type="date"
                    value={newBatchDate}
                    onChange={(e) => setNewBatchDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setIsCreatingNewBatch(false)
                      setNewBatchDate("")
                    }}
                    className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setSelectBatchModal(null)
                      setIsCreatingNewBatch(false)
                      setNewBatchDate("")
                      // Handle create new batch with newBatchDate
                    }}
                    disabled={!newBatchDate}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded transition-colors",
                      newBatchDate
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Convert Experiment Modal */}
      {convertExperimentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg border border-border p-6 max-w-sm shadow-lg">
            <h3 className="text-base font-semibold text-foreground mb-2">Convert Experiment to Idea?</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Are you sure you want to convert "{convertExperimentModal.name}" back into a test idea? This will remove it from the current batch.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConvertExperimentModal(null)}
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConvertExperimentModal(null)
                  setShowThankYou(true)
                  // Handle convert logic here - would make API call to Airtable
                }}
                className="px-3 py-2 text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 rounded transition-colors"
              >
                Convert to Idea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Animation */}
      <ThankYouAnimation 
        isVisible={showThankYou}
        message="Your test is converting to Test Idea"
        onComplete={() => setShowThankYou(false)}
      />
    </div>
  )
}
