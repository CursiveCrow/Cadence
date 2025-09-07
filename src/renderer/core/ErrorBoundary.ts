// Error boundary and logging utilities for renderer components
export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

interface ErrorLogEntry {
    timestamp: number
    component: string
    method: string
    severity: ErrorSeverity
    message: string
    error?: Error
    context?: Record<string, unknown>
}

class ErrorLogger {
    private logs: ErrorLogEntry[] = []
    private maxLogs = 100

    log(
        component: string,
        method: string,
        severity: ErrorSeverity,
        message: string,
        error?: Error,
        context?: Record<string, unknown>
    ) {
        const entry: ErrorLogEntry = {
            timestamp: Date.now(),
            component,
            method,
            severity,
            message,
            error,
            context
        }

        this.logs.push(entry)

        // Keep logs within limit
        if (this.logs.length > this.maxLogs) {
            this.logs.shift()
        }

        // Log to console in development
        if (import.meta?.env?.DEV) {
            const logLevel = this.getConsoleMethod(severity)
            logLevel(`[${component}:${method}] ${message}`, error || '', context || '')
        }
    }

    private getConsoleMethod(severity: ErrorSeverity) {
        switch (severity) {
            case ErrorSeverity.INFO:
                return console.log
            case ErrorSeverity.WARNING:
                return console.warn
            case ErrorSeverity.ERROR:
            case ErrorSeverity.CRITICAL:
                return console.error
        }
    }

    getLogs(component?: string): ErrorLogEntry[] {
        if (component) {
            return this.logs.filter(log => log.component === component)
        }
        return [...this.logs]
    }

    clear() {
        this.logs = []
    }
}

// Global error logger instance
export const errorLogger = new ErrorLogger()

// Error boundary decorator for methods
export function withErrorBoundary<T extends any[], R>(
    component: string,
    method: string,
    fn: (...args: T) => R,
    fallback?: R,
    severity: ErrorSeverity = ErrorSeverity.ERROR
) {
    return (...args: T): R | undefined => {
        try {
            return fn(...args)
        } catch (error) {
            errorLogger.log(
                component,
                method,
                severity,
                `Method failed: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error : undefined,
                { args: args.length > 0 ? args : undefined }
            )

            return fallback
        }
    }
}

// Safe execution wrapper for async operations
export async function safeAsync<T>(
    component: string,
    method: string,
    fn: () => Promise<T>,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await fn()
    } catch (error) {
        errorLogger.log(
            component,
            method,
            ErrorSeverity.ERROR,
            `Async operation failed: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : undefined
        )

        return fallback
    }
}

// Error boundary for PixiJS graphics operations
export function safePixiOperation<T>(
    component: string,
    method: string,
    operation: () => T,
    fallback?: T
): T | undefined {
    return withErrorBoundary(component, method, operation, fallback, ErrorSeverity.WARNING)()
}

// Safe container cleanup utility
export function safeCleanup(component: string, cleanup: () => void) {
    withErrorBoundary(component, 'cleanup', cleanup, undefined, ErrorSeverity.WARNING)()
}

// Performance monitoring wrapper
export function withPerformanceMonitoring<T extends any[], R>(
    component: string,
    method: string,
    fn: (...args: T) => R,
    slowThresholdMs: number = 16 // One frame at 60fps
) {
    return (...args: T): R => {
        const start = performance.now()
        const result = fn(...args)
        const duration = performance.now() - start

        if (duration > slowThresholdMs) {
            errorLogger.log(
                component,
                method,
                ErrorSeverity.WARNING,
                `Slow operation detected: ${duration.toFixed(2)}ms`,
                undefined,
                { duration, threshold: slowThresholdMs }
            )
        }

        return result
    }
}

// Error recovery strategies
export const ErrorRecovery = {
    // Retry operation with exponential backoff
    retry: async <T>(
        component: string,
        operation: () => Promise<T>,
        maxAttempts: number = 3,
        baseDelay: number = 100
    ): Promise<T | undefined> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation()
            } catch (error) {
                if (attempt === maxAttempts) {
                    errorLogger.log(
                        component,
                        'retry',
                        ErrorSeverity.ERROR,
                        `Operation failed after ${maxAttempts} attempts`,
                        error instanceof Error ? error : undefined
                    )
                    return undefined
                }

                errorLogger.log(
                    component,
                    'retry',
                    ErrorSeverity.WARNING,
                    `Attempt ${attempt} failed, retrying...`,
                    error instanceof Error ? error : undefined
                )

                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)))
            }
        }
    },

    // Graceful degradation for rendering
    degradeToBasicRendering: (component: string) => {
        errorLogger.log(
            component,
            'degradation',
            ErrorSeverity.WARNING,
            'Falling back to basic rendering mode'
        )
        // This would disable advanced features like effects, complex shaders, etc.
    },

    // Reset component state
    resetComponentState: (component: string, resetFn: () => void) => {
        errorLogger.log(
            component,
            'reset',
            ErrorSeverity.INFO,
            'Resetting component state due to error'
        )

        withErrorBoundary(component, 'reset', resetFn)()
    }
}

// Health check utilities
export const HealthCheck = {
    // Check if PixiJS application is healthy
    checkPixiHealth: (app: any): boolean => {
        try {
            return !!(app && app.stage && app.renderer && !app.destroyed)
        } catch {
            return false
        }
    },

    // Check if container is valid
    checkContainer: (container: any): boolean => {
        try {
            return !!(container && typeof container.addChild === 'function' && !container.destroyed)
        } catch {
            return false
        }
    },

    // Check memory usage (basic)
    checkMemoryUsage: (): { heapUsed?: number; warning: boolean } => {
        try {
            if (typeof performance === 'object' && 'memory' in performance) {
                const memory = (performance as any).memory
                const heapUsed = memory.usedJSHeapSize
                const heapLimit = memory.totalJSHeapSize

                return {
                    heapUsed,
                    warning: heapUsed > heapLimit * 0.8 // Warning if using > 80% of heap
                }
            }
        } catch { }

        return { warning: false }
    }
}
