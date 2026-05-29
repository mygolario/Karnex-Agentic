'use client'

import React from 'react'

interface Props {
  children?: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in boundary:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-red-500/10 bg-red-950/10 p-8 text-center backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-200">Component Error</h3>
          <p className="mt-2 text-xs text-zinc-500 max-w-sm">
            Something broke in this dashboard card. Click below to try reloading the component.
          </p>
          {this.state.error && (
            <pre className="mt-3 max-w-md overflow-x-auto rounded bg-black/40 p-3 text-left text-[10px] font-mono text-red-400 border border-white/[0.05]">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Reload Component
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
