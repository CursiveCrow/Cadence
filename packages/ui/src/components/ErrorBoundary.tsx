import React from 'react'

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
        <div style={{ padding: 24 }}>
          <h2>Something went wrong.</h2>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={this.resetError}>Retry</button>
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


