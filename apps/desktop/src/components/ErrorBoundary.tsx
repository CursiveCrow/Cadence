/**
 * React Error Boundary for comprehensive error handling
 * Catches JavaScript errors anywhere in the child component tree
 */

import React from 'react'
import './ErrorBoundary.css'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  isolate?: boolean // If true, only isolates this component tree
}

export interface ErrorFallbackProps {
  error: Error | null
  errorInfo: React.ErrorInfo | null
  resetError: () => void
  errorId: string | null
}

/**
 * Enhanced Error Boundary with logging and recovery
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error details
    this.logError(error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo)
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError)
      }
    }

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo)
  }

  private logError(error: Error, errorInfo: React.ErrorInfo): void {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount
    }

    console.group(`🚨 React Error Boundary Caught Error (ID: ${this.state.errorId})`)
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Full Details:', errorDetails)
    console.groupEnd()

    // Store error in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('cadence_errors') || '[]')
      existingErrors.push(errorDetails)
      
      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10)
      localStorage.setItem('cadence_errors', JSON.stringify(recentErrors))
    } catch (storageError) {
      console.warn('Failed to store error in localStorage:', storageError)
    }
  }

  private reportError(error: Error, errorInfo: React.ErrorInfo): void {
    // This would integrate with error reporting services like Sentry
    // For now, just prepare the data structure
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: Date.now(),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.retryCount
      }
    }

    // TODO: Send to error reporting service
    console.log('Error report prepared:', errorReport)
  }

  private resetError = (): void => {
    this.retryCount++
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })

    console.log(`Error boundary reset (retry ${this.retryCount}/${this.maxRetries})`)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorId
}) => {
  const [showDetails, setShowDetails] = React.useState(false)

  const copyErrorDetails = async (): Promise<void> => {
    const errorDetails = {
      errorId,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      alert('Error details copied to clipboard')
    } catch (clipboardError) {
      console.error('Failed to copy to clipboard:', clipboardError)
      // Fallback: show in alert
      alert(`Error details:\n${JSON.stringify(errorDetails, null, 2)}`)
    }
  }

  const reloadApplication = (): void => {
    window.location.reload()
  }

  return (
    <div className="error-boundary-fallback">
      <div className="error-boundary-content">
        <div className="error-icon">⚠️</div>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred in the application.</p>
        
        {errorId && (
          <p className="error-id">
            Error ID: <code>{errorId}</code>
          </p>
        )}
        
        <div className="error-actions">
          <button
            onClick={resetError}
            className="error-button error-button-primary"
          >
            Try Again
          </button>
          
          <button
            onClick={reloadApplication}
            className="error-button error-button-secondary"
          >
            Reload App
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="error-button error-button-secondary"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          
          <button
            onClick={copyErrorDetails}
            className="error-button error-button-secondary"
          >
            Copy Error Details
          </button>
        </div>
        
        {showDetails && (
          <details className="error-details" open>
            <summary>Technical Details</summary>
            <div className="error-details-content">
              <h3>Error Message:</h3>
              <pre>{error?.message || 'Unknown error'}</pre>
              
              {error?.stack && (
                <>
                  <h3>Stack Trace:</h3>
                  <pre className="error-stack">{error.stack}</pre>
                </>
              )}
              
              {errorInfo?.componentStack && (
                <>
                  <h3>Component Stack:</h3>
                  <pre className="error-stack">{errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          </details>
        )}
        
        <div className="error-help">
          <p>
            If this problem persists, please copy the error details and report the issue.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for error handling within components
 */
export function useErrorHandler(): (error: Error, errorInfo?: any) => void {
  return React.useCallback((error: Error, errorInfo?: any) => {
    console.error('Manual error handled:', error, errorInfo)
    
    // Store error for debugging
    try {
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        errorInfo,
        timestamp: new Date().toISOString(),
        type: 'manual'
      }
      
      const existingErrors = JSON.parse(localStorage.getItem('cadence_errors') || '[]')
      existingErrors.push(errorDetails)
      localStorage.setItem('cadence_errors', JSON.stringify(existingErrors.slice(-10)))
    } catch (storageError) {
      console.warn('Failed to store manual error:', storageError)
    }
    
    // Re-throw to trigger error boundary if needed
    throw error
  }, [])
}
