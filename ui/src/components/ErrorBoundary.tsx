import { Component, ReactNode } from 'react';
import { bridge } from '@/bridge/JCEFBridge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches React errors and reports them to the IDE.
 * Provides a fallback UI when errors occur to prevent the entire app from crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Report error to IDE for logging/telemetry
    try {
      bridge.reportError(error, 'error', {
        componentStack: errorInfo.componentStack || '',
      });
    } catch (bridgeError) {
      // If bridge reporting fails, just log it
      console.error('Failed to report error to IDE:', bridgeError);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI with dark theme styling
      return (
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-muted-foreground">
              An error occurred in the application. The error has been reported.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-mono text-xs">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
