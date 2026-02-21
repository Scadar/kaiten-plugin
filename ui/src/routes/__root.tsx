import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/components/ThemeProvider';

/**
 * Root route component that wraps all child routes.
 * Provides:
 * - ThemeProvider for theme persistence and FOUC prevention
 * - ErrorBoundary for catching and handling React errors
 * - Dark theme wrapper with JetBrains IDE-matching colors
 * - Outlet for rendering child routes
 */
export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
