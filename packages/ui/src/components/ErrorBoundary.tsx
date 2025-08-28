import React from 'react'
import '../styles/tokens.css'
import '../styles/ui.css'

export interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Consumers can hook logging globally; avoid platform specifics here
    console.error('UI ErrorBoundary caught:', error, errorInfo)
  }

  resetError = () => this.setState({ hasError: false, error: null })

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback
      if (Fallback) return <Fallback error={this.state.error} resetError={this.resetError} />
      return (
        <div className="ui-p-3 ui-text">
          <h2 className="ui-text-lg ui-font-700">Something went wrong.</h2>
          <pre className="ui-text-sm" style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button className="ui-btn ui-rounded-md" onClick={this.resetError}>Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return Wrapped
}


