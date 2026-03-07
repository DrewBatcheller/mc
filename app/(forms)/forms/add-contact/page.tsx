'use client'

/**
 * Add Contacts — hosted form at /forms/add-contact?id=recXXX
 *
 * Full CRUD for a client's contacts: view, add, edit, and delete.
 * Uses ?id= search param with a Client record ID.
 * Supports ?id=preview for display-only mode with sample data.
 * Replicates the contact management from /management/client-directory ContactsTab.
 */

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Plus, Pencil, Trash2, Bell, BellOff } from 'lucide-react'
import { useAirtable } from '@/hooks/use-airtable'
import { useUser } from '@/contexts/UserContext'
import { SelectField } from '@/components/shared/select-field'
import {
  FormPage, FormHeader, FormBody, FormError,
  StepCard, FormField, inputCls,
  isPreviewMode, PreviewBanner, PreviewShell,
} from '@/components/forms'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  userType: string
  slackMemberId: string
  companySlackChannelId: string
  receiveNotifications: boolean
}

type ContactFormData = Omit<Contact, 'id'>

const USER_TYPE_OPTIONS = [
  'Main Point of Contact',
  'C-Suite',
  'Management',
  'Finance',
  'Marketing',
  'Legal',
  'Contractor',
]

const EMPTY_FORM: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  userType: 'Main Point of Contact',
  slackMemberId: '',
  companySlackChannelId: '',
  receiveNotifications: true,
}

// ─── Preview mock data ───────────────────────────────────────────────────────

const PREVIEW_CLIENT_NAME = 'Acme Corp'
const PREVIEW_CONTACTS: Contact[] = [
  {
    id: 'preview_1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@acmecorp.com',
    userType: 'Main Point of Contact',
    slackMemberId: 'U07SZ69E511',
    companySlackChannelId: 'C09NTD9QDJR',
    receiveNotifications: true,
  },
  {
    id: 'preview_2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'mchen@acmecorp.com',
    userType: 'C-Suite',
    slackMemberId: '',
    companySlackChannelId: 'C09NTD9QDJR',
    receiveNotifications: true,
  },
  {
    id: 'preview_3',
    firstName: 'Jamie',
    lastName: 'Rivera',
    email: 'jamie.r@acmecorp.com',
    userType: 'Marketing',
    slackMemberId: 'U09BK42P718',
    companySlackChannelId: '',
    receiveNotifications: false,
  },
]

const PREVIEW_FORM: ContactFormData = {
  firstName: 'New',
  lastName: 'Contact',
  email: 'new@acmecorp.com',
  userType: 'Finance',
  slackMemberId: '',
  companySlackChannelId: 'C09NTD9QDJR',
  receiveNotifications: true,
}

// ─── Contact Row ─────────────────────────────────────────────────────────────

const USER_TYPE_BADGE: Record<string, string> = {
  'Main Point of Contact': 'bg-sky-50 text-sky-700 border-sky-200',
  'C-Suite': 'bg-violet-50 text-violet-700 border-violet-200',
  'Management': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Finance': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Marketing': 'bg-amber-50 text-amber-700 border-amber-200',
  'Legal': 'bg-neutral-50 text-neutral-600 border-neutral-200',
  'Contractor': 'bg-orange-50 text-orange-700 border-orange-200',
}

function ContactRow({
  contact,
  isDeleting,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  contact: Contact
  isDeleting: boolean
  onEdit: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  if (isDeleting) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3">
        <p className="text-[13px] text-red-700">
          Remove <span className="font-semibold">{[contact.firstName, contact.lastName].filter(Boolean).join(' ')}</span>?
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCancelDelete}
            className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmDelete}
            className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-neutral-800">{[contact.firstName, contact.lastName].filter(Boolean).join(' ')}</span>
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
            USER_TYPE_BADGE[contact.userType] ?? 'bg-neutral-50 text-neutral-500 border-neutral-200'
          )}>
            {contact.userType}
          </span>
          {contact.receiveNotifications ? (
            <Bell className="h-3 w-3 text-sky-500" />
          ) : (
            <BellOff className="h-3 w-3 text-neutral-300" />
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-0.5 mt-1.5">
          {contact.email && (
            <span className="text-[12px] text-neutral-500">{contact.email}</span>
          )}
          {contact.slackMemberId && (
            <span className="text-[11px] font-mono text-neutral-400">{contact.slackMemberId}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          title="Edit contact"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete contact"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Contact Form (inline add/edit) ──────────────────────────────────────────

function ContactForm({
  formData,
  onChange,
  onSave,
  onCancel,
  saving,
  isEdit,
  clientName,
}: {
  formData: ContactFormData
  onChange: (data: ContactFormData) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
  clientName: string
}) {
  const canSubmit = formData.firstName.trim().length > 0

  return (
    <div className="space-y-5">
      {/* Row 1: First Name + Last Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="First Name" required>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => onChange({ ...formData, firstName: e.target.value })}
            placeholder="Jane"
            className={inputCls}
            autoFocus
          />
        </FormField>
        <FormField label="Last Name">
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => onChange({ ...formData, lastName: e.target.value })}
            placeholder="Doe"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Row 2: Email */}
      <FormField label="Email">
        <input
          type="email"
          value={formData.email}
          onChange={(e) => onChange({ ...formData, email: e.target.value })}
          placeholder="jane@company.com"
          className={inputCls}
        />
      </FormField>

      {/* Row 2: Company (read-only) + User Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Company">
          <input
            type="text"
            value={clientName}
            className={cn(inputCls, 'bg-neutral-50 text-neutral-400 cursor-not-allowed')}
            disabled
          />
        </FormField>
        <FormField label="User Type">
          <SelectField
            value={formData.userType}
            onChange={(v) => onChange({ ...formData, userType: v })}
            options={USER_TYPE_OPTIONS}
            containerClassName="w-full"
            className="w-full"
          />
        </FormField>
      </div>

      {/* Row 3: Slack IDs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Slack Member ID" description="Found in Slack profile settings">
          <input
            type="text"
            value={formData.slackMemberId}
            onChange={(e) => onChange({ ...formData, slackMemberId: e.target.value })}
            placeholder="U07SZ69E511"
            className={cn(inputCls, 'font-mono')}
          />
        </FormField>
        <FormField label="Company Slack Channel ID" description="Found in channel details">
          <input
            type="text"
            value={formData.companySlackChannelId}
            onChange={(e) => onChange({ ...formData, companySlackChannelId: e.target.value })}
            placeholder="C09NTD9QDJR"
            className={cn(inputCls, 'font-mono')}
          />
        </FormField>
      </div>

      {/* Notifications checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
        <input
          type="checkbox"
          checked={formData.receiveNotifications}
          onChange={(e) => onChange({ ...formData, receiveNotifications: e.target.checked })}
          className="h-4 w-4 rounded border-neutral-300 text-sky-500 focus:ring-sky-400/30 cursor-pointer"
        />
        <span className="text-[13px] text-neutral-600 group-hover:text-neutral-800 transition-colors">
          Receive notifications
        </span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
        <button
          onClick={onSave}
          disabled={saving || !canSubmit}
          className="flex items-center gap-2 px-5 py-2 bg-sky-500 text-white text-[13px] font-semibold rounded-xl hover:bg-sky-600 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-sky-500/20"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Add Contact'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[13px] font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Form Inner ─────────────────────────────────────────────────────────

function AddContactFormInner() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('id') ?? ''
  const preview = isPreviewMode(clientId)
  const { user } = useUser()

  const authHeaders: Record<string, string> = user
    ? {
        'Content-Type': 'application/json',
        'x-user-role': user.role,
        'x-user-id': user.id,
        'x-user-name': user.name,
        ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
      }
    : { 'Content-Type': 'application/json' }

  // ── Fetch client to get Brand Name (skip in preview) ────────────────────────
  const { data: rawClient, isLoading: clientLoading } = useAirtable<Record<string, unknown>>('clients', {
    fields: ['Brand Name'],
    filterExtra: `RECORD_ID() = "${clientId}"`,
    maxRecords: 1,
    enabled: !!clientId && !preview,
  })

  const clientName = useMemo(() => {
    if (preview) return PREVIEW_CLIENT_NAME
    if (!rawClient || rawClient.length === 0) return ''
    return ((rawClient[0].fields as Record<string, unknown>)['Brand Name'] as string) ?? ''
  }, [rawClient, preview])

  // ── Fetch contacts for this client (skip in preview) ────────────────────────
  const { data: rawContacts, mutate, isLoading: contactsLoading } = useAirtable<Record<string, unknown>>('contacts', {
    filterExtra: `{Brand Name} = "${clientName}"`,
    enabled: !!clientName && !preview,
  })

  const contacts = useMemo<Contact[]>(() => {
    if (preview) return PREVIEW_CONTACTS
    if (!rawContacts) return []
    return rawContacts.map(r => {
      const f = r.fields as Record<string, unknown>
      return {
        id: r.id,
        firstName: (f['First Name'] as string) ?? '',
        lastName: (f['Last Name'] as string) ?? '',
        email: (f['User Email'] as string) ?? '',
        userType: ((f['User Type'] as string) ?? 'Main Point of Contact'),
        slackMemberId: (f['User Slack Member ID'] as string) ?? '',
        companySlackChannelId: (f['Company Slack Channel ID'] as string) ?? '',
        receiveNotifications: Boolean(f['Receive Notifications']),
      }
    })
  }, [rawContacts, preview])

  // ── State ───────────────────────────────────────────────────────────────────
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [optimisticContacts, setOptimisticContacts] = useState<Contact[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ContactFormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visibleContacts = useMemo(() => {
    const real = contacts.filter(c => !deletedIds.has(c.id))
    return [...real, ...optimisticContacts]
  }, [contacts, deletedIds, optimisticContacts])

  // ── Save (create or update) ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (preview) return
    if (!formData.firstName.trim()) return
    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        await fetch(`/api/airtable/contacts/${editingId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            fields: {
              'First Name': formData.firstName,
              'Last Name': formData.lastName,
              'User Email': formData.email,
              'User Type': formData.userType,
              'User Slack Member ID': formData.slackMemberId,
              'Company Slack Channel ID': formData.companySlackChannelId,
              'Receive Notifications': formData.receiveNotifications,
            },
          }),
        })
        mutate()
      } else {
        const tempId = `temp_${Date.now()}`
        const optimistic: Contact = { ...formData, id: tempId }
        setOptimisticContacts(prev => [...prev, optimistic])

        try {
          await fetch('/api/airtable/contacts', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              fields: {
                'First Name': formData.firstName,
                'Last Name': formData.lastName,
                'User Email': formData.email,
                'User Type': formData.userType,
                'User Slack Member ID': formData.slackMemberId,
                'Company Slack Channel ID': formData.companySlackChannelId,
                'Receive Notifications': formData.receiveNotifications,
                'Brand Name': [clientId],
              },
            }),
          })
          setOptimisticContacts(prev => prev.filter(c => c.id !== tempId))
          mutate()
        } catch {
          setOptimisticContacts(prev => prev.filter(c => c.id !== tempId))
          throw new Error('Failed to create contact')
        }
      }

      setFormData({ ...EMPTY_FORM })
      setEditingId(null)
      setIsAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (contact: Contact) => {
    if (preview) return
    setDeletedIds(prev => new Set([...prev, contact.id]))
    setDeletingId(null)
    setError(null)

    if (editingId === contact.id) {
      setEditingId(null)
      setIsAdding(false)
      setFormData({ ...EMPTY_FORM })
    }

    try {
      await fetch(`/api/airtable/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      mutate()
      setDeletedIds(prev => { const s = new Set(prev); s.delete(contact.id); return s })
    } catch {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(contact.id); return s })
      setError('Failed to delete contact')
    }
  }

  // ── Edit / Add helpers ──────────────────────────────────────────────────────
  const startEdit = (contact: Contact) => {
    setIsAdding(false)
    setEditingId(contact.id)
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      userType: contact.userType,
      slackMemberId: contact.slackMemberId,
      companySlackChannelId: contact.companySlackChannelId,
      receiveNotifications: contact.receiveNotifications,
    })
  }

  const startAdd = () => {
    setEditingId(null)
    setFormData({ ...EMPTY_FORM })
    setIsAdding(true)
  }

  const cancelForm = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ ...EMPTY_FORM })
  }

  // ── Loading / error guards ──────────────────────────────────────────────────
  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        No client ID provided. Use ?id=recXXX in the URL.
      </div>
    )
  }

  if (!preview && (clientLoading || contactsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading contacts...
      </div>
    )
  }

  if (!clientName) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[13px] text-neutral-500">
        Client not found (ID: {clientId})
      </div>
    )
  }

  // In preview mode: show the add form open with sample data
  const previewFormOpen = preview
  const isFormOpen = isAdding || editingId !== null || previewFormOpen
  const activeFormData = preview ? PREVIEW_FORM : formData
  const noop = () => {}

  const formContent = (
    <>
      <FormHeader
        title="Manage Contacts"
        entityName={clientName}
        badge={`${visibleContacts.length} contact${visibleContacts.length !== 1 ? 's' : ''}`}
        badgeColor="sky"
      />

      {preview && <PreviewBanner />}

      <FormBody>
        <FormError message={error} />

        {/* Contacts List */}
        <StepCard num="01" title="Current Contacts">
          {visibleContacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13px] text-neutral-400">No contacts yet. Add your first contact below.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleContacts.map(contact => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  isDeleting={deletingId === contact.id}
                  onEdit={() => startEdit(contact)}
                  onDelete={() => setDeletingId(contact.id)}
                  onConfirmDelete={() => handleDelete(contact)}
                  onCancelDelete={() => setDeletingId(null)}
                />
              ))}
            </div>
          )}
        </StepCard>

        {/* Add/Edit Form */}
        {isFormOpen ? (
          <StepCard num="02" title={editingId ? 'Edit Contact' : 'New Contact'}>
            <ContactForm
              formData={activeFormData}
              onChange={preview ? noop : setFormData}
              onSave={preview ? noop : handleSave}
              onCancel={preview ? noop : cancelForm}
              saving={false}
              isEdit={!!editingId}
              clientName={clientName}
            />
          </StepCard>
        ) : (
          <button
            onClick={startAdd}
            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-neutral-200 text-[13px] font-medium text-neutral-400 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        )}
      </FormBody>
    </>
  )

  if (preview) {
    return <PreviewShell>{formContent}</PreviewShell>
  }

  return formContent
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function AddContactFormPage() {
  return (
    <FormPage>
      <AddContactFormInner />
    </FormPage>
  )
}
