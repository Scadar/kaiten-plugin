import { useState } from 'react';

interface FallbackUIProps {
  error?: Error | null;
  onRetry?: () => void;
  onReset?: () => void;
  title?: string;
  message?: string;
}

/**
 * Generic fallback UI component for error states.
 * Provides user-friendly error display with retry and reset actions.
 *
 * @param error - Optional error object to display (shows details in dev mode)
 * @param onRetry - Optional retry callback (if not provided, defaults to window.location.reload)
 * @param onReset - Optional reset callback (if not provided, defaults to window.location.reload)
 * @param title - Optional custom title (defaults to "Something went wrong")
 * @param message - Optional custom message (defaults to generic error message)
 */
export function FallbackUI({
  error,
  onRetry,
  onReset,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again or reset the application.',
}: FallbackUIProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry action: reload the page
        window.location.reload();
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      // Default reset action: reload the page
      window.location.reload();
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-destructive"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>

        {/* Error Message */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Error Details (Dev Mode Only) */}
        {import.meta.env.DEV && error && (
          <div className="space-y-2">
            <button
              onClick={toggleDetails}
              className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? '▼' : '▶'} Technical Details
            </button>
            {showDetails && (
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Error Message:</p>
                    <p className="font-mono text-xs text-foreground break-all">{error.message}</p>
                  </div>
                  {error.stack && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Stack Trace:</p>
                      <pre className="font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRetrying ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Retrying...
              </span>
            ) : (
              'Try Again'
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Reset Application
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            If the problem persists, please contact support or check the IDE logs for more information.
          </p>
        </div>
      </div>
    </div>
  );
}
