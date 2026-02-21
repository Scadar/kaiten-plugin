import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Root route component that wraps all child routes.
 * Provides:
 * - ErrorBoundary for catching and handling React errors
 * - Dark theme wrapper with JetBrains IDE-matching colors
 * - Outlet for rendering child routes
 */
export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ErrorBoundary>
      <div className="dark min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
