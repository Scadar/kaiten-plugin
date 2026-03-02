/**
 * Pure helper functions for localStorage persistence of filter state.
 *
 * Used by both filterStore.ts and releaseFilterStore.ts to avoid duplicating
 * the load/persist logic. The functions are not Zustand-specific.
 */

import type { SavedFilter } from '@/lib/advancedFilters';

export interface PersistedFilterState {
  savedFilters: SavedFilter[];
  activeFilterId: string | null;
}

/**
 * Loads persisted filter state from localStorage.
 * Handles the migration from the old format (plain SavedFilter array)
 * to the current format (object with savedFilters + activeFilterId).
 *
 * Returns an empty default state on any parse error or when the key is absent.
 */
export function loadFilterState(storageKey: string): PersistedFilterState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      // Migrate: old format was a plain array of SavedFilter
      if (Array.isArray(parsed)) {
        return { savedFilters: parsed as SavedFilter[], activeFilterId: null };
      }
      return parsed as PersistedFilterState;
    }
  } catch {
    if (import.meta.env.DEV)
      console.warn(`[filterStorePersistence] Failed to load "${storageKey}"`);
  }
  return { savedFilters: [], activeFilterId: null };
}

/**
 * Persists filter state to localStorage.
 * Silently ignores write errors (e.g. storage quota exceeded).
 */
export function persistFilterState(storageKey: string, state: PersistedFilterState): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    if (import.meta.env.DEV)
      console.warn(`[filterStorePersistence] Failed to persist "${storageKey}"`);
  }
}
