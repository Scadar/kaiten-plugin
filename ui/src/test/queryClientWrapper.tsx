import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Creates a QueryClient configured for tests:
 * - Retries disabled (fail fast)
 * - No garbage collection delay
 * - No stale-while-revalidate
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

interface ProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

// eslint-disable-next-line react-refresh/only-export-components
function Providers({ children, queryClient }: ProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Wraps the component under test with a QueryClientProvider.
 * Accepts an optional pre-configured queryClient for advanced scenarios.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient },
) {
  const { queryClient, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    ...renderOptions,
  });
}
