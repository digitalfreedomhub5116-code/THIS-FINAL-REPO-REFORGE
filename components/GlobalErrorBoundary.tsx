
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-black text-red-500 font-mono flex flex-col items-center justify-center p-6 overflow-auto">
          <div className="max-w-2xl w-full border-2 border-red-600 bg-red-950/20 rounded-xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.5)]">
            
            <div className="flex items-center gap-4 mb-6 border-b border-red-800 pb-4">
              <div className="p-3 bg-red-600 text-black rounded-lg">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">System Critical Failure</h1>
                <p className="text-xs text-red-400 uppercase tracking-widest">Runtime Exception Detected</p>
              </div>
            </div>

            <div className="bg-black border border-red-900/50 rounded-lg p-4 mb-6 overflow-x-auto">
              <p className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Terminal size={14} /> ERROR LOG:
              </p>
              <pre className="text-xs text-red-300 whitespace-pre-wrap break-words">
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                 <pre className="text-[10px] text-red-800/70 mt-4 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                 </pre>
              )}
            </div>

            <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                    The application encountered a fatal error and cannot continue.
                </p>
                <button
                  onClick={() => {
                      localStorage.clear(); // Option to clear bad data
                      window.location.reload();
                  }}
                  className="px-6 py-3 bg-red-600 text-white font-bold uppercase tracking-widest rounded hover:bg-white hover:text-red-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <RefreshCw size={16} /> Hard Reset System
                </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
