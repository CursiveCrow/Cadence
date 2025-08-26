/**
 * Global Error Handling System
 * Catches and handles unhandled errors and promise rejections
 */

export interface ErrorReport {
  type: 'javascript' | 'promise' | 'network' | 'custom'
  message: string
  stack?: string
  url?: string
  line?: number
  column?: number
  filename?: string
  timestamp: string
  userAgent: string
  errorId: string
  metadata?: Record<string, any>
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean
  enableLocalStorage: boolean
  enableErrorReporting: boolean
  maxStoredErrors: number
  reportingEndpoint?: string
  onError?: (report: ErrorReport) => void
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableConsoleLogging: true,
  enableLocalStorage: true,
  enableErrorReporting: false,
  maxStoredErrors: 50
}

/**
 * Global Error Handler for the application
 */
export class GlobalErrorHandler {
  private config: ErrorHandlerConfig
  private errorQueue: ErrorReport[] = []
  private isProcessingQueue = false
  private retryCount = 0
  private maxRetries = 3

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize global error handlers
   */
  initialize(): () => void {
    const cleanupHandlers: (() => void)[] = []

    // Handle JavaScript errors
    const errorHandler = (event: ErrorEvent) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        filename: event.filename,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        errorId: this.generateErrorId(),
        metadata: {
          isTrusted: event.isTrusted,
          eventType: event.type
        }
      })
    }

    // Handle unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason
      let message = 'Unhandled Promise Rejection'
      let stack: string | undefined

      if (error instanceof Error) {
        message = error.message
        stack = error.stack
      } else if (typeof error === 'string') {
        message = error
      } else if (typeof error === 'object' && error !== null) {
        message = JSON.stringify(error)
      }

      this.handleError({
        type: 'promise',
        message,
        stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        errorId: this.generateErrorId(),
        metadata: {
          reason: error,
          promise: event.promise
        }
      })
    }

    // Handle network errors
    const networkErrorHandler = (event: Event) => {
      const target = event.target as HTMLElement
      if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        this.handleError({
          type: 'network',
          message: `Failed to load resource: ${target.getAttribute('src') || target.getAttribute('href')}`,
          url: target.getAttribute('src') || target.getAttribute('href') || undefined,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          errorId: this.generateErrorId(),
          metadata: {
            tagName: target.tagName,
            element: target.outerHTML
          }
        })
      }
    }

    // Add event listeners
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectionHandler)
    window.addEventListener('error', networkErrorHandler, true) // Use capture phase for resource errors

    cleanupHandlers.push(
      () => window.removeEventListener('error', errorHandler),
      () => window.removeEventListener('unhandledrejection', rejectionHandler),
      () => window.removeEventListener('error', networkErrorHandler, true)
    )

    // Handle visibility change to process errors when page becomes visible
    const visibilityChangeHandler = () => {
      if (!document.hidden && this.errorQueue.length > 0) {
        this.processErrorQueue()
      }
    }

    document.addEventListener('visibilitychange', visibilityChangeHandler)
    cleanupHandlers.push(() => document.removeEventListener('visibilitychange', visibilityChangeHandler))

    console.log('Global error handlers initialized')

    // Return cleanup function
    return () => {
      cleanupHandlers.forEach(cleanup => cleanup())
      console.log('Global error handlers cleaned up')
    }
  }

  /**
   * Manually report an error
   */
  reportError(error: Error, metadata?: Record<string, any>): void {
    this.handleError({
      type: 'custom',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      errorId: this.generateErrorId(),
      metadata
    })
  }

  /**
   * Handle and process an error report
   */
  private handleError(report: ErrorReport): void {
    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logError(report)
    }

    // Store in localStorage
    if (this.config.enableLocalStorage) {
      this.storeError(report)
    }

    // Custom error handler
    if (this.config.onError) {
      try {
        this.config.onError(report)
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError)
      }
    }

    // Add to error reporting queue
    if (this.config.enableErrorReporting) {
      this.errorQueue.push(report)
      this.processErrorQueue()
    }
  }

  /**
   * Log error to console with structured format
   */
  private logError(report: ErrorReport): void {
    const logLevel = report.type === 'network' ? 'warn' : 'error'
    
    console.group(`🚨 Global Error Handler - ${report.type.toUpperCase()} (${report.errorId})`)
    console[logLevel]('Message:', report.message)
    
    if (report.stack) {
      console[logLevel]('Stack:', report.stack)
    }
    
    if (report.url) {
      console[logLevel]('URL:', report.url)
    }
    
    if (report.line && report.column) {
      console[logLevel]('Location:', `${report.line}:${report.column}`)
    }
    
    if (report.metadata) {
      console[logLevel]('Metadata:', report.metadata)
    }
    
    console[logLevel]('Full Report:', report)
    console.groupEnd()
  }

  /**
   * Store error in localStorage
   */
  private storeError(report: ErrorReport): void {
    try {
      const storageKey = 'cadence_global_errors'
      const existingErrors = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      existingErrors.push(report)
      
      // Keep only the most recent errors
      const recentErrors = existingErrors.slice(-this.config.maxStoredErrors)
      localStorage.setItem(storageKey, JSON.stringify(recentErrors))
      
    } catch (storageError) {
      console.warn('Failed to store error in localStorage:', storageError)
    }
  }

  /**
   * Process error reporting queue
   */
  private async processErrorQueue(): Promise<void> {
    if (this.isProcessingQueue || this.errorQueue.length === 0 || !this.config.reportingEndpoint) {
      return
    }

    this.isProcessingQueue = true
    const errors = [...this.errorQueue]
    this.errorQueue = []

    try {
      await this.sendErrorReports(errors)
      this.retryCount = 0
    } catch (error) {
      console.error('Failed to send error reports:', error)
      
      // Re-add errors to queue for retry
      this.errorQueue.unshift(...errors)
      
      // Exponential backoff retry
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000)
        setTimeout(() => {
          this.isProcessingQueue = false
          this.processErrorQueue()
        }, delay)
        return
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * Send error reports to reporting endpoint
   */
  private async sendErrorReports(reports: ErrorReport[]): Promise<void> {
    if (!this.config.reportingEndpoint) {
      throw new Error('No reporting endpoint configured')
    }

    const response = await fetch(this.config.reportingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        errors: reports,
        client: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.getSessionId()
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    const key = 'cadence_session_id'
    let sessionId = sessionStorage.getItem(key)
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(key, sessionId)
    }
    
    return sessionId
  }

  /**
   * Get stored error reports
   */
  getStoredErrors(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('cadence_global_errors') || '[]')
    } catch {
      return []
    }
  }

  /**
   * Clear stored error reports
   */
  clearStoredErrors(): void {
    try {
      localStorage.removeItem('cadence_global_errors')
      console.log('Stored errors cleared')
    } catch (error) {
      console.warn('Failed to clear stored errors:', error)
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    byType: Record<string, number>
    recentCount: number
  } {
    const errors = this.getStoredErrors()
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    const stats = {
      total: errors.length,
      byType: {} as Record<string, number>,
      recentCount: 0
    }
    
    errors.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1
      
      // Count recent errors (within last hour)
      const errorTime = new Date(error.timestamp).getTime()
      if (errorTime > oneHourAgo) {
        stats.recentCount++
      }
    })
    
    return stats
  }
}

// Create global instance
let globalErrorHandler: GlobalErrorHandler | null = null

/**
 * Initialize global error handling
 */
export function initializeGlobalErrorHandling(config?: Partial<ErrorHandlerConfig>): () => void {
  if (globalErrorHandler) {
    console.warn('Global error handling already initialized')
    return () => {}
  }
  
  globalErrorHandler = new GlobalErrorHandler(config)
  const cleanup = globalErrorHandler.initialize()
  
  return () => {
    cleanup()
    globalErrorHandler = null
  }
}

/**
 * Get the global error handler instance
 */
export function getGlobalErrorHandler(): GlobalErrorHandler | null {
  return globalErrorHandler
}

/**
 * Report a custom error
 */
export function reportError(error: Error, metadata?: Record<string, any>): void {
  if (globalErrorHandler) {
    globalErrorHandler.reportError(error, metadata)
  } else {
    console.error('Global error handler not initialized, logging error:', error)
  }
}

/**
 * Utility function to wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMetadata?: Record<string, any>
): T {
  return ((...args: any[]) => {
    return fn(...args).catch((error: Error) => {
      reportError(error, {
        ...errorMetadata,
        functionName: fn.name,
        arguments: args
      })
      throw error // Re-throw to maintain original behavior
    })
  }) as T
}

/**
 * Utility function to create an error boundary hook
 */
export function useGlobalErrorReporting() {
  return (error: Error, metadata?: Record<string, any>) => {
    reportError(error, metadata)
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).CadenceErrorHandler = {
    getStoredErrors: () => globalErrorHandler?.getStoredErrors() || [],
    clearStoredErrors: () => globalErrorHandler?.clearStoredErrors(),
    getErrorStats: () => globalErrorHandler?.getErrorStats() || { total: 0, byType: {}, recentCount: 0 },
    reportError: (error: Error, metadata?: Record<string, any>) => reportError(error, metadata)
  }
}
