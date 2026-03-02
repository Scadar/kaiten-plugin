import { describe, it, expect, beforeEach } from 'vitest';

import type { SavedFilter } from '@/lib/advancedFilters';

import { useReleaseFilterStore } from './releaseFilterStore';

const makeFilter = (id: string, name = 'Filter'): SavedFilter => ({
  id,
  name,
  group: { id: 'g', logic: 'and', conditions: [] },
});

beforeEach(() => {
  localStorage.clear();
  // Reset store state
  useReleaseFilterStore.setState({ savedFilters: [], activeFilterId: null });
});

describe('addSavedFilter (release store)', () => {
  it('appends the filter and auto-activates it', () => {
    const filter = makeFilter('rf1');
    useReleaseFilterStore.getState().addSavedFilter(filter);
    const state = useReleaseFilterStore.getState();
    expect(state.savedFilters).toContainEqual(filter);
    // Auto-activation: newly added filter becomes the active one
    expect(state.activeFilterId).toBe('rf1');
  });

  it('persists to localStorage under kaiten:releaseFilters', () => {
    useReleaseFilterStore.getState().addSavedFilter(makeFilter('rf1'));
    const stored = JSON.parse(localStorage.getItem('kaiten:releaseFilters')!) as {
      activeFilterId: string | null;
    };
    expect(stored.activeFilterId).toBe('rf1');
  });
});

describe('deleteSavedFilter (release store)', () => {
  it('removes the filter', () => {
    useReleaseFilterStore.getState().addSavedFilter(makeFilter('rf1'));
    useReleaseFilterStore.getState().deleteSavedFilter('rf1');
    expect(useReleaseFilterStore.getState().savedFilters).toHaveLength(0);
  });

  it('clears activeFilterId when the active filter is deleted', () => {
    useReleaseFilterStore.getState().addSavedFilter(makeFilter('rf1'));
    expect(useReleaseFilterStore.getState().activeFilterId).toBe('rf1');
    useReleaseFilterStore.getState().deleteSavedFilter('rf1');
    expect(useReleaseFilterStore.getState().activeFilterId).toBe(null);
  });
});

describe('setActiveFilter (release store)', () => {
  it('updates activeFilterId', () => {
    useReleaseFilterStore.getState().addSavedFilter(makeFilter('rf1'));
    useReleaseFilterStore.getState().addSavedFilter(makeFilter('rf2'));
    useReleaseFilterStore.getState().setActiveFilter('rf2');
    expect(useReleaseFilterStore.getState().activeFilterId).toBe('rf2');
  });
});
