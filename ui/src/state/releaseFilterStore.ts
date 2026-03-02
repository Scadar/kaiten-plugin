/**
 * Zustand store for managing release child-card filter state.
 *
 * Mirrors the structure of filterStore.ts but is scoped to the
 * Active Release tab so it doesn't interfere with the Tasks filter.
 *
 * Both savedFilters and activeFilterId are persisted to localStorage
 * so the full state (including the active selection) survives page reloads.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { SavedFilter } from '@/lib/advancedFilters';

import { loadFilterState, persistFilterState } from './filterStorePersistence';

// ---------------------------------------------------------------------------
// localStorage key + thin wrappers
// ---------------------------------------------------------------------------

const LS_KEY = 'kaiten:releaseFilters';

function load() {
  return loadFilterState(LS_KEY);
}

function persist(state: Parameters<typeof persistFilterState>[1]) {
  persistFilterState(LS_KEY, state);
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

interface ReleaseFilterStoreState {
  savedFilters: SavedFilter[];
  activeFilterId: string | null;
}

interface ReleaseFilterStoreActions {
  addSavedFilter: (filter: SavedFilter) => void;
  updateSavedFilter: (filter: SavedFilter) => void;
  deleteSavedFilter: (id: string) => void;
  setActiveFilter: (id: string | null) => void;
}

type ReleaseFilterStore = ReleaseFilterStoreState & ReleaseFilterStoreActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initial = load();

export const useReleaseFilterStore = create<ReleaseFilterStore>((set, get) => ({
  savedFilters: initial.savedFilters,
  activeFilterId: initial.activeFilterId,

  addSavedFilter: (filter) => {
    const savedFilters = [...get().savedFilters, filter];
    const activeFilterId = filter.id; // auto-activate newly created filter
    persist({ savedFilters, activeFilterId });
    set({ savedFilters, activeFilterId });
  },

  updateSavedFilter: (filter) => {
    const savedFilters = get().savedFilters.map((f) => (f.id === filter.id ? filter : f));
    persist({ savedFilters, activeFilterId: get().activeFilterId });
    set({ savedFilters });
  },

  deleteSavedFilter: (id) => {
    const savedFilters = get().savedFilters.filter((f) => f.id !== id);
    const activeFilterId = get().activeFilterId === id ? null : get().activeFilterId;
    persist({ savedFilters, activeFilterId });
    set({ savedFilters, activeFilterId });
  },

  setActiveFilter: (id) => {
    persist({ savedFilters: get().savedFilters, activeFilterId: id });
    set({ activeFilterId: id });
  },
}));

// ---------------------------------------------------------------------------
// Selector hooks
// ---------------------------------------------------------------------------

export function useReleaseFilterState() {
  return useReleaseFilterStore(
    useShallow((s) => ({
      savedFilters: s.savedFilters,
      activeFilterId: s.activeFilterId,
    })),
  );
}

export function useReleaseFilterActions() {
  return useReleaseFilterStore(
    useShallow((s) => ({
      addSavedFilter: s.addSavedFilter,
      updateSavedFilter: s.updateSavedFilter,
      deleteSavedFilter: s.deleteSavedFilter,
      setActiveFilter: s.setActiveFilter,
    })),
  );
}

/** Returns the currently active SavedFilter for releases (or null) */
export function useActiveReleaseFilter(): SavedFilter | null {
  return useReleaseFilterStore((s) => {
    if (!s.activeFilterId) return null;
    return s.savedFilters.find((f) => f.id === s.activeFilterId) ?? null;
  });
}
