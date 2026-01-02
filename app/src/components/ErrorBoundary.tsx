'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-96 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-400">
                Något gick fel
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {this.state.error?.message || 'Ett oväntat fel uppstod'}
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Försök igen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper for PDFViewer specifically
export function PDFErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-96 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-400">
                Kunde inte visa PDF
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Det uppstod ett fel vid laddning av dokumentet.
                Försök ladda om sidan.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
