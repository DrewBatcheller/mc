'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CollisionDetectionProps {
  fieldName: string
  lastModifiedBy?: string
  lastModifiedAt?: number
  currentUserId?: string
  currentValue?: any
  serverValue?: any
  onResolve?: (choice: 'keep' | 'refresh') => void
}

/**
 * CollisionDetection Component
 * Alerts user when they try to modify a field that was recently updated by another user
 * Shows a dialog with options to keep local changes or refresh from server
 */
export function CollisionDetection({
  fieldName,
  lastModifiedBy,
  lastModifiedAt,
  currentUserId,
  currentValue,
  serverValue,
  onResolve,
}: CollisionDetectionProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isRecentConflict, setIsRecentConflict] = useState(false)

  useEffect(() => {
    if (!lastModifiedAt) return

    // Check if field was modified in last 30 seconds
    const timeSinceModification = Date.now() - lastModifiedAt
    const isRecent = timeSinceModification < 30000

    if (isRecent && lastModifiedBy !== currentUserId) {
      setIsRecentConflict(true)
      setShowDialog(true)
    }
  }, [lastModifiedAt, lastModifiedBy, currentUserId])

  const handleKeepLocal = () => {
    setShowDialog(false)
    onResolve?.('keep')
  }

  const handleRefresh = () => {
    setShowDialog(false)
    onResolve?.('refresh')
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <AlertDialogTitle>Data Conflict Detected</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                The field <span className="font-medium text-foreground">{fieldName}</span> was recently updated by{' '}
                <span className="font-medium text-foreground">{lastModifiedBy || 'another user'}</span> at{' '}
                <span className="font-medium text-foreground">{lastModifiedAt ? formatTime(lastModifiedAt) : 'unknown time'}</span>.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="bg-muted p-3 rounded-md mt-4">
          <p className="text-xs font-medium text-foreground mb-2">Server value:</p>
          <code className="text-xs text-muted-foreground break-all">
            {typeof serverValue === 'string' ? serverValue : JSON.stringify(serverValue)}
          </code>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You have unsaved local changes. Would you like to keep them or refresh from the server?
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <AlertDialogCancel onClick={() => setShowDialog(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700">
            Refresh from Server
          </AlertDialogAction>
          <AlertDialogAction onClick={handleKeepLocal} className="bg-amber-600 hover:bg-amber-700">
            Keep My Changes
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Hook to detect field-level collisions
 * Usage:
 *   const { detectCollision } = useCollisionDetection()
 *   if (data.lastModifiedAt && checkForConflict(...)) {
 *     detectCollision({ fieldName: 'Name', ... })
 *   }
 */
export function useCollisionDetection() {
  const [collision, setCollision] = useState<CollisionDetectionProps | null>(null)

  const detectCollision = (props: CollisionDetectionProps) => {
    setCollision(props)
  }

  const clearCollision = () => {
    setCollision(null)
  }

  return {
    collision,
    detectCollision,
    clearCollision,
  }
}
