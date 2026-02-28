import { useMemo } from 'react';

import { KaitenApiClient } from '@/api/client';

import { useSettings } from './useSettings';

/**
 * Returns a memoized KaitenApiClient instance when settings are configured,
 * or null if serverUrl / token is missing.
 *
 * Use the returned value as the `enabled` guard for query hooks:
 *   const client = useApiClient();
 *   return useQuery({ ..., enabled: client !== null, queryFn: () => client!.method() });
 */
export function useApiClient(): KaitenApiClient | null {
  const settings = useSettings();
  return useMemo(
    () =>
      settings.serverUrl && settings.hasToken
        ? new KaitenApiClient({ serverUrl: settings.serverUrl })
        : null,
    [settings.serverUrl, settings.hasToken],
  );
}
