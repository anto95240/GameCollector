import React, { ReactNode } from 'react';

import ErrorFallback from '../ErrorFallback';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: React.ComponentType<{ error: any; retry: () => void }>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({
      error,
      errorInfo,
    })

    console.error('Error caught by boundary:', error, errorInfo)

    if (process.env.NODE_ENV === 'production') {
      // Send error to monitoring service
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error} retry={this.handleReset} />
      }
      return <ErrorFallback error={this.state.error} retry={this.handleReset} />
    }

    return this.props.children
  }
}

export default ErrorBoundary
