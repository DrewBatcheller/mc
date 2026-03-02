'use client'

import { useState } from 'react'
import { logger } from '@/lib/logger'
import { X, Copy, Trash2, ChevronDown } from 'lucide-react'

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState(logger.getLogs())

  const handleRefresh = () => {
    setLogs(logger.getLogs())
  }

  const handleClear = () => {
    logger.clearLogs()
    setLogs([])
  }

  const handleCopy = () => {
    const text = logger.exportLogs()
    navigator.clipboard.writeText(text)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          handleRefresh()
        }}
        className="fixed bottom-4 right-4 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition-colors z-40 flex items-center gap-2"
      >
        <span>Logs ({logs.length})</span>
        <ChevronDown className="h-3 w-3" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-slate-950 text-white rounded-lg shadow-lg border border-slate-700 overflow-hidden z-40 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <h3 className="font-semibold text-sm">Debug Logs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-slate-800 rounded text-xs"
            title="Refresh"
          >
            ↻
          </button>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-slate-800 rounded"
            title="Copy all logs"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-slate-800 rounded"
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px] p-3 space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-500">No logs yet</div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.level === 'error'
                  ? 'text-red-400'
                  : log.level === 'warn'
                    ? 'text-yellow-400'
                    : log.level === 'info'
                      ? 'text-blue-400'
                      : 'text-gray-400'
              }`}
            >
              <span className="text-slate-500">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>
              <span className="ml-2">[{log.level.toUpperCase()}]</span>
              <span className="ml-2">{log.message}</span>
              {log.data && (
                <div className="text-slate-400 ml-4 truncate">
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
