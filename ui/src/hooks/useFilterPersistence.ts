/**
 * Hook to persist filter state between IDE sessions.
 *
 * On mount: reads filter settings from the IDE (KaitenSettingsState) and
 * initializes the filterStore (restores selected space, injects "Me" filter).
 *
 * On every space-selection change: saves the new state back to the IDE via
 * updateSettings RPC so it survives plugin restarts.
 *
 * NOTE: saved filters are persisted in localStorage by filterStore itself.
 */

import { useEffect, useRef } from 'react';

import { bridge } from '@/bridge/JCEFBridge';
import { useFilterStore } from '@/state/filterStore';

import { useSettings } from './useSettings';

export function useFilterPersistence(): void {
  const settings = useSettings();
  const initialized = useRef(false);
  const saving = useRef(false);

  // Subscribe to space-selection changes and persist to IDE settings.
  // The `saving` flag prevents an unnecessary save during initialization.
  useEffect(() => {
    return useFilterStore.subscribe((state) => {
      if (saving.current || !initialized.current) return;

      bridge
        .call('updateSettings', {
          settings: {
            selectedSpaceId: state.selectedSpaceId,
          },
        })
        .catch((err: unknown) =>
          console.error('[useFilterPersistence] Failed to save filter state:', err),
        );
    });
  }, []);

  // Initialize filterStore from persisted settings (once, when settings arrive).
  useEffect(() => {
    if (initialized.current) return;
    if (!settings.hasToken) return;

    saving.current = true;
    useFilterStore.getState().initializeFromSettings(settings);
    saving.current = false;
    initialized.current = true;
  }, [settings]);
}
