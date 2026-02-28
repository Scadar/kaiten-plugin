import { useState } from 'react';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface FallbackUIProps {
  error?: Error | null;
  onRetry?: () => void | Promise<void>;
  onReset?: () => void;
  title?: string;
  message?: string;
}

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
      window.location.reload();
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="text-destructive h-8 w-8"
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
          <h1 className="text-foreground text-2xl font-bold">{title}</h1>
        </div>

        {/* Error Message */}
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>

        {/* Error Details (Dev Mode Only) */}
        {import.meta.env.DEV && error && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-full justify-start text-sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '▼' : '▶'} Technical Details
            </Button>
            {showDetails && (
              <div className="border-border bg-muted rounded-lg border p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">Error Message:</p>
                    <p className="text-foreground font-mono text-xs break-all">{error.message}</p>
                  </div>
                  {error.stack && (
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-medium">Stack Trace:</p>
                      <pre className="text-foreground overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap">
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
          <Button className="w-full" onClick={handleRetry} disabled={isRetrying}>
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              'Try Again'
            )}
          </Button>

          <Button variant="outline" className="w-full" onClick={handleReset}>
            Reset Application
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-muted-foreground text-xs">
            If the problem persists, please contact support or check the IDE logs for more
            information.
          </p>
        </div>
      </div>
    </div>
  );
}
