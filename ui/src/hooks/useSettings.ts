import { useQuery } from '@tanstack/react-query';
import { bridge } from '@/bridge/JCEFBridge';
import { settingsKeys } from '@/api/endpoints';
import type { KaitenSettings } from '@/api/types';
import { getDefaultSettings } from '@/api/types';

function settingsQueryOptions() {
  return {
    queryKey: settingsKeys.all(),
    queryFn: async () => {
      // Must wait for bridge ready before any bridge.call —
      // otherwise window.__jcef_send__ might not be injected yet by JCEF
      // and the call throws immediately, causing settings to fall back to defaults.
      await bridge.ready();
      const settings = await bridge.call('getSettings', undefined);

      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings response from IDE');
      }

      return settings as KaitenSettings;
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
    retryOnMount: false,
  };
}

export function useSettings(): KaitenSettings {
  const { data } = useQuery(settingsQueryOptions());
  return data ?? getDefaultSettings();
}

export function useSettingsStatus() {
  const { data, isSuccess, isError } = useQuery(settingsQueryOptions());

  const settings = data ?? getDefaultSettings();
  const isLoaded = isSuccess || isError;
  const isConfigured = isLoaded && settings.hasToken && !!settings.serverUrl;

  return {
    /** URL and token are present */
    isConfigured,
    /** Settings have not been loaded from the IDE yet */
    isLoading: !isLoaded,
    /** A connection check is currently in progress */
    isVerifying: isConfigured && !!settings.isVerifyingConnection,
    /** Non-empty when the last connection check failed */
    connectionError: settings.lastConnectionError ?? '',
    hasApiToken: settings.hasToken,
    hasServerUrl: !!settings.serverUrl,
    hasCurrentUser: settings.currentUserId !== null,
    hasSelectedSpace: settings.selectedSpaceId !== null,
    hasSelectedBoard: settings.selectedBoardId !== null,
    hasSelectedColumns: settings.selectedColumnIds.length > 0,
  };
}
