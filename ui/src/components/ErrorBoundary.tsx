import { Component, type ReactNode, type ErrorInfo } from 'react';

import { bridge } from '@/bridge/JCEFBridge';

import { FallbackUI } from './FallbackUI';

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Report error to IDE for logging/telemetry
    try {
      bridge.reportError(error, 'error', {
        componentStack: errorInfo.componentStack ?? '',
      });
    } catch (bridgeError) {
      // If bridge reporting fails, just log it
      console.error('Failed to report error to IDE:', bridgeError);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use FallbackUI component
      return this.props.fallback ?? <FallbackUI error={this.state.error} />;
    }

    return this.props.children;
  }
}
