/**
 * Zustand store for managing filter state.
 *
 * New design:
 * - selectedSpaceId  — space scope (always visible in the panel)
 * - savedFilters     — list of named filters (persisted in localStorage)
 * - activeFilterId   — which saved filter is currently applied (null = no filter)
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { KaitenSettings } from '@/api/types';
import {
  type SavedFilter,
} from '@/lib/advancedFilters';

// ---------------------------------------------------------------------------
// State & action interfaces
// ---------------------------------------------------------------------------

export interface FilterStoreState {
  selectedSpaceId:  number | null;
  savedFilters:     SavedFilter[];
  activeFilterId:   string | null;
}

export interface FilterStoreActions {
  setSelectedSpace:   (spaceId: number | null) => void;
  setSavedFilters:    (filters: SavedFilter[]) => void;
  addSavedFilter:     (filter: SavedFilter) => void;
  updateSavedFilter:  (filter: SavedFilter) => void;
  deleteSavedFilter:  (id: string) => void;
  setActiveFilter:    (id: string | null) => void;
  reset:              () => void;
  /** Called once on startup — restores space selection from persisted IDE settings */
  initializeFromSettings: (settings: KaitenSettings) => void;
}

export type FilterStore = FilterStoreState & FilterStoreActions;

// ---------------------------------------------------------------------------
// localStorage persistence for saved filters + active filter
// ---------------------------------------------------------------------------

const LS_KEY = 'kaiten:savedFilters';

interface PersistedFilterState {
  savedFilters:   SavedFilter[];
  activeFilterId: string | null;
}

function loadPersistedState(): PersistedFilterState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      // Migrate from old format (plain array) to new format (object)
      if (Array.isArray(parsed)) {
        return { savedFilters: parsed as SavedFilter[], activeFilterId: null };
      }
      return parsed as PersistedFilterState;
    }
  } catch {
    // ignore
  }
  return { savedFilters: [], activeFilterId: null };
}

function persistState(state: PersistedFilterState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const persisted = loadPersistedState();

const initialState: FilterStoreState = {
  selectedSpaceId: null,
  savedFilters:    persisted.savedFilters,
  activeFilterId:  persisted.activeFilterId,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...initialState,

  setSelectedSpace: (spaceId) => {
    set({ selectedSpaceId: spaceId });
  },

  setSavedFilters: (filters) => {
    persistState({ savedFilters: filters, activeFilterId: get().activeFilterId });
    set({ savedFilters: filters });
  },

  addSavedFilter: (filter) => {
    const filters = [...get().savedFilters, filter];
    persistState({ savedFilters: filters, activeFilterId: get().activeFilterId });
    set({ savedFilters: filters });
  },

  updateSavedFilter: (filter) => {
    const filters = get().savedFilters.map((f) => (f.id === filter.id ? filter : f));
    persistState({ savedFilters: filters, activeFilterId: get().activeFilterId });
    set({ savedFilters: filters });
  },

  deleteSavedFilter: (id) => {
    const filters = get().savedFilters.filter((f) => f.id !== id);
    const activeId = get().activeFilterId === id ? null : get().activeFilterId;
    persistState({ savedFilters: filters, activeFilterId: activeId });
    set({ savedFilters: filters, activeFilterId: activeId });
  },

  setActiveFilter: (id) => {
    persistState({ savedFilters: get().savedFilters, activeFilterId: id });
    set({ activeFilterId: id });
  },

  reset: () => {
    const p = loadPersistedState();
    set({ ...initialState, savedFilters: p.savedFilters, activeFilterId: p.activeFilterId });
  },

  initializeFromSettings: (settings) => {
    const state = get();

    // Restore space selection from IDE settings
    if (settings.selectedSpaceId && state.selectedSpaceId === null) {
      set({ selectedSpaceId: settings.selectedSpaceId });
    }

    // Remove the previously auto-created 'me' filter if still present
    const saved = get().savedFilters;
    const withoutMe = saved.filter((f) => f.id !== 'me');
    if (withoutMe.length !== saved.length) {
      const activeId = get().activeFilterId === 'me' ? null : get().activeFilterId;
      persistState({ savedFilters: withoutMe, activeFilterId: activeId });
      set({ savedFilters: withoutMe, activeFilterId: activeId });
    }
  },
}));

// ---------------------------------------------------------------------------
// Selector hooks
// ---------------------------------------------------------------------------

export function useFilterState() {
  return useFilterStore(
    useShallow((s) => ({
      selectedSpaceId: s.selectedSpaceId,
      savedFilters:    s.savedFilters,
      activeFilterId:  s.activeFilterId,
    }))
  );
}

export function useFilterActions() {
  return useFilterStore(
    useShallow((s) => ({
      setSelectedSpace:  s.setSelectedSpace,
      setSavedFilters:   s.setSavedFilters,
      addSavedFilter:    s.addSavedFilter,
      updateSavedFilter: s.updateSavedFilter,
      deleteSavedFilter: s.deleteSavedFilter,
      setActiveFilter:   s.setActiveFilter,
    }))
  );
}

/** Returns the currently active SavedFilter object (or null) */
export function useActiveFilter(): SavedFilter | null {
  return useFilterStore((s) => {
    if (!s.activeFilterId) return null;
    return s.savedFilters.find((f) => f.id === s.activeFilterId) ?? null;
  });
}

// ---------------------------------------------------------------------------
// HMR cleanup
// ---------------------------------------------------------------------------

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    useFilterStore.getState().reset();
  });
}
