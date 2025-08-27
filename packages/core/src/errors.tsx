/**
 * Centralized error handling for Cadence
 */

import React from 'react'
// Fallback lightweight logger to avoid dependency issues during build
const createLogger = (scope: string) => ({
    error: (...args: any[]) => { try { console.error(`[${scope}]`, ...args) } catch { } },
    warn: (...args: any[]) => { try { console.warn(`[${scope}]`, ...args) } catch { } },
    info: (...args: any[]) => { try { console.log(`[${scope}]`, ...args) } catch { } },
})

const logger = createLogger('ErrorHandler')

/**
 * Base error class for all Cadence errors
 */
export class CadenceError extends Error {
    public readonly code: string
    public readonly context?: Record<string, any>
    public readonly timestamp: Date

    constructor(message: string, code: string, context?: Record<string, any>) {
        super(message)
        this.name = this.constructor.name
        this.code = code
        this.context = context
        this.timestamp = new Date()

        // Maintain proper stack trace
        try { (Error as any).captureStackTrace?.(this, this.constructor) } catch { }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        }
    }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends CadenceError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', context)
    }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends CadenceError {
    constructor(resource: string, id?: string) {
        const message = id
            ? `${resource} with id '${id}' not found`
            : `${resource} not found`
        super(message, 'NOT_FOUND', { resource, id })
    }
}

/**
 * Unauthorized error for authentication failures
 */
export class UnauthorizedError extends CadenceError {
    constructor(message = 'Unauthorized access') {
        super(message, 'UNAUTHORIZED')
    }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends CadenceError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'CONFLICT', context)
    }
}

/**
 * Platform error for platform-specific failures
 */
export class PlatformError extends CadenceError {
    constructor(message: string, platform: string, context?: Record<string, any>) {
        super(message, 'PLATFORM_ERROR', { ...context, platform })
    }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends CadenceError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'NETWORK_ERROR', context)
    }
}

/**
 * Global error handler
 */
export class ErrorHandler {
    private errorListeners: ((error: Error) => void)[] = []
    private errorQueue: Error[] = []
    private maxQueueSize = 100

    /**
     * Handle an error
     */
    handle(error: Error, context?: Record<string, any>): void {
        // Log the error
        logger.error('Error occurred:', {
            error: error.message,
            stack: error.stack,
            context
        })

        // Add to queue
        this.errorQueue.push(error)
        if (this.errorQueue.length > this.maxQueueSize) {
            this.errorQueue.shift()
        }

        // Notify listeners
        this.errorListeners.forEach(listener => {
            try {
                listener(error)
            } catch (listenerError) {
                logger.error('Error in error listener:', listenerError)
            }
        })
    }

    /**
     * Add an error listener
     */
    addListener(listener: (error: Error) => void): () => void {
        this.errorListeners.push(listener)
        return () => {
            const index = this.errorListeners.indexOf(listener)
            if (index > -1) {
                this.errorListeners.splice(index, 1)
            }
        }
    }

    /**
     * Get recent errors
     */
    getRecentErrors(): Error[] {
        return [...this.errorQueue]
    }

    /**
     * Clear error queue
     */
    clearErrors(): void {
        this.errorQueue = []
    }

    /**
     * Check if error is recoverable
     */
    isRecoverable(error: Error): boolean {
        if (error instanceof ValidationError) return true
        if (error instanceof NotFoundError) return true
        if (error instanceof UnauthorizedError) return true
        if (error instanceof ConflictError) return true
        if (error instanceof NetworkError) return true
        return false
    }

    /**
     * Format error for user display
     */
    formatForUser(error: Error): string {
        if (error instanceof CadenceError) {
            switch (error.code) {
                case 'VALIDATION_ERROR':
                    return `Invalid input: ${error.message}`
                case 'NOT_FOUND':
                    return `Could not find the requested item`
                case 'UNAUTHORIZED':
                    return `You don't have permission to perform this action`
                case 'CONFLICT':
                    return `There was a conflict: ${error.message}`
                case 'NETWORK_ERROR':
                    return `Network error: Please check your connection`
                case 'PLATFORM_ERROR':
                    return `Platform error: ${error.message}`
                default:
                    return error.message
            }
        }
        return 'An unexpected error occurred'
    }
}

// Singleton instance
export const errorHandler = new ErrorHandler()

/**
 * Error boundary helper for React
 */
export function withErrorBoundary<T extends object>(
    Component: React.ComponentType<T>,
    fallback?: React.ComponentType<{ error: Error; reset: () => void }>
) {
    return (props: T) => {
        const [error, setError] = React.useState<Error | null>(null)

        if (error) {
            const Fallback = fallback || DefaultErrorFallback
            return <Fallback error={error} reset={() => setError(null)} />
        }

        try {
            return <Component {...props} />
        } catch (err) {
            setError(err as Error)
            return null
        }
    }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div style={{ padding: 20, backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 4 }}>
            <h2>Something went wrong</h2>
            <p>{errorHandler.formatForUser(error)}</p>
            <button onClick={reset} style={{ marginTop: 10 }}>Try again</button>
        </div>
    )
}


