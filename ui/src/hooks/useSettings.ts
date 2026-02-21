/**
 * Hook for accessing Kaiten plugin settings from IDE via RPC bridge
 *
 * Settings are stored in the IDE plugin and accessed via bridge RPC.
 * This hook uses React Query to cache settings with infinite stale time
 * since settings rarely change during a session.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const settings = useSettings();
 *
 *   if (!settings.apiToken) {
 *     return <div>Please configure your API token in settings</div>;
 *   }
 *
 *   return <div>Connected to {settings.serverUrl}</div>;
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { bridge } from '@/bridge/JCEFBridge';
import { settingsKeys } from '@/api/endpoints';
import type { KaitenSettings } from '@/api/types';
import { getDefaultSettings } from '@/api/types';

/**
 * Hook to fetch and cache Kaiten plugin settings
 *
 * Features:
 * - Fetches settings from IDE via bridge RPC
 * - Caches result with infinite staleTime (settings rarely change)
 * - Returns default settings if unavailable or on error
 * - Automatically retries on failure (up to 2 retries)
 *
 * @returns KaitenSettings object with current plugin settings
 */
export function useSettings(): KaitenSettings {
  const { data, error } = useQuery({
    queryKey: settingsKeys.all(),
    queryFn: async () => {
      try {
        // Call bridge RPC to get settings from IDE
        const settings = await bridge.call('getSettings', undefined);

        // Validate that we got a settings object
        if (!settings || typeof settings !== 'object') {
          throw new Error('Invalid settings response from IDE');
        }

        return settings as KaitenSettings;
      } catch (err) {
        // Log error for debugging
        console.error('Failed to fetch settings from IDE:', err);
        throw err;
      }
    },
    // Settings rarely change, so use infinite stale time
    staleTime: Infinity,
    // Keep settings in cache for 30 minutes even when unused
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Retry up to 2 times on failure
    retry: 2,
    // Don't retry on specific errors (e.g., RPC method not found)
    retryOnMount: false,
  });

  // Log error for debugging (non-blocking)
  if (error) {
    console.warn('Using default settings due to error:', error);
  }

  // Return fetched settings or default fallback
  return data ?? getDefaultSettings();
}

/**
 * Hook to check if settings are properly configured
 * Useful for showing setup UI when settings are missing
 *
 * @returns Object with configuration status
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConfigured, hasApiToken, hasServerUrl } = useSettingsStatus();
 *
 *   if (!isConfigured) {
 *     return <SetupWizard />;
 *   }
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useSettingsStatus() {
  const settings = useSettings();

  return {
    /**
     * True if both apiToken and serverUrl are configured
     */
    isConfigured: !!settings.apiToken && !!settings.serverUrl,

    /**
     * True if apiToken is set
     */
    hasApiToken: !!settings.apiToken,

    /**
     * True if serverUrl is set
     */
    hasServerUrl: !!settings.serverUrl,

    /**
     * True if current user is set
     */
    hasCurrentUser: settings.currentUserId !== null,

    /**
     * True if a space is selected
     */
    hasSelectedSpace: settings.selectedSpaceId !== null,

    /**
     * True if a board is selected
     */
    hasSelectedBoard: settings.selectedBoardId !== null,

    /**
     * True if any columns are selected
     */
    hasSelectedColumns: settings.selectedColumnIds.length > 0,
  };
}
