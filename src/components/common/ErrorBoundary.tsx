import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { Database } from '../../services/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MilkDesk Uncaught UI Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('milkdesk_active_user');
      Database.resetToDefaults();
    } catch (e) {
      console.error('Error resetting database:', e);
      localStorage.clear();
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-rose-200 max-w-lg w-full p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 mb-2">
              Application Notice
            </h1>
            <p className="text-sm text-slate-600 mb-4">
              MilkDesk encountered an unexpected display issue during load. You can reload the page or reset the local demo database to restore initial settings.
            </p>

            {this.state.error && (
              <div className="text-left bg-slate-900 text-rose-300 p-3 rounded-lg text-xs font-mono mb-5 overflow-auto max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 transition-colors shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-700 text-white font-bold text-sm hover:bg-brand-800 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo Data & Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
