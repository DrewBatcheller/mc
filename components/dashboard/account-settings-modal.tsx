'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Camera } from 'lucide-react'

interface AccountSettingsModalProps {
  open: boolean
  onClose: () => void
}

function updateLocalSession(updates: { name?: string; email?: string; avatarUrl?: string }) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem('mc_session')
    if (!raw) return
    const session = JSON.parse(raw)
    if (updates.name) {
      session.user.name = updates.name
      session.user.avatarInitials = updates.name
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    }
    if (updates.email) {
      session.user.email = updates.email
    }
    if (updates.avatarUrl !== undefined) {
      session.user.avatarUrl = updates.avatarUrl
    }
    localStorage.setItem('mc_session', JSON.stringify(session))
  } catch {
    // ignore parse errors
  }
}

export function AccountSettingsModal({ open, onClose }: AccountSettingsModalProps) {
  const { user, refreshUser } = useUser()

  // ── Client fields ──────────────────────────────────────────────────────────
  const [brandName, setBrandName] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ── Team fields ────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [teamEmail, setTeamEmail] = useState('')

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const isClient = user?.role === 'client'

  // Fetch current record from Airtable when modal opens to get live field values
  useEffect(() => {
    if (!open || !user) return
    setError(null)
    setSavedOk(false)
    setNewPassword('')
    setConfirmPassword('')
    setAvatarFile(null)
    setAvatarPreview(null)

    const resource = isClient ? 'clients' : 'team'
    const recordId = isClient ? user.clientId : user.id
    if (!recordId) return

    setIsFetching(true)

    fetch(`/api/airtable/${resource}/${recordId}`, {
      headers: {
        'x-user-role': user.role,
        'x-user-id': user.id,
        ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
      },
    })
      .then(r => r.json())
      .then(({ record }) => {
        const f = record?.fields ?? {}
        if (isClient) {
          setBrandName((f['Brand Name'] as string) ?? user.name ?? '')
          setEmail((f['Email'] as string) ?? user.email ?? '')
          setWebsite((f['Website'] as string) ?? '')
        } else {
          setFirstName((f['First Name'] as string) ?? '')
          setLastName((f['Last Name'] as string) ?? '')
          setTeamEmail((f['Email'] as string) ?? user.email ?? '')
        }
        // Read avatar URL from attachment field and refresh localStorage
        const avatarField = f['Avatar']
        const attachments = Array.isArray(avatarField) ? avatarField : []
        const freshUrl: string | undefined = (attachments[0] as { url?: string } | undefined)?.url
        if (freshUrl) {
          updateLocalSession({ avatarUrl: freshUrl })
          refreshUser()
        }
      })
      .catch(() => {
        // Fallback to session data if fetch fails
        if (isClient) {
          setBrandName(user.name ?? '')
          setEmail(user.email ?? '')
          setWebsite('')
        } else {
          const parts = (user.name ?? '').split(' ')
          setFirstName(parts[0] ?? '')
          setLastName(parts.slice(1).join(' ') ?? '')
          setTeamEmail(user.email ?? '')
        }
      })
      .finally(() => setIsFetching(false))
  }, [open, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !user) return
    setIsUploadingAvatar(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', avatarFile, avatarFile.name)
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: {
          'x-user-role': user.role,
          'x-user-id': user.id,
          ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
        },
        body: fd,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Upload failed: ${res.status}`)
      }
      const { url } = await res.json()
      updateLocalSession({ avatarUrl: url })
      refreshUser()
      setAvatarFile(null)
      setAvatarPreview(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function handleSave() {
    if (!user) return
    setIsSaving(true)
    setError(null)
    setSavedOk(false)

    try {
      let fields: Record<string, string> = {}
      let newName: string | undefined
      let newEmail: string | undefined

      if (isClient) {
        if (newPassword || confirmPassword) {
          if (newPassword !== confirmPassword) {
            setError('Passwords do not match.')
            setIsSaving(false)
            return
          }
          if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.')
            setIsSaving(false)
            return
          }
          fields['Password'] = newPassword
        }
        if (brandName.trim()) fields['Brand Name'] = brandName.trim()
        if (email.trim()) fields['Email'] = email.trim()
        if (website.trim()) fields['Website'] = website.trim()
        newName = brandName.trim() || undefined
        newEmail = email.trim() || undefined
      } else {
        if (firstName.trim() || lastName.trim()) {
          const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
          fields['Full Name'] = full
          fields['First Name'] = firstName.trim()
          fields['Last Name'] = lastName.trim()
          newName = full
        }
        if (teamEmail.trim()) {
          fields['Email'] = teamEmail.trim()
          newEmail = teamEmail.trim()
        }
      }

      if (Object.keys(fields).length === 0) {
        setError('No changes to save.')
        setIsSaving(false)
        return
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id,
          ...(user.clientId ? { 'x-client-id': user.clientId } : {}),
        },
        body: JSON.stringify({ fields }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed: ${res.status}`)
      }

      // Update local session so refreshUser picks up the new values
      updateLocalSession({ name: newName, email: newEmail })
      refreshUser()

      setSavedOk(true)
      setTimeout(() => {
        setSavedOk(false)
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  const avatarInitials = user?.avatarInitials ?? user?.name?.slice(0, 2).toUpperCase() ?? 'MC'
  const currentAvatarUrl = avatarPreview ?? user?.avatarUrl

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base">Account Settings</DialogTitle>
        </DialogHeader>

        {/* Avatar preview + upload */}
        <div className="flex items-center gap-4 py-1">
          <div className="relative group">
            <Avatar className="h-14 w-14">
              {currentAvatarUrl && <AvatarImage src={currentAvatarUrl} alt={user?.name ?? ''} className="object-cover" />}
              <AvatarFallback className="bg-foreground text-card text-lg font-semibold">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>
            {/* Camera overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Change avatar"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize mb-1.5">{user?.role}</p>
            {avatarFile ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="h-6 px-2.5 rounded-md bg-foreground text-background text-[11px] font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1 transition-opacity"
                >
                  {isUploadingAvatar && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isUploadingAvatar ? 'Uploading…' : 'Upload Photo'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                  className="h-6 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors"
              >
                Change photo
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          {isFetching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : isClient ? (
            <>
              <Field
                label="Company Name"
                value={brandName}
                onChange={setBrandName}
                placeholder="Acme Inc."
              />
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="hello@yourcompany.com"
              />
              <Field
                label="Website"
                type="url"
                value={website}
                onChange={setWebsite}
                placeholder="https://yourcompany.com"
              />
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Change Password</p>
                <Field
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Leave blank to keep current"
                />
                <Field
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat new password"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="First Name"
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="Jane"
                />
                <Field
                  label="Last Name"
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Smith"
                />
              </div>
              <Field
                label="Email"
                type="email"
                value={teamEmail}
                onChange={setTeamEmail}
                placeholder="jane@moreconversions.com"
              />
            </>
          )}
        </div>

        {error && (
          <p className="text-[13px] text-red-500 mt-1">{error}</p>
        )}

        <DialogFooter className="mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || savedOk || isFetching}
            className="px-4 py-2 text-[13px] font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {savedOk ? 'Saved!' : isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Small inline field component ───────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
      />
    </div>
  )
}
