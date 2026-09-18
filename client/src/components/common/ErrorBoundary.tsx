import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-rose-100 shadow-2xs my-6 mx-auto max-w-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4 ring-8 ring-rose-50/50">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {this.props.fallbackTitle || 'Something went wrong rendering this view'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try reloading or go back to the previous screen.'}
          </p>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <RefreshCw size={14} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
