import { useQuery } from '@tanstack/react-query';
import { bridge } from '@/bridge/JCEFBridge';
import { settingsKeys } from '@/api/endpoints';
import type { KaitenSettings } from '@/api/types';
import { getDefaultSettings } from '@/api/types';

export function useSettings(): KaitenSettings {
  const { data } = useQuery({
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
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    retryOnMount: false,
  });

  return data ?? getDefaultSettings();
}

export function useSettingsStatus() {
  const settings = useSettings();

  return {
    isConfigured: settings.hasToken && !!settings.serverUrl,
    hasApiToken: settings.hasToken,
    hasServerUrl: !!settings.serverUrl,
    hasCurrentUser: settings.currentUserId !== null,
    hasSelectedSpace: settings.selectedSpaceId !== null,
    hasSelectedBoard: settings.selectedBoardId !== null,
    hasSelectedColumns: settings.selectedColumnIds.length > 0,
  };
}
