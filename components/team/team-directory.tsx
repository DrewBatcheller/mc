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
import { useAirtable } from "@/hooks/use-airtable"
import { useUser } from "@/contexts/UserContext"

/* ── Types ── */
type Dept = "Strategy" | "QA" | "Development" | "Management" | "Design"
type Status = "Active" | "Inactive"
interface AssignedClient { name: string; status: string; experiments: number; lastActive: string }
interface ScheduleTask { day: number; month: number; year: number; title: string; client: string; time: string; type: "strategy" | "design" | "dev" | "qa" | "review" }
interface Member {
  id: string; name: string; initials: string; department: Dept;
  email: string; employment: Status; status: Status;
  clients: number; role: string; startDate: string;
  slackId: string; timezone: string;
  assignedClients: AssignedClient[]; bio: string;
  schedule: ScheduleTask[];
}

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
  const { user } = useUser()
  const { data: rawTeam, mutate, isLoading } = useAirtable<Record<string, unknown>>('team', {
    sort: [{ field: 'Full Name', direction: 'asc' }],
  })

  const authHeaders: HeadersInit = useMemo(() => user ? {
    'x-user-role': user.role,
    'x-user-id': user.id,
    'x-user-name': user.name,
    ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
    'Content-Type': 'application/json',
  } : { 'Content-Type': 'application/json' }, [user])

  /* ── Optimistic state ── */
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [editOverrides, setEditOverrides] = useState<Record<string, Partial<Member>>>({})

  const memberList = useMemo<Member[]>(() => {
    return (rawTeam ?? [])
      .filter(r => !deletedIds.has(r.id))
      .map(r => {
        const f = r.fields as Record<string, unknown>
        const rawName = (f['Full Name'] as string) ?? ''
        const override = editOverrides[r.id] ?? {}
        const name = override.name ?? rawName
        const employment = (override.employment ?? (f['Employment Status'] as string) ?? 'Active') as Status
        const clientIds = new Set([
          ...((f['Dev Client Link'] as string[]) ?? []),
          ...((f['Design Client Link'] as string[]) ?? []),
          ...((f['Strategist Client Link'] as string[]) ?? []),
          ...((f['QA Client Link'] as string[]) ?? []),
        ])
        return {
          id: r.id,
          name,
          initials: name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          department: (override.department ?? (f['Department'] as string) ?? 'Management') as Dept,
          email: override.email ?? (f['Email'] as string) ?? '',
          employment,
          status: employment,
          clients: override.clients ?? clientIds.size,
          role: override.role ?? (f['Role'] as string) ?? '',
          startDate: override.startDate ?? '',
          slackId: override.slackId ?? (f['Slack Member ID'] as string) ?? '',
          timezone: override.timezone ?? '',
          assignedClients: [],
          bio: override.bio ?? '',
          schedule: [],
        }
      })
  }, [rawTeam, deletedIds, editOverrides])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Overview")
  const [deptFilter, setDeptFilter] = useState("All Departments")
  const [showInactive, setShowInactive] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /* Auto-select first member once data loads */
  useEffect(() => {
    if (!selectedId && memberList.length > 0) {
      setSelectedId(memberList[0].id)
    }
  }, [memberList, selectedId])

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
      const matchStatus = showInactive ? true : m.status === 'Active'
      return matchSearch && matchDept && matchStatus
    }),
    [search, deptFilter, showInactive, memberList]
  )

  const member = memberList.find((m) => m.id === selectedId) ?? memberList[0] ?? null

  /* ── CRUD handlers ── */
  const handleAddMember = async (data: MemberFormData) => {
    try {
      const res = await fetch('/api/airtable/team', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          fields: {
            'Full Name': data.name,
            'Email': data.email,
            'Role': data.role || undefined,
            'Department': data.department,
            'Employment Status': data.employment,
            ...(data.slackId ? { 'Slack Member ID': data.slackId } : {}),
          },
        }),
      })
      if (res.ok) {
        const { record } = await res.json()
        mutate()
        setSelectedId(record.id)
        setActiveTab("Overview")
      }
    } catch {
      // mutate will reconcile on next revalidation
      mutate()
    }
  }

  const memberToFormData = (m: Member): MemberFormData => ({
    name: m.name, email: m.email, role: m.role, department: m.department,
    employment: m.employment, startDate: m.startDate, slackId: m.slackId,
    timezone: m.timezone, bio: m.bio,
  })

  const handleEditSave = async (data: MemberFormData) => {
    if (!selectedId) return
    const initials = data.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const override: Partial<Member> = {
      name: data.name, initials, email: data.email, role: data.role,
      department: data.department as Dept,
      employment: data.employment as Status,
      status: data.employment as Status,
      startDate: data.startDate, slackId: data.slackId,
      timezone: data.timezone, bio: data.bio,
    }
    // Optimistic update
    setEditOverrides(prev => ({ ...prev, [selectedId]: override }))
    try {
      await fetch(`/api/airtable/team/${selectedId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          fields: {
            'Full Name': data.name,
            'Email': data.email,
            'Role': data.role || undefined,
            'Department': data.department,
            'Employment Status': data.employment,
            ...(data.slackId ? { 'Slack Member ID': data.slackId } : {}),
          },
        }),
      })
      mutate()
      setEditOverrides(prev => { const next = { ...prev }; delete next[selectedId]; return next })
    } catch {
      // Revert optimistic override on error
      setEditOverrides(prev => { const next = { ...prev }; delete next[selectedId]; return next })
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    const idToDelete = selectedId
    const idx = memberList.findIndex(m => m.id === idToDelete)
    const next = memberList[idx + 1] ?? memberList[idx - 1]
    // Optimistic removal
    setDeletedIds(prev => new Set([...prev, idToDelete]))
    if (next) setSelectedId(next.id)
    setDeleteConfirmOpen(false)
    setMenuOpen(false)
    try {
      await fetch(`/api/airtable/team/${idToDelete}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      mutate()
    } catch {
      // Revert on error
      setDeletedIds(prev => { const s = new Set(prev); s.delete(idToDelete); return s })
      setSelectedId(idToDelete)
    }
  }

  /* ── Loading / empty states ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-muted-foreground">
        Loading team directory…
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-muted-foreground">
        No team members found.
      </div>
    )
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
          <div className="flex flex-wrap items-center gap-2">
            <SelectField value={deptFilter} onChange={setDeptFilter} options={["All Departments", "Strategy", "QA", "Development", "Management", "Design"]} containerClassName="flex-1 min-w-[130px]" className="w-full" />
            <label className="flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
              />
              <span className="text-[12px] text-muted-foreground">Show Inactive</span>
            </label>
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
        <p className="text-[13px] text-muted-foreground leading-relaxed">{member.bio || "No bio available."}</p>
      </div>

      <CollapsibleSection title="Contact Information" defaultOpen>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <DetailField label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
            {member.email ? <a href={`mailto:${member.email}`} className="text-sky-600 hover:underline">{member.email}</a> : <span className="text-muted-foreground">—</span>}
          </DetailField>
          <DetailField label="Timezone" icon={<Globe className="h-3.5 w-3.5" />}>{member.timezone || "—"}</DetailField>
          <DetailField label="Start Date" icon={<Clock className="h-3.5 w-3.5" />}>{member.startDate || "—"}</DetailField>
          <DetailField label="Slack ID" icon={<FileText className="h-3.5 w-3.5" />}>{member.slackId || "—"}</DetailField>
        </div>
      </CollapsibleSection>
    </div>
  )
}

/* ── Assigned Clients Tab ── */
function AssignedClientsTab({ member }: { member: Member }) {
  const safeName = member.name.replace(/"/g, '\\"')
  const filterExtra = `OR(FIND("${safeName}", {Full Name (from Developer)}) > 0, FIND("${safeName}", {Full Name (from Designer)}) > 0, FIND("${safeName}", {Full Name (from Strategist)}) > 0, FIND("${safeName}", {Full Name (from QA)}) > 0)`
  const { data: rawClients, isLoading } = useAirtable<Record<string, unknown>>('clients', {
    filterExtra,
    sort: [{ field: 'Brand Name', direction: 'asc' }],
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">
        Loading clients…
      </div>
    )
  }

  if (!rawClients || rawClients.length === 0) {
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
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tests Run</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
          </tr>
        </thead>
        <tbody>
          {rawClients.map((r, i) => {
            const f = r.fields as Record<string, unknown>
            const name = (f['Brand Name'] as string) ?? '—'
            const status = (f['Client Status'] as string) === 'Active' ? 'Active' : 'Inactive'
            const tests = (f['Total Tests Run'] as number) ?? 0
            // determine this member's role for this client
            const devName = (f['Full Name (from Developer)'] as string) ?? ''
            const desName = (f['Full Name (from Designer)'] as string) ?? ''
            const stratName = (f['Full Name (from Strategist)'] as string) ?? ''
            const qaName = (f['Full Name (from QA)'] as string) ?? ''
            const role = devName.includes(member.name) ? 'Developer'
              : desName.includes(member.name) ? 'Designer'
              : stratName.includes(member.name) ? 'Strategist'
              : qaName.includes(member.name) ? 'QA'
              : '—'
            return (
              <tr key={r.id} className={cn("border-b border-border/50 transition-colors hover:bg-accent/20", i % 2 === 0 && "bg-accent/10")}>
                <td className="px-5 py-3.5 text-[13px] font-medium text-foreground">
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground/50" />
                    {name}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-md border",
                    status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"
                  )}>{status}</span>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-foreground">{tests}</td>
                <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{role}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const deptToType: Record<string, ScheduleTask['type']> = {
  Strategy: 'strategy', Design: 'design', Development: 'dev', QA: 'qa', Management: 'review',
}

/* ── Schedule Tab ── */
function ScheduleTab({ member }: { member: Member }) {
  const safeName = member.name.replace(/"/g, '\\"')
  const { data: rawTasks } = useAirtable<Record<string, unknown>>('tasks', {
    filterExtra: `FIND("${safeName}", {Assigned to}) > 0`,
  })

  const schedule = useMemo<ScheduleTask[]>(() => {
    return (rawTasks ?? []).flatMap(r => {
      const f = r.fields as Record<string, unknown>
      const dateStr = (f['Start Date'] as string) ?? ''
      if (!dateStr) return []
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return []
      return [{
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        title: (f['Client Facing Name'] as string) ?? (f['Team Facing Name'] as string) ?? 'Task',
        client: (f['Brand Name (from Client)'] as string) ?? '',
        time: '',
        type: deptToType[(f['Department'] as string) ?? ''] ?? 'review',
      }]
    })
  }, [rawTasks])

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
          <DetailField label="Slack Member ID" icon={<FileText className="h-3.5 w-3.5" />}>{member.slackId || "—"}</DetailField>
          <DetailField label="Timezone" icon={<Globe className="h-3.5 w-3.5" />}>{member.timezone || "—"}</DetailField>
          <DetailField label="Start Date" icon={<Clock className="h-3.5 w-3.5" />}>{member.startDate || "—"}</DetailField>
          <DetailField label="Email" icon={<Mail className="h-3.5 w-3.5" />}>{member.email || "—"}</DetailField>
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
          <DetailField label="Role">{member.role || "—"}</DetailField>
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
