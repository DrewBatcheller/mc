"use client"

import { useState, useMemo } from "react"
import { Search, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { LeadDetailsModal } from "./lead-details-modal"

interface KanbanLead {
  email: string
  name?: string
  website?: string
  date: string
  source: string
}

interface Column {
  id: string
  label: string
  dotColor: string
  leads: KanbanLead[]
}

const columns: Column[] = [
  {
    id: "open",
    label: "Open",
    dotColor: "bg-foreground",
    leads: [
      { email: "denise@tallpeepsfurnishings.com", date: "Feb 1", source: "fb" },
      { email: "cheesyredboots@gmail.com", date: "Feb 1", source: "fb" },
      { email: "diva@divabusinesssolutions.com", date: "Feb 1", source: "fb" },
      { email: "dbaird@trulyengaging.com", date: "Feb 1", source: "ig" },
      { email: "realmseeker08@gmail.com", date: "Feb 1", source: "fb" },
      { email: "msmobley@msn.com", date: "Feb 1", source: "fb" },
      { email: "chris@tradewithbritain.com", date: "Feb 1", source: "fb" },
      { email: "woppel68@gmail.com", date: "Jan 31", source: "ig" },
      { email: "rachelbinkley@hotmail.com", date: "Jan 31", source: "ig" },
      { email: "sdy@loloflo.com", date: "Jan 31", source: "ig" },
    ],
  },
  {
    id: "qualifying",
    label: "Qualifying Call",
    dotColor: "bg-emerald-500",
    leads: [],
  },
  {
    id: "sales",
    label: "Sales Call",
    dotColor: "bg-rose-500",
    leads: [],
  },
  {
    id: "onboarding",
    label: "Onboarding Call",
    dotColor: "bg-amber-500",
    leads: [
      { email: "sdfkhds@sjkhdsfds.com", name: "Bobberton Jiggson", website: "www.cssdfds.com", date: "Feb 7", source: "direct" },
    ],
  },
  {
    id: "closed",
    label: "Closed",
    dotColor: "bg-sky-500",
    leads: [
      { email: "bob@testbob.com", name: "test bob", website: "www.testbob.com", date: "Feb 7", source: "direct" },
    ],
  },
  {
    id: "maybe",
    label: "Maybe",
    dotColor: "bg-muted-foreground",
    leads: [
      { email: "dshfgs@sdkhgkds.com", name: "sdhjkfsdjh sdsdkjhfdsk", website: "www.kdjshfds.com", date: "Feb 7", source: "direct" },
    ],
  },
]

const statCards = [
  { label: "Total Leads", value: "463" },
  { label: "In Pipeline", value: "79" },
  { label: "Closed", value: "1" },
  { label: "At Risk", value: "0" },
]

const sortOpts = ["Sort: All", "Sort: Newest", "Sort: Oldest"]
const statusOpts = ["All Status", "Fresh", "Stale", "Old"]

export function KanbanBoard() {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState(sortOpts[0])
  const [status, setStatus] = useState(statusOpts[0])
  const [cols, setCols] = useState(columns)
  const [draggedLead, setDraggedLead] = useState<{ lead: KanbanLead; fromColumnId: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [mouseDownTime, setMouseDownTime] = useState(0)

  const filteredCols = useMemo(() => {
    if (!search) return cols
    const q = search.toLowerCase()
    return cols.map((col) => ({
      ...col,
      leads: col.leads.filter(
        (l) =>
          l.email.toLowerCase().includes(q) ||
          l.name?.toLowerCase().includes(q) ||
          l.website?.toLowerCase().includes(q)
      ),
    }))
  }, [search, cols])

  const handleDragStart = (lead: KanbanLead, columnId: string) => {
    setDraggedLead({ lead, fromColumnId: columnId })
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (toColumnId: string) => {
    if (!draggedLead) return

    setCols((prevCols) => {
      const newCols = prevCols.map((col) => {
        if (col.id === draggedLead.fromColumnId) {
          return {
            ...col,
            leads: col.leads.filter((l) => l.email !== draggedLead.lead.email),
          }
        }
        if (col.id === toColumnId) {
          return {
            ...col,
            leads: [...col.leads, draggedLead.lead],
          }
        }
        return col
      })
      return newCols
    })

    setDraggedLead(null)
    setIsDragging(false)
  }

  const handleCardMouseDown = () => {
    setMouseDownTime(Date.now())
  }

  const handleLeadClick = (lead: KanbanLead, columnId: string) => {
    // Only open modal if this was a click, not a drag
    const clickDuration = Date.now() - mouseDownTime
    if (clickDuration > 200) {
      // User was dragging, not clicking
      return
    }

    // Convert KanbanLead to Lead format expected by modal
    const leadData = {
      email: lead.email,
      name: lead.name || "",
      stage: cols.find((c) => c.id === columnId)?.label || "Open",
      timezone: "",
      phone: "",
      company: "",
      website: lead.website || "",
      dealValue: "-",
      source: lead.source,
      medium: "-",
      created: lead.date,
    }
    setSelectedLead(leadData)
    setIsModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3"
          >
            <span className="text-[13px] font-medium text-muted-foreground">
              {stat.label}
            </span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <SelectField value={sort} onChange={setSort} options={sortOpts} />
        <SelectField value={status} onChange={setStatus} options={statusOpts} />
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full text-[13px] bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {filteredCols.map((col) => (
          <div key={col.id} className="flex flex-col min-w-[260px] w-[260px] shrink-0">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1 mb-3">
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", col.dotColor)} />
              <span className="text-[13px] font-semibold text-foreground">
                {col.label}
              </span>
              <span className="text-[12px] text-muted-foreground ml-auto tabular-nums">
                {col.leads.length} leads
              </span>
            </div>

            {/* Column body */}
            <div 
              className="flex flex-col gap-2 min-h-[200px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
            >
              {col.leads.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border bg-accent/20 flex items-center justify-center py-12 text-[12px] text-muted-foreground">
                  Drop leads here
                </div>
              ) : (
                col.leads.map((lead, i) => (
                  <div
                    key={lead.email + i}
                    draggable
                    onMouseDown={handleCardMouseDown}
                    onDragStart={() => handleDragStart(lead, col.id)}
                    onDragEnd={() => setIsDragging(false)}
                    onClick={() => handleLeadClick(lead, col.id)}
                    className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm hover:border-muted-foreground/30 transition-all cursor-grab active:cursor-grabbing active:opacity-50"
                  >
                    {lead.name && (
                      <span className="text-[13px] font-medium text-foreground leading-snug">
                        {lead.name}
                      </span>
                    )}
                    <span className="text-[12px] text-muted-foreground truncate">
                      {lead.email}
                    </span>
                    {lead.website && (
                      <span className="text-[12px] text-sky-600 truncate flex items-center gap-1">
                        {lead.website}
                        <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    )}
                    <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
                      <span className="text-[11px] text-muted-foreground">{lead.source}</span>
                      <span className="text-[11px] text-muted-foreground/40">&bull;</span>
                      <span className="text-[11px] text-muted-foreground">{lead.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
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
          // Update lead in kanban columns
          setCols((prevCols) =>
            prevCols.map((col) => ({
              ...col,
              leads: col.leads.map((l) =>
                l.email === selectedLead?.email
                  ? {
                      email: updatedLead.email,
                      name: updatedLead.name,
                      website: updatedLead.website,
                      date: l.date,
                      source: updatedLead.source,
                    }
                  : l
              ),
            }))
          )
          setIsModalOpen(false)
          setSelectedLead(null)
        }}
        onDelete={(leadToDelete) => {
          // Remove lead from kanban columns
          setCols((prevCols) =>
            prevCols.map((col) => ({
              ...col,
              leads: col.leads.filter((l) => l.email !== leadToDelete.email),
            }))
          )
          setIsModalOpen(false)
          setSelectedLead(null)
        }}
      />
    </div>
  )
}
