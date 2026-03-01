"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, Search, Plus, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { LeadDetailsModal } from "./lead-details-modal"
import { ConvertLeadModal } from "./convert-lead-modal"

interface Lead {
  email: string
  name: string
  stage: string
  timezone: string
  phone: string
  company: string
  website: string
  dealValue: string
  source: string
  medium: string
  created: string
}

const leads: Lead[] = [
  { email: "sdfkhds@sjkhdsfds.com", name: "Bobberton Jiggson", stage: "Onboarding Call", timezone: "sdfdsdfds", phone: "213123", company: "sdkfhsdl", website: "www.cssdfds.com", dealValue: "$5,000", source: "direct", medium: "-", created: "Feb 7, 2026" },
  { email: "dshfgs@sdkhgkds.com", name: "sdhjkfsdjh sdsdkjhfdsk", stage: "Maybe", timezone: "sdfsd", phone: "238473298", company: "sdjhfkjds", website: "www.kdjshfds.com", dealValue: "$2,500", source: "direct", medium: "-", created: "Feb 7, 2026" },
  { email: "bob@testbob.com", name: "test bob", stage: "Closed", timezone: "testbob", phone: "23432432", company: "testbob", website: "www.testbob.com", dealValue: "$3,000", source: "direct", medium: "-", created: "Feb 7, 2026" },
  { email: "denise@tallpeepsfurnishings.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "fb", medium: "paid", created: "Feb 1, 2026" },
  { email: "cheesyredboots@gmail.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "fb", medium: "paid", created: "Feb 1, 2026" },
  { email: "diva@divabusinesssolutions.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "fb", medium: "paid", created: "Feb 1, 2026" },
  { email: "dbaird@trulyengaging.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "ig", medium: "paid", created: "Feb 1, 2026" },
  { email: "realmseeker08@gmail.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "fb", medium: "paid", created: "Feb 1, 2026" },
  { email: "msmobley@msn.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "fb", medium: "paid", created: "Feb 1, 2026" },
  { email: "chris@tradewithbritain.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "fb", medium: "paid", created: "Feb 1, 2026" },
  { email: "woppel68@gmail.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "ig", medium: "paid", created: "Jan 31, 2026" },
  { email: "rachelbinkley@hotmail.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "ig", medium: "paid", created: "Jan 31, 2026" },
  { email: "sdy@loloflo.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "ig", medium: "paid", created: "Jan 31, 2026" },
  { email: "ron@reclaimlabs.com", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "ig", medium: "paid", created: "Jan 31, 2026" },
  { email: "theblessednest@sbcglobal.net", name: "", stage: "Open", timezone: "-", phone: "-", company: "-", website: "-", dealValue: "-", source: "fb", medium: "paid", created: "Jan 31, 2026" },
]

const stageStyles: Record<string, string> = {
  "Open": "bg-accent text-foreground",
  "Qualifying Call": "bg-emerald-50 text-emerald-700",
  "Sales Call": "bg-rose-50 text-rose-700",
  "Onboarding Call": "bg-amber-50 text-amber-700",
  "Closed": "bg-sky-50 text-sky-700",
  "Maybe": "bg-accent text-muted-foreground",
}

const stagesFilter = ["All Stages", "Open", "Qualifying Call", "Sales Call", "Onboarding Call", "Closed", "Maybe", "No Show", "Churned / Rejected"]
const statusesFilter = ["All Status", "Fresh", "Stale", "Old"]

export function LeadsTable() {
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("All Stages")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [sortKey, setSortKey] = useState<keyof Lead>("created")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [allLeads, setAllLeads] = useState(leads)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null)

  const handleSort = (key: keyof Lead) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = useMemo(() => {
    let result = [...allLeads]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.email.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q)
      )
    }
    if (stageFilter !== "All Stages") result = result.filter((l) => l.stage === stageFilter)
    result.sort((a, b) => {
      const aVal = a[sortKey]; const bVal = b[sortKey]
      return sortDir === "asc" ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1)
    })
    return result
  }, [search, stageFilter, statusFilter, sortKey, sortDir])

  const columns: { key: keyof Lead; label: string; align?: "right" }[] = [
    { key: "email", label: "Email" },
    { key: "name", label: "Name" },
    { key: "stage", label: "Stage" },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company" },
    { key: "website", label: "Website" },
    { key: "dealValue", label: "Deal Value", align: "right" },
    { key: "source", label: "Source" },
    { key: "medium", label: "Medium" },
    { key: "created", label: "Created" },
  ]

  return (
    <div className="bg-card rounded-xl border border-border">
      {/* Toolbar */}
      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-border">
        <div className="flex items-center gap-2">
          <SelectField value={statusFilter} onChange={setStatusFilter} options={statusesFilter} />
          <SelectField value={stageFilter} onChange={setStageFilter} options={stagesFilter} />
        </div>
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button 
          onClick={() => {
            setSelectedLead(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 text-[13px] font-medium text-card bg-foreground rounded-lg px-4 py-2 hover:opacity-90 transition-opacity shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Create New Lead
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    <ArrowUpDown className={cn("h-3 w-3", sortKey === col.key ? "text-foreground" : "text-muted-foreground/30")} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-right">
                Convert
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => (
              <tr
                key={lead.email + i}
                onClick={() => {
                  setSelectedLead(lead)
                  setIsModalOpen(true)
                }}
                className={cn(
                  "border-b border-border last:border-0 transition-colors hover:bg-accent/30 cursor-pointer",
                  i % 2 === 1 && "bg-accent/10"
                )}
              >
                <td className="px-4 py-3.5 text-[13px] text-foreground font-medium whitespace-nowrap">
                  {lead.email}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                  {lead.name || "-"}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className={cn(
                    "text-[12px] font-medium px-2 py-0.5 rounded-md",
                    stageStyles[lead.stage] || "bg-accent text-foreground"
                  )}>
                    {lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap tabular-nums">
                  {lead.phone}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                  {lead.company}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                  {lead.website !== "-" ? (
                    <span className="text-sky-600">{lead.website}</span>
                  ) : "-"}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-foreground text-right whitespace-nowrap tabular-nums font-medium">
                  {lead.dealValue}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                  {lead.source}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                  {lead.medium}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
                  {lead.created}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setLeadToConvert(lead)
                      setIsConvertModalOpen(true)
                    }}
                    className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent transition-colors ml-auto group relative"
                    title="Convert Lead to Client"
                  >
                    <UserCheck className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={isModalOpen}
        lead={selectedLead}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedLead(null)
        }}
        onSave={(updatedLead) => {
          if (selectedLead) {
            // Update existing lead
            setAllLeads((prev) =>
              prev.map((l) => (l.email === selectedLead.email ? updatedLead : l))
            )
          } else {
            // Add new lead
            setAllLeads((prev) => [updatedLead, ...prev])
          }
          setIsModalOpen(false)
          setSelectedLead(null)
        }}
        onDelete={(leadToDelete) => {
          setAllLeads((prev) => prev.filter((l) => l.email !== leadToDelete.email))
          setIsModalOpen(false)
          setSelectedLead(null)
        }}
      />

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        lead={leadToConvert}
        onClose={() => {
          setIsConvertModalOpen(false)
          setLeadToConvert(null)
        }}
        onConvert={() => {
          // Handle conversion logic here (for demo, just close)
          setIsConvertModalOpen(false)
          setLeadToConvert(null)
        }}
      />
    </div>
  )
}
