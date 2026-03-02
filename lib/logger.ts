/**
 * Centralized logging utility
 * Logs to both console and localStorage for debugging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
}

const MAX_LOGS = 100
const LOG_KEY = 'v0_app_logs'

class Logger {
  private logs: LogEntry[] = []

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(LOG_KEY)
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (e) {
      // Storage read failed, continue with empty logs
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    try {
      const logsToStore = this.logs.slice(-MAX_LOGS)
      localStorage.setItem(LOG_KEY, JSON.stringify(logsToStore))
    } catch (e) {
      // Storage write failed, continue
    }
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString()
    const entry: LogEntry = { timestamp, level, message, data }

    this.logs.push(entry)
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS)
    }

    this.saveToStorage()

    // Also log to console with styling
    const style = `color: ${this.getLevelColor(level)}; font-weight: bold;`
    console.log(`[${level.toUpperCase()}] ${message}`, data ? data : '', { style })
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case 'error':
        return '#ef4444'
      case 'warn':
        return '#f59e0b'
      case 'info':
        return '#3b82f6'
      case 'debug':
        return '#6b7280'
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data)
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOG_KEY)
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const logger = new Logger()
