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
  const [isRetrying,   setIsRetrying]   = useState(false);
  const [showDetails,  setShowDetails]  = useState(false);

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
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm text-muted-foreground"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '▼' : '▶'} Technical Details
            </Button>
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
          <Button
            className="w-full"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              'Try Again'
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            Reset Application
          </Button>
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
