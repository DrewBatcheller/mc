'use client'

/**
 * useDelayTracking — hook for overdue form submissions.
 *
 * Checks if a due date has passed, calculates days overdue,
 * manages the delay reason state, and provides a function to
 * create Delay + Note records in Airtable.
 */

import { useState, useMemo } from 'react'
import { useUser } from '@/contexts/UserContext'

interface UseDelayTrackingOptions {
  dueDate: string | null | undefined   // ISO date or date string from Airtable
  dueDateLabel: string                  // e.g. "Design Due Date", "Dev Due Date"
}

interface UseDelayTrackingResult {
  isOverdue: boolean
  daysOverdue: number
  delayReason: string
  setDelayReason: (value: string) => void
  /** Create Delay + Note records. Returns true on success. */
  createDelayRecord: (params: CreateDelayParams) => Promise<boolean>
  /** Whether delay reason is required but not yet provided */
  isDelayReasonMissing: boolean
}

interface CreateDelayParams {
  assigneeName: string     // Name of the person submitting (for Delay Reason display)
  batchId?: string         // Airtable record ID of the batch
  taskName?: string        // Task Assigned field value
}

export function useDelayTracking({ dueDate, dueDateLabel }: UseDelayTrackingOptions): UseDelayTrackingResult {
  const { user } = useUser()
  const [delayReason, setDelayReason] = useState('')

  const { isOverdue, daysOverdue } = useMemo(() => {
    if (!dueDate) return { isOverdue: false, daysOverdue: 0 }

    const due = new Date(dueDate)
    if (isNaN(due.getTime())) return { isOverdue: false, daysOverdue: 0 }

    // Set to end of due date day (11:59 PM) so submissions on the due date itself are not overdue
    due.setHours(23, 59, 59, 999)

    const now = new Date()
    if (now <= due) return { isOverdue: false, daysOverdue: 0 }

    const diffMs = now.getTime() - due.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    return { isOverdue: true, daysOverdue: diffDays }
  }, [dueDate])

  const isDelayReasonMissing = isOverdue && !delayReason.trim()

  async function createDelayRecord({ assigneeName, batchId, taskName }: CreateDelayParams): Promise<boolean> {
    if (!isOverdue || !delayReason.trim()) return true  // Not overdue, nothing to do

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-role': user?.role ?? 'team',
      'x-user-id': user?.id ?? '',
      'x-user-name': user?.name ?? '',
    }
    if (user?.clientId) headers['x-client-id'] = user.clientId

    try {
      // 1. Create the Delay record
      const delayFields: Record<string, unknown> = {
        'Delay Reason': delayReason.trim(),
        'Date Work Submitted': new Date().toISOString().split('T')[0],
      }
      if (batchId) delayFields['Batch'] = [batchId]
      if (taskName) delayFields['Task Assigned'] = taskName

      const delayRes = await fetch('/api/airtable/delays', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields: delayFields }),
      })

      if (!delayRes.ok) {
        console.error('[delay-tracking] Failed to create delay record:', await delayRes.text())
        return false
      }

      const { record: delayRecord } = await delayRes.json()

      // 2. Create a Note linked to the Delay
      const noteFields: Record<string, unknown> = {
        'Note': `[Delay - ${dueDateLabel}] ${delayReason.trim()} (submitted by ${assigneeName}, ${daysOverdue} days overdue)`,
      }

      await fetch('/api/airtable/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields: noteFields }),
      })

      return true
    } catch (err) {
      console.error('[delay-tracking] Error creating delay records:', err)
      return false
    }
  }

  return {
    isOverdue,
    daysOverdue,
    delayReason,
    setDelayReason,
    createDelayRecord,
    isDelayReasonMissing,
  }
}
