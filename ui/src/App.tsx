import { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRouter, createHashHistory, RouterProvider } from '@tanstack/react-router';

import { bridge } from '@/bridge/JCEFBridge';

import { queryClient } from './lib/cache';
import { routeTree } from './routeTree.gen';

// ---------------------------------------------------------------------------
// Route persistence helpers
// ---------------------------------------------------------------------------

const ROUTE_LS_KEY = 'kaiten:lastRoute';

/** Routes that should not be saved (require specific dynamic params) */
const EPHEMERAL_PREFIXES = ['/card/'];

function saveRoute(pathname: string): void {
  if (EPHEMERAL_PREFIXES.some((p) => pathname.startsWith(p))) return;
  try {
    localStorage.setItem(ROUTE_LS_KEY, pathname);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[App] localStorage error:', e);
  }
}

// Before creating the router, restore the saved route by setting window.location.hash.
// TanStack Router with hash history reads the hash on init, so this lets it start
// at the last visited page without an extra navigation after mount.
try {
  const savedRoute = localStorage.getItem(ROUTE_LS_KEY);
  const currentHash = window.location.hash;
  const isDefaultHash = !currentHash || currentHash === '#' || currentHash === '#/';
  if (savedRoute && savedRoute !== '/' && isDefaultHash) {
    window.location.hash = savedRoute;
  }
} catch (e) {
  if (import.meta.env.DEV) console.warn('[App] localStorage error:', e);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

// Use hash-based history so routing works under file:// protocol (JCEF)
const hashHistory = createHashHistory();

// Create the router instance
const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: 'intent',
});

// Register the router for type-safe routing
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Intercept all external link clicks and open them in the system browser
 * via the IDE bridge. JCEF does not support target="_blank" — it either
 * tries to open a new JCEF window (which can freeze the plugin) or does nothing.
 */
function useBrowserLinkInterceptor() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href') ?? '';
      // Only intercept absolute URLs (http/https). Leave hash-links and
      // internal routes alone so TanStack Router continues to handle them.
      if (!href.startsWith('http://') && !href.startsWith('https://')) return;

      e.preventDefault();
      e.stopPropagation();
      bridge.call('openUrl', { url: href }).catch(console.error);
    };

    // Capture phase so we intercept before any onClick handlers fire.
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);
}

/** Subscribe to router navigation and persist the current route. */
function useRoutePersistence() {
  useEffect(() => {
    return router.subscribe('onResolved', () => {
      saveRoute(router.state.location.pathname);
    });
  }, []);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  useBrowserLinkInterceptor();
  useRoutePersistence();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
