import { describe, it, expect, beforeEach } from 'vitest';

import type { KaitenSettings } from '@/api/types';
import type { SavedFilter } from '@/lib/advancedFilters';

import { useFilterStore } from './filterStore';

const makeFilter = (id: string, name = 'Filter'): SavedFilter => ({
  id,
  name,
  group: { id: 'g', logic: 'and', conditions: [] },
});

beforeEach(() => {
  localStorage.clear();
  // Reset store to initial state
  useFilterStore.getState().reset();
});

describe('addSavedFilter', () => {
  it('adds a filter and persists it', () => {
    const filter = makeFilter('f1');
    useFilterStore.getState().addSavedFilter(filter);
    expect(useFilterStore.getState().savedFilters).toContainEqual(filter);
    const stored = JSON.parse(localStorage.getItem('kaiten:savedFilters')!) as {
      savedFilters: unknown[];
    };
    expect(stored.savedFilters).toContainEqual(filter);
  });
});

describe('updateSavedFilter', () => {
  it('replaces the filter with the same id', () => {
    const original = makeFilter('f1', 'Original');
    const updated = makeFilter('f1', 'Updated');
    useFilterStore.getState().addSavedFilter(original);
    useFilterStore.getState().updateSavedFilter(updated);
    const filters = useFilterStore.getState().savedFilters;
    expect(filters.find((f) => f.id === 'f1')?.name).toBe('Updated');
  });
});

describe('deleteSavedFilter', () => {
  it('removes the filter', () => {
    useFilterStore.getState().addSavedFilter(makeFilter('f1'));
    useFilterStore.getState().deleteSavedFilter('f1');
    expect(useFilterStore.getState().savedFilters).toHaveLength(0);
  });

  it('clears activeFilterId if the active filter is deleted', () => {
    useFilterStore.getState().addSavedFilter(makeFilter('f1'));
    useFilterStore.getState().setActiveFilter('f1');
    useFilterStore.getState().deleteSavedFilter('f1');
    expect(useFilterStore.getState().activeFilterId).toBe(null);
  });

  it('preserves activeFilterId when a different filter is deleted', () => {
    useFilterStore.getState().addSavedFilter(makeFilter('f1'));
    useFilterStore.getState().addSavedFilter(makeFilter('f2'));
    useFilterStore.getState().setActiveFilter('f1');
    useFilterStore.getState().deleteSavedFilter('f2');
    expect(useFilterStore.getState().activeFilterId).toBe('f1');
  });
});

describe('setActiveFilter', () => {
  it('sets the active filter id and persists it', () => {
    useFilterStore.getState().addSavedFilter(makeFilter('f1'));
    useFilterStore.getState().setActiveFilter('f1');
    expect(useFilterStore.getState().activeFilterId).toBe('f1');
    const stored = JSON.parse(localStorage.getItem('kaiten:savedFilters')!) as {
      activeFilterId: string | null;
    };
    expect(stored.activeFilterId).toBe('f1');
  });

  it('allows setting null to clear the filter', () => {
    useFilterStore.getState().setActiveFilter(null);
    expect(useFilterStore.getState().activeFilterId).toBe(null);
  });
});

describe('initializeFromSettings', () => {
  it('restores selectedSpaceId from settings when currently null', () => {
    useFilterStore.getState().initializeFromSettings({
      selectedSpaceId: 7,
    } as unknown as KaitenSettings);
    expect(useFilterStore.getState().selectedSpaceId).toBe(7);
  });

  it('does not override existing selectedSpaceId', () => {
    useFilterStore.getState().setSelectedSpace(3);
    useFilterStore
      .getState()
      .initializeFromSettings({ selectedSpaceId: 7 } as unknown as KaitenSettings);
    expect(useFilterStore.getState().selectedSpaceId).toBe(3);
  });

  it('removes the legacy "me" filter if present', () => {
    const meFilter = makeFilter('me', 'Me');
    useFilterStore.getState().addSavedFilter(meFilter);
    useFilterStore
      .getState()
      .initializeFromSettings({ selectedSpaceId: null } as unknown as KaitenSettings);
    expect(useFilterStore.getState().savedFilters.find((f) => f.id === 'me')).toBeUndefined();
  });
});
