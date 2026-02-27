import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  useFilterPersistence();

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={400}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
