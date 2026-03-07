"use client"

/**
 * Convert Lead to Client — hosted form at /forms/convert-lead?id=recXXX
 *
 * Moved from /onboarding/convert. Now requires authentication and uses
 * the authenticated user's headers instead of hardcoded management role.
 */

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  Loader2, CheckCircle2, Upload, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SelectField } from "@/components/shared/select-field"
import { useUser } from "@/contexts/UserContext"
import { isPreviewMode, PreviewBanner, PreviewShell } from "@/components/forms"

/* ── Config ─────────────────────────────────────────────────────────────────── */

const PLAN_TYPES = [
  { id: "1 Test",  label: "1 Test",  desc: "1 test / month"  },
  { id: "2 Tests", label: "2 Tests", desc: "2 tests / month" },
  { id: "3 Tests", label: "3 Tests", desc: "3 tests / month" },
  { id: "4 Tests", label: "4 Tests", desc: "4 tests / month" },
  { id: "Custom",  label: "Custom",  desc: "Tailored scope"   },
]

// Department → role mapping for team assignment
const ROLE_DEPTS: Record<string, string> = {
  Strategist: "Strategy",
  Designer:   "Design",
  Developer:  "Development",
  QA:         "QA",
}

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  return Array.from({ length: 14 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

/* ── Toggle (using hidden checkbox for reliable click-through) ─────────────── */

function Toggle({
  id, checked, onChange, label, description,
}: {
  id: string; checked: boolean; onChange: (v: boolean) => void
  label: string; description?: string
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 cursor-pointer select-none group">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className={cn(
        "relative h-5 w-9 rounded-full transition-colors shrink-0",
        checked ? "bg-sky-500" : "bg-neutral-300 group-hover:bg-neutral-400"
      )}>
        <span className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 pointer-events-none",
          checked ? "translate-x-4" : "translate-x-0.5"
        )} />
      </div>
      <div>
        <p className="text-[13px] font-medium text-neutral-800 leading-snug">{label}</p>
        {description && <p className="text-[11px] text-neutral-500 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

/* ── Step card ──────────────────────────────────────────────────────────────── */

function StepCard({ num, title, children }: {
  num: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
        <span className="h-6 w-6 rounded-full bg-sky-500/10 text-sky-600 text-[11px] font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <h2 className="text-[14px] font-semibold text-neutral-800 tracking-tight">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

/* ── Inner form ─────────────────────────────────────────────────────────────── */

function ConvertFormInner() {
  const params = useSearchParams()
  const { user } = useUser()
  const preview = isPreviewMode(params.get("id") ?? "")

  // Build auth headers from the authenticated user
  const authHeaders: Record<string, string> = user
    ? {
        "x-user-role": user.role,
        "x-user-id": user.id,
        "x-user-name": user.name,
        ...(user.clientId ? { "x-client-id": user.clientId } : {}),
      }
    : {}

  // Read URI params (use mock data in preview)
  const leadId     = preview ? "preview"             : (params.get("id")          ?? "")
  const brandName  = preview ? "Acme Corp"           : (params.get("BrandName")   ?? "")
  const emailParam = preview ? "sarah@acmecorp.com"  : (params.get("Email")       ?? "")
  const firstName  = preview ? "Sarah"               : (params.get("FirstName")   ?? "")
  const lastName   = preview ? "Johnson"             : (params.get("LastName")    ?? "")
  const phoneParam = preview ? "+1 (555) 867-5309"   : (params.get("PhoneNumber") ?? "")
  const tzParam    = preview ? "EST"                 : (params.get("Timezone")    ?? "")
  const webParam   = preview ? "https://acmecorp.com": (params.get("Website")     ?? "")
  const notesParam = preview ? "Sample onboarding notes for preview." : (params.get("notes") ?? "")

  const initialName = [firstName, lastName].filter(Boolean).join(" ") || brandName

  /* ── Editable lead info ── */
  const [leadName,  setLeadName]  = useState(initialName)
  const [leadEmail, setLeadEmail] = useState(emailParam)
  const [leadPhone, setLeadPhone] = useState(phoneParam)
  const [leadWeb,   setLeadWeb]   = useState(webParam)
  const [leadTz,    setLeadTz]    = useState(tzParam)

  /* ── Conversion settings ── */
  const [planType,     setPlanType]     = useState("2 Tests")
  const [monthlyPrice, setMonthlyPrice] = useState("")
  const [devEnabled,   setDevEnabled]   = useState(true)
  const [devHours,     setDevHours]     = useState("")
  const [password,     setPassword]     = useState("")
  const [strategist,   setStrategist]   = useState("")
  const [designer,     setDesigner]     = useState("")
  const [developer,    setDeveloper]    = useState("")
  const [qa,           setQa]           = useState("")
  const [createSlack,  setCreateSlack]  = useState(true)
  const [notes,        setNotes]        = useState(notesParam)
  const [contractFile, setContractFile] = useState<File | null>(null)

  /* ── Live team members — stores { id, name } so we can pass record IDs to Airtable ── */
  type TeamMember = { id: string; name: string }
  const [teamByDept,  setTeamByDept]  = useState<Record<string, TeamMember[]>>({})
  const [teamLoading, setTeamLoading] = useState(true)

  useEffect(() => {
    if (preview) {
      // Mock team data in preview mode
      const mockTeam: Record<string, TeamMember[]> = {
        Strategy:    [{ id: "rec_preview_1", name: "Alex Rivera" }],
        Design:      [{ id: "rec_preview_2", name: "Jamie Lee" }],
        Development: [{ id: "rec_preview_3", name: "Sam Patel" }],
        QA:          [{ id: "rec_preview_4", name: "Morgan Chen" }],
      }
      setTeamByDept(mockTeam)
      setStrategist("Alex Rivera")
      setDesigner("Jamie Lee")
      setDeveloper("Sam Patel")
      setQa("Morgan Chen")
      setTeamLoading(false)
      return
    }

    if (!user) return

    const qs = new URLSearchParams()
    qs.append("fields[]", "Full Name")
    qs.append("fields[]", "Department")
    qs.append("fields[]", "Employment Status")

    fetch(`/api/airtable/team?${qs.toString()}`, {
      headers: authHeaders,
    })
      .then(r => r.json())
      .then(data => {
        const byDept: Record<string, TeamMember[]> = {}
        for (const r of data.records ?? []) {
          const name   = String(r.fields["Full Name"]         ?? "").trim()
          const dept   = String(r.fields["Department"]        ?? "").trim()
          const status = String(r.fields["Employment Status"] ?? "")
          if (!name || status !== "Active") continue
          byDept[dept] = [...(byDept[dept] ?? []), { id: r.id, name }]
        }
        setTeamByDept(byDept)

        // Default selections — first active member in each dept
        setStrategist(byDept["Strategy"]?.[0]?.name    ?? "")
        setDesigner  (byDept["Design"]?.[0]?.name      ?? "")
        setDeveloper (byDept["Development"]?.[0]?.name ?? "")
        setQa        (byDept["QA"]?.[0]?.name          ?? "")
      })
      .catch(() => {})
      .finally(() => setTeamLoading(false))
  }, [user?.id, preview]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Look up a record ID by selected name within a dept */
  const memberId = (dept: string, name: string) =>
    teamByDept[dept]?.find(m => m.name === name)?.id ?? null

  /* ── Submit ── */
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const handleSubmit = async () => {
    if (preview) return
    if (!leadId) {
      setError("No lead ID found in the URL. Please re-open this form from the leads table.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/convert-lead", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          // Updated contact info (may have been edited)
          leadName,
          leadEmail,
          leadPhone,
          leadWebsite: leadWeb,
          leadTimezone: leadTz,
          // Client record fields
          brandName:    brandName || leadName,
          planType,
          monthlyPrice,
          devEnabled,
          devHours,
          notes,
          password,
          // Resolved Airtable record IDs for linked team fields
          strategistId: memberId("Strategy",    strategist),
          designerId:   memberId("Design",      designer),
          developerId:  memberId("Development", developer),
          qaId:         memberId("QA",          qa),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`)

      setSubmitted(true)
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-colors"
  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5 block"

  const displayName = leadName || leadEmail || "Unknown Lead"

  /* ── Success ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-10 max-w-sm w-full text-center flex flex-col items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Client Created!</h1>
            <p className="text-[14px] text-neutral-500 mt-2 leading-relaxed">
              <span className="font-semibold text-neutral-800">{displayName}</span> has been
              converted. The onboarding process has been initiated.
            </p>
          </div>
          <div className="w-full h-px bg-neutral-100" />
          <p className="text-[11px] text-neutral-400">You can close this window.</p>
        </div>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm">
              {(displayName[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 leading-snug">
              <p className="text-[13px] font-semibold text-neutral-800 truncate">{displayName}</p>
              {brandName && displayName !== brandName && (
                <p className="text-[11px] text-neutral-400 truncate">{brandName}</p>
              )}
            </div>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap shrink-0">
            Converting to Client
          </span>
        </div>
      </header>

      {preview && <PreviewBanner />}

      {/* Body — wrapped in PreviewShell when in preview mode */}
      <div className={preview ? "pointer-events-none select-none" : ""}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4 pb-36">

        {/* 01 — Lead Information (editable) */}
        <StepCard num="01" title="Lead Information">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={leadName}
                onChange={e => setLeadName(e.target.value)}
                className={inputCls}
                placeholder="Full name"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={leadEmail}
                onChange={e => setLeadEmail(e.target.value)}
                className={inputCls}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={leadPhone}
                onChange={e => setLeadPhone(e.target.value)}
                className={inputCls}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className={labelCls}>Timezone</label>
              <input
                type="text"
                value={leadTz}
                onChange={e => setLeadTz(e.target.value)}
                className={inputCls}
                placeholder="EST"
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Website</label>
              <input
                type="text"
                value={leadWeb}
                onChange={e => setLeadWeb(e.target.value)}
                className={inputCls}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </StepCard>

        {/* 02 — Plan Type */}
        <StepCard num="02" title="Plan Type">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {PLAN_TYPES.map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanType(plan.id)}
                className={cn(
                  "rounded-xl border-2 p-3.5 text-left transition-all",
                  planType === plan.id
                    ? "border-sky-400 bg-sky-50 shadow-[0_0_0_3px_rgba(14,165,233,0.08)]"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                )}
              >
                <p className={cn(
                  "text-[13px] font-semibold",
                  planType === plan.id ? "text-sky-700" : "text-neutral-800"
                )}>
                  {plan.label}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{plan.desc}</p>
              </button>
            ))}
          </div>
          <div className="max-w-xs">
            <label className={labelCls}>Amount / Month</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-neutral-400 font-medium pointer-events-none">
                $
              </span>
              <input
                type="text"
                value={monthlyPrice}
                onChange={e => setMonthlyPrice(e.target.value)}
                className={`${inputCls} pl-6`}
                placeholder="4,500"
              />
            </div>
          </div>
        </StepCard>

        {/* 03 — Contract */}
        <StepCard num="03" title="Upload Contract">
          <label className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all text-center gap-3 group",
            contractFile
              ? "border-emerald-300 bg-emerald-50"
              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
          )}>
            {contractFile ? (
              <>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-700">{contractFile.name}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Click to replace</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
                  <Upload className="h-5 w-5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-neutral-700">Click to upload contract</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">PDF, DOC, DOCX supported</p>
                </div>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              onChange={e => setContractFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </StepCard>

        {/* 04 — Dashboard Access */}
        <StepCard num="04" title="Dashboard Access">
          <div>
            <label className={labelCls}>Client Dashboard Password</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${inputCls} font-mono tracking-wider flex-1`}
                placeholder="Enter or generate a password"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="h-[42px] px-4 rounded-lg border border-neutral-200 bg-white text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Generate
              </button>
            </div>
          </div>
        </StepCard>

        {/* 05 — Development */}
        <StepCard num="05" title="Development">
          <div className="space-y-4">
            <Toggle
              id="dev-enabled"
              checked={devEnabled}
              onChange={setDevEnabled}
              label="Development Enabled"
              description="Include a developer in this client's onboarding team"
            />
            {devEnabled && (
              <div className="ml-12 max-w-[200px]">
                <label className={labelCls}>Development Hours (flat)</label>
                <input
                  type="number"
                  value={devHours}
                  onChange={e => setDevHours(e.target.value)}
                  className={inputCls}
                  placeholder="40"
                  min="0"
                />
              </div>
            )}
          </div>
        </StepCard>

        {/* 06 — Team Members */}
        <StepCard num="06" title="Assign Team Members">
          {teamLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading team…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(ROLE_DEPTS) as [string, string][]).map(([role, dept]) => {
                  const members     = teamByDept[dept] ?? []
                  const nameOptions = members.length > 0 ? members.map(m => m.name) : ["—"]
                  const value =
                    role === "Strategist" ? strategist :
                    role === "Designer"   ? designer   :
                    role === "Developer"  ? developer  : qa
                  const setter =
                    role === "Strategist" ? setStrategist :
                    role === "Designer"   ? setDesigner   :
                    role === "Developer"  ? setDeveloper  : setQa

                  return (
                    <div key={role}>
                      <label className={labelCls}>
                        {role}
                        <span className="ml-1.5 text-neutral-300 normal-case font-normal tracking-normal">
                          · {dept}
                        </span>
                      </label>
                      <SelectField
                        value={value || nameOptions[0] || ""}
                        onChange={setter}
                        options={nameOptions}
                        containerClassName="w-full"
                        className="w-full"
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 pt-5 border-t border-neutral-100">
                <Toggle
                  id="create-slack"
                  checked={createSlack}
                  onChange={setCreateSlack}
                  label="Create Slack Channel"
                  description="Auto-create a dedicated Slack channel for this client"
                />
              </div>
            </>
          )}
        </StepCard>

        {/* 07 — Notes */}
        <StepCard num="07" title="Onboarding Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={`${inputCls} resize-none`}
            rows={4}
            placeholder="Add context or special instructions for the onboarding team…"
          />
        </StepCard>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 shadow-[0_-4px_16px_rgba(0,0,0,0.07)]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-[13px] text-neutral-500 leading-snug">
            Converting{" "}
            <span className="font-semibold text-neutral-800">{displayName}</span>
            {" · "}
            <span className="font-semibold text-sky-600">{planType}</span>
            {monthlyPrice && (
              <span className="text-neutral-400"> · ${monthlyPrice}/mo</span>
            )}
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting || preview}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 text-white text-[13px] font-semibold rounded-xl hover:bg-sky-600 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-sky-500/20"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Creating Client…" : "Create Client →"}
          </button>
        </div>
      </div>
      </div>{/* end preview wrapper */}
    </div>
  )
}

/* ── Page export ─────────────────────────────────────────────────────────────── */

export default function ConvertLeadFormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
        </div>
      }
    >
      <ConvertFormInner />
    </Suspense>
  )
}
