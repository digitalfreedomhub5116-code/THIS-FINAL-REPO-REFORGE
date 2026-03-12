import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 p-8 bg-red-950/10 border border-red-900/30 rounded-xl">
          <AlertTriangle size={32} className="text-system-danger animate-pulse" />
          <div className="text-center">
            <p className="text-system-danger font-mono text-xs font-bold tracking-widest uppercase mb-1">
              System Error
            </p>
            <p className="text-gray-500 font-mono text-[10px]">
              {this.props.fallbackLabel || 'A component failed to render'}
            </p>
            {this.state.error && (
              <p className="text-gray-700 font-mono text-[9px] mt-2 max-w-sm truncate">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-gray-800 hover:border-gray-500 px-4 py-2 rounded transition-all"
          >
            <RefreshCw size={12} />
            Reload Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
