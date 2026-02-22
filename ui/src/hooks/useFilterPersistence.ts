/**
 * Hook to persist filter state between IDE sessions.
 *
 * On mount: reads filter settings from the IDE (KaitenSettingsState) and
 * initializes the filterStore so the user sees their previous selections.
 *
 * On every filter change: saves the new state back to the IDE via the
 * updateSettings RPC so it survives plugin restarts.
 */

import { useEffect, useRef } from 'react';
import { useFilterStore } from '@/state/filterStore';
import { useSettings } from './useSettings';
import { bridge } from '@/bridge/JCEFBridge';

export function useFilterPersistence(): void {
  const settings = useSettings();
  const initialized = useRef(false);
  const saving = useRef(false);

  // Subscribe to filter changes and persist to IDE (set up once on mount).
  // The `saving` flag prevents an unnecessary save during initialization
  // because Zustand calls subscribers synchronously inside `set`.
  useEffect(() => {
    const unsubscribe = useFilterStore.subscribe((state) => {
      if (saving.current || !initialized.current) return;

      bridge
        .call('updateSettings', {
          settings: {
            selectedSpaceId: state.selectedSpaceId,
            selectedBoardId: state.selectedBoardId,
            selectedColumnIds: state.selectedColumnIds,
            selectedFilterUserId: state.selectedUserId,
            filterAsMember: state.filterAsMember,
            filterAsResponsible: state.filterAsResponsible,
            filterLogic: state.filterLogic,
          },
        })
        .catch((err) =>
          console.error('[useFilterPersistence] Failed to save filter state:', err)
        );
    });

    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize filterStore from persisted settings (once, when settings arrive).
  useEffect(() => {
    if (initialized.current) return;
    // Wait until the plugin is configured — default empty settings are not useful
    if (!settings.apiToken) return;

    // Block the subscription listener during synchronous state initialization
    saving.current = true;
    useFilterStore.getState().initializeFromSettings(settings);
    saving.current = false;
    initialized.current = true;
  }, [settings]);
}
