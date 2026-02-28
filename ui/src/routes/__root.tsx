import { createRootRoute, Outlet } from '@tanstack/react-router';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SetupRequired } from '@/components/SetupRequired';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';
import { useSettingsStatus } from '@/hooks/useSettings';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useFilterPersistence();
  const { isConfigured, isLoading, isVerifying, connectionError } = useSettingsStatus();

  // Show the main app only when settings are loaded, credentials are present,
  // no connection error exists, and no check is in progress.
  const showApp = !isLoading && isConfigured && !connectionError && !isVerifying;

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={400}>
        {showApp ? (
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        ) : !isLoading ? (
          <SetupRequired isVerifying={isVerifying} connectionError={connectionError} />
        ) : null}
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
