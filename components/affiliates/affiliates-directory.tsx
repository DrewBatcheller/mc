"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Search, Globe, Mail, Briefcase, Users, ExternalLink, Plus, Pencil, Trash2, X, MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/shared/metric-card"
import { ContentCard } from "@/components/shared/content-card"
import { AddPartnerModal, type PartnerFormData } from "./add-partner-modal"
import { EditPartnerModal } from "./edit-partner-modal"
import { SelectField } from "@/components/shared/select-field"
import { clients } from "@/components/clients/clients-table"

/* ── Data ── */
interface Referral { client: string; status: "Active" | "Inactive"; date: string; mrr: number; commission: number }

interface Partner {
  id: number; name: string; initials: string; specialty: string;
  agency: string; title: string; email: string; website: string;
  phone: string; location: string; since: string; status: "Active" | "Inactive";
  referrals: Referral[]; notes: string;
  totalRevenue: number; commission: number;
}

const specialtyColors: Record<string, { bg: string; text: string }> = {
  "Email Marketing":       { bg: "bg-purple-50", text: "text-purple-700" },
  "Google Media Buying":   { bg: "bg-sky-50",    text: "text-sky-700" },
  "Full Stack Media Buying": { bg: "bg-teal-50", text: "text-teal-700" },
  "eCommerce SEO":         { bg: "bg-amber-50",  text: "text-amber-700" },
  "Meta Ads":              { bg: "bg-blue-50",    text: "text-blue-700" },
  "TikTok Ads":            { bg: "bg-rose-50",    text: "text-rose-700" },
}

const partners: Partner[] = [
  {
    id: 1, name: "Max Alderman", initials: "MA", specialty: "Email Marketing",
    agency: "Skyrodigital", title: "CEO", email: "max@skyrodigital.co",
    website: "www.skyrodigital.com", phone: "(555) 901-2345", location: "New York, NY",
    since: "2024-01-15", status: "Active",
    referrals: [
      { client: "Sereneherbs", status: "Active", date: "Oct 2025", mrr: 10000, commission: 10 },
      { client: "Vita Hustle", status: "Active", date: "Sep 2025", mrr: 8000, commission: 10 },
      { client: "The Ayurveda Experience", status: "Active", date: "Nov 2025", mrr: 6000, commission: 10 },
    ],
    notes: "Strong referral partner. Sends high-quality DTC brands that typically close within 2 weeks. Prefers warm introductions via email.",
    totalRevenue: 72000, commission: 7200,
  },
  {
    id: 2, name: "Jackson Blackledge", initials: "JB", specialty: "Google Media Buying",
    agency: "blvckledge", title: "Founder", email: "jackson@blvckledge.com",
    website: "www.blvckledge.com", phone: "(555) 234-5678", location: "Los Angeles, CA",
    since: "2024-04-10", status: "Active",
    referrals: [
      { client: "Perfect White Tee", status: "Active", date: "Aug 2025", mrr: 6000, commission: 10 },
      { client: "Goose Creek Candles", status: "Active", date: "Jun 2025", mrr: 5000, commission: 10 },
    ],
    notes: "Google ads specialist. His clients tend to have strong AOV and are open to CRO testing. Good communication cadence.",
    totalRevenue: 44000, commission: 4400,
  },
  {
    id: 3, name: "Rafayet Rahman", initials: "RR", specialty: "Full Stack Media Buying",
    agency: "Profit Off Ads", title: "Managing Director", email: "rafayet@profitoffads.com",
    website: "www.profitoffads.com", phone: "(555) 345-6789", location: "Miami, FL",
    since: "2024-06-20", status: "Active",
    referrals: [
      { client: "Dr Woof Apparel", status: "Active", date: "Jul 2025", mrr: 8000, commission: 10 },
      { client: "Shop Noble", status: "Active", date: "Sep 2025", mrr: 5000, commission: 10 },
      { client: "Cosara", status: "Active", date: "Nov 2025", mrr: 7000, commission: 15 },
      { client: "Fake Brand", status: "Active", date: "Dec 2025", mrr: 4000, commission: 10 },
    ],
    notes: "Most active referral partner. Manages media buying across Meta, Google, and TikTok. Refers brands of all sizes. Always follows up.",
    totalRevenue: 96000, commission: 9600,
  },
  {
    id: 4, name: "Benjamin Golden", initials: "BG", specialty: "eCommerce SEO",
    agency: "GoldenWeb", title: "Founder & SEO Lead", email: "ben@goldenweb.io",
    website: "www.goldenweb.io", phone: "(555) 456-7890", location: "Austin, TX",
    since: "2025-01-05", status: "Active",
    referrals: [
      { client: "Live Love Locks LLC", status: "Active", date: "Feb 2025", mrr: 6000, commission: 10 },
    ],
    notes: "Newer partner. SEO-focused agency so his clients are usually organic-heavy brands that want to improve on-site conversion.",
    totalRevenue: 18000, commission: 1800,
  },
]

const tabs = ["Overview", "Referrals", "Settings"]

/* ── Main ── */
export function AffiliatesDirectory() {
  const [partnerList, setPartnerList] = useState(partners)
  const [selectedId, setSelectedId] = useState(partners[0].id)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Overview")
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
    () => partnerList.filter((p) => {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.agency.toLowerCase().includes(q) || p.specialty.toLowerCase().includes(q)
    }),
    [search, partnerList]
  )

  const partner = partnerList.find((p) => p.id === selectedId) ?? partnerList[0]
  const sc = specialtyColors[partner.specialty] ?? { bg: "bg-accent", text: "text-foreground" }

  const handleAddPartner = (data: PartnerFormData) => {
    const initials = data.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    const newPartner: Partner = {
      id: Date.now(),
      name: data.name,
      initials,
      specialty: data.specialty,
      agency: data.agency,
      title: data.title,
      email: data.email,
      website: data.website,
      phone: data.phone,
      location: data.location,
      since: new Date().toISOString().split("T")[0],
      status: "Active",
      referrals: [],
      notes: data.notes,
      totalRevenue: 0,
      commission: 0,
    }
    setPartnerList(prev => [...prev, newPartner])
    setSelectedId(newPartner.id)
    setActiveTab("Overview")
  }

  const partnerToFormData = (p: Partner): PartnerFormData => ({
    name: p.name, title: p.title, agency: p.agency, specialty: p.specialty,
    email: p.email, phone: p.phone, website: p.website, location: p.location,
    commissionType: "Percentage", commissionRate: "10",
    paymentMethod: "Bank Transfer", paymentFrequency: "Monthly",
    notes: p.notes,
  })

  const handleEditSave = (data: PartnerFormData) => {
    const initials = data.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    setPartnerList(prev => prev.map(p =>
      p.id === selectedId ? { ...p, ...data, initials } : p
    ))
  }

  const handleDelete = () => {
    const idx = partnerList.findIndex(p => p.id === selectedId)
    const next = partnerList[idx + 1] ?? partnerList[idx - 1]
    setPartnerList(prev => prev.filter(p => p.id !== selectedId))
    if (next) setSelectedId(next.id)
    setDeleteConfirmOpen(false)
  }

  return (
    <div className="flex gap-0 w-full h-full bg-background">
      <AddPartnerModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAddPartner} />
      <EditPartnerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditSave}
        initialData={partnerToFormData(partner)}
      />

      {/* Delete confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-foreground">Delete Partner</h2>
            <p className="text-[13px] text-muted-foreground">Are you sure you want to delete <span className="font-medium text-foreground">{partner.name}</span>? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-[280px] shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Partners</h2>
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-8 pr-3 text-[13px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((p) => {
            const spc = specialtyColors[p.specialty] ?? { bg: "bg-accent", text: "text-foreground" }
            return (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setActiveTab("Overview") }}
                className={cn(
                  "w-full text-left px-4 py-3.5 border-l-[3px] transition-colors flex items-center gap-3",
                  selectedId === p.id ? "bg-accent/50 border-l-sky-500" : "border-l-transparent hover:bg-accent/30"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold text-muted-foreground">{p.initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-foreground block truncate">{p.name}</span>
                  <span className="text-[11px] text-muted-foreground block truncate mt-0.5">{p.agency}</span>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block", spc.bg, spc.text)}>{p.specialty}</span>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && <div className="py-8 text-center text-[13px] text-muted-foreground">No partners found</div>}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 bg-card rounded-r-xl overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-muted-foreground">{partner.initials}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{partner.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[13px] text-muted-foreground">{partner.title} at {partner.agency}</span>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", sc.bg, sc.text)}>{partner.specialty}</span>
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
        </div>

        {/* Tabs */}
        <div className="px-6 mt-5 border-b border-border flex gap-0">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px",
                activeTab === t ? "text-foreground border-foreground" : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >{t}</button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "Overview" && <OverviewTab partner={partner} />}
          {activeTab === "Referrals" && (
            <ReferralsTab
              partner={partner}
              onAddReferral={(r) => setPartnerList(prev => prev.map(p => p.id === selectedId ? { ...p, referrals: [...p.referrals, r] } : p))}
              onEditReferral={(idx, r) => setPartnerList(prev => prev.map(p => p.id === selectedId ? { ...p, referrals: p.referrals.map((ref, i) => i === idx ? r : ref) } : p))}
              onDeleteReferral={(idx) => setPartnerList(prev => prev.map(p => p.id === selectedId ? { ...p, referrals: p.referrals.filter((_, i) => i !== idx) } : p))}
            />
          )}
          {activeTab === "Settings" && <SettingsTab partner={partner} />}
        </div>
      </div>
    </div>
  )
}

/* ── Overview ── */
function OverviewTab({ partner }: { partner: Partner }) {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Total Referrals" 
          value={partner.referrals.length}
        />
        <MetricCard 
          label="Active Referrals" 
          value={partner.referrals.filter(r => r.status === "Active").length}
        />
        <MetricCard 
          label="Total Revenue" 
          value={partner.totalRevenue}
          currency={true}
        />
        <MetricCard 
          label="Commission Earned" 
          value={partner.commission}
          currency={true}
        />
      </div>

      {/* Contact & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ContentCard title="Contact Information">
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Email</span>
                <span className="text-[13px] text-foreground">{partner.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center"><Globe className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Website</span>
                <a href={`https://${partner.website}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-sky-600 hover:underline flex items-center gap-1">
                  {partner.website} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center"><Briefcase className="h-3.5 w-3.5 text-muted-foreground" /></div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Agency</span>
                <span className="text-[13px] text-foreground">{partner.agency}</span>
              </div>
            </div>
          </div>
        </ContentCard>

        <ContentCard title="Partner Details">
          <div className="grid grid-cols-2 gap-4 p-5">
            <div>
              <span className="text-[11px] text-muted-foreground block">Title</span>
              <span className="text-[13px] font-medium text-foreground mt-0.5 block">{partner.title}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Location</span>
              <span className="text-[13px] font-medium text-foreground mt-0.5 block">{partner.location}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Partner Since</span>
              <span className="text-[13px] font-medium text-foreground mt-0.5 block">{partner.since}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Phone</span>
              <span className="text-[13px] font-medium text-foreground mt-0.5 block">{partner.phone}</span>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Notes */}
      <ContentCard title="Notes">
        <div className="p-5">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{partner.notes}</p>
        </div>
      </ContentCard>
    </div>
  )
}

/* ── Referrals ── */
type ReferralHandlers = {
  onAddReferral: (r: Referral) => void
  onEditReferral: (idx: number, r: Referral) => void
  onDeleteReferral: (idx: number) => void
}

const REFERRAL_STATUSES: Referral["status"][] = ["Active", "Inactive"]

const emptyReferral = (): Referral => ({ client: "", status: "Active", date: new Date().toISOString().split("T")[0], mrr: 0, commission: 10 })

function ReferralFormModal({
  title, initial, onSave, onClose,
}: { title: string; initial: Referral; onSave: (r: Referral) => void; onClose: () => void }) {
  const [form, setForm] = useState<Referral>(initial)
  const set = (k: keyof Referral, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Client Name</label>
            <SelectField
              value={form.client || "Select a client"}
              onChange={v => set("client", v === "Select a client" ? "" : v)}
              options={["Select a client", ...clients.map(c => c.brand)]}
              containerClassName="w-full"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Status</label>
            <SelectField
              value={form.status}
              onChange={v => set("status", v as Referral["status"])}
              options={REFERRAL_STATUSES}
              containerClassName="w-full"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Referred Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => set("date", e.target.value)}
              className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">MRR ($)</label>
            <input
              type="number"
              min={0}
              value={form.mrr}
              onChange={e => set("mrr", parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Commission (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.commission}
              onChange={e => set("commission", parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground">Cancel</button>
          <button
            onClick={() => { if (form.client.trim()) { onSave(form); onClose() } }}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ReferralsTab({ partner, onAddReferral, onEditReferral, onDeleteReferral }: { partner: Partner } & ReferralHandlers) {
  const [addOpen, setAddOpen] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {addOpen && (
        <ReferralFormModal
          title="Add Referral"
          initial={emptyReferral()}
          onSave={onAddReferral}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editIdx !== null && (
        <ReferralFormModal
          title="Edit Referral"
          initial={partner.referrals[editIdx]}
          onSave={(r) => { onEditReferral(editIdx, r); setEditIdx(null) }}
          onClose={() => setEditIdx(null)}
        />
      )}
      {deleteIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-foreground">Remove Referral</h2>
            <p className="text-[13px] text-muted-foreground">Remove <span className="font-medium text-foreground">{partner.referrals[deleteIdx]?.client}</span> from the referred clients list?</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setDeleteIdx(null)} className="px-4 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground">Cancel</button>
              <button onClick={() => { onDeleteReferral(deleteIdx); setDeleteIdx(null) }} className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity">Remove</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Referred Clients
          <span className="text-[12px] font-normal text-muted-foreground">{partner.referrals.length} total</span>
        </h3>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Client
        </button>
      </div>

      {partner.referrals.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-accent/40">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Referred</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">MRR</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Commission</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {partner.referrals.map((r, i) => (
                <tr key={i} className={cn("group", i % 2 === 0 ? "bg-card" : "bg-accent/20")}>
                  <td className="px-4 py-3 text-[13px] font-medium text-foreground">{r.client}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-md border",
                      r.status === "Active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-orange-50 border-orange-200 text-orange-700"
                    )}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3 text-[13px] font-medium text-foreground text-right">${r.mrr.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground text-right">{r.commission}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditIdx(i)} className="p-1 rounded hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setDeleteIdx(i)} className="p-1 rounded hover:bg-accent transition-colors"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-[13px] text-muted-foreground">No referrals yet. Click "Add Client" to get started.</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Total Referred MRR</span>
          <p className="text-2xl font-semibold text-foreground">${partner.referrals.reduce((s, r) => s + r.mrr, 0).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Commission (10%)</span>
          <p className="text-2xl font-semibold text-foreground">${(partner.referrals.reduce((s, r) => s + r.mrr, 0) * 0.1).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Settings ── */
function SettingsTab({ partner }: { partner: Partner }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-4">Partner Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Full Name", value: partner.name },
            { label: "Title", value: partner.title },
            { label: "Agency", value: partner.agency },
            { label: "Specialty", value: partner.specialty },
            { label: "Email", value: partner.email },
            { label: "Phone", value: partner.phone },
            { label: "Website", value: partner.website },
            { label: "Location", value: partner.location },
            { label: "Partner Since", value: partner.since },
            { label: "Status", value: partner.status },
          ].map((f, i) => (
            <div key={i}>
              <span className="text-[11px] text-muted-foreground block">{f.label}</span>
              <span className="text-[13px] font-medium text-foreground mt-1 block">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-[13px] font-semibold text-foreground mb-4">Commission Settings</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <span className="text-[11px] text-muted-foreground block">Commission Rate</span>
            <span className="text-[13px] font-medium text-foreground mt-1 block">10%</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Payment Method</span>
            <span className="text-[13px] font-medium text-foreground mt-1 block">Bank Transfer</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Payment Frequency</span>
            <span className="text-[13px] font-medium text-foreground mt-1 block">Monthly</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Contract Status</span>
            <span className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-md border mt-1 inline-block",
              partner.status === "Active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-orange-50 border-orange-200 text-orange-700"
            )}>{partner.status}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
