'use client'

import { ExternalLink, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExperimentTimelineProps {
  testStatus?: string
  designMockupUrl?: string
  developmentUrl?: string
  qaSignedOff?: boolean
  qaSignOffDate?: string
  pausedReason?: string
  blockedReason?: string
}

const phaseMap: Record<string, number> = {
  'Pending': 0,
  'In Progress - Design': 1,
  'In Progress - Development': 2,
  'In Progress - QA': 3,
  'Live - Collecting Data': 4,
  'Successful': 5,
  'Unsuccessful': 5,
  'Inconclusive': 5,
}

const phases = [
  { label: 'Pending', key: 'pending' },
  { label: 'Design', key: 'design' },
  { label: 'Development', key: 'development' },
  { label: 'QA', key: 'qa' },
  { label: 'Live', key: 'live' },
  { label: 'Results', key: 'results' },
]

export function ExperimentTimeline({
  testStatus = 'Pending',
  designMockupUrl,
  developmentUrl,
  qaSignedOff,
  qaSignOffDate,
  pausedReason,
  blockedReason,
}: ExperimentTimelineProps) {
  const currentPhaseIndex = phaseMap[testStatus] ?? 0
  const isException = pausedReason || blockedReason

  return (
    <div className="flex flex-col gap-3">
      {/* Exception Alert */}
      {isException && (
        <div className={cn(
          'flex items-start gap-2.5 px-3 py-2 rounded-lg border text-[12px]',
          pausedReason
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        )}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{pausedReason ? 'Paused' : 'Blocked'}</p>
            <p className="text-[11px] opacity-90">{pausedReason || blockedReason}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center justify-between gap-0 relative">
        {phases.map((phase, idx) => {
          const isComplete = idx < currentPhaseIndex
          const isCurrent = idx === currentPhaseIndex

          let phaseUrl: string | undefined
          let phaseLabel: string | undefined

          if (idx === 1 && designMockupUrl) {
            phaseUrl = designMockupUrl
            phaseLabel = 'View Figma'
          } else if (idx === 2 && developmentUrl) {
            phaseUrl = developmentUrl
            phaseLabel = 'View Preview'
          } else if (idx === 3 && qaSignedOff) {
            phaseLabel = `Approved${qaSignOffDate ? ` • ${qaSignOffDate}` : ''}`
          }

          return (
            <div key={phase.key} className="flex flex-col items-center relative z-10">
              {/* Phase Node */}
              <div className="relative group">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] transition-all border-2 flex-shrink-0',
                    isComplete
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                      : isCurrent
                        ? 'bg-blue-100 border-blue-400 text-blue-700 ring-2 ring-blue-200'
                        : 'bg-muted border-border text-muted-foreground'
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                </div>

                {/* Tooltip on hover */}
                {phaseUrl && (
                  <a
                    href={phaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground whitespace-nowrap z-20 pointer-events-none group-hover:pointer-events-auto"
                  >
                    {phaseLabel}
                    <ExternalLink className="h-2.5 w-2.5 inline-block ml-1" />
                  </a>
                )}
                {phaseLabel && !phaseUrl && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground whitespace-nowrap z-20 pointer-events-none">
                    {phaseLabel}
                  </div>
                )}
              </div>

              {/* Label below node */}
              <span
                className={cn(
                  'text-[11px] font-medium text-center mt-2',
                  isComplete || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {phase.label}
              </span>

              {/* Connector line between nodes */}
              {idx < phases.length - 1 && (
                <div
                  className={cn(
                    'absolute top-4 left-1/2 w-screen h-0.5 -z-10',
                    idx < currentPhaseIndex ? 'bg-emerald-400' : 'bg-border'
                  )}
                  style={{
                    left: 'calc(50% + 20px)',
                    width: 'calc(100vw - 40px)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
