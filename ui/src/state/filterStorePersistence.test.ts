import { describe, it, expect, beforeEach, vi } from 'vitest';

import { loadFilterState, persistFilterState } from './filterStorePersistence';

const KEY = 'test:filters';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('loadFilterState', () => {
  it('returns empty default when key is absent', () => {
    const state = loadFilterState(KEY);
    expect(state).toEqual({ savedFilters: [], activeFilterId: null });
  });

  it('parses a valid persisted state', () => {
    const data = {
      savedFilters: [
        { id: 'f1', name: 'My filter', group: { id: 'g', logic: 'and', conditions: [] } },
      ],
      activeFilterId: 'f1',
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    expect(loadFilterState(KEY)).toEqual(data);
  });

  it('migrates old format (plain array) to new format', () => {
    const oldFormat = [{ id: 'f1', name: 'Old', group: { id: 'g', logic: 'or', conditions: [] } }];
    localStorage.setItem(KEY, JSON.stringify(oldFormat));
    const state = loadFilterState(KEY);
    expect(state.savedFilters).toEqual(oldFormat);
    expect(state.activeFilterId).toBe(null);
  });

  it('returns default on invalid JSON', () => {
    localStorage.setItem(KEY, '{invalid json}');
    expect(loadFilterState(KEY)).toEqual({ savedFilters: [], activeFilterId: null });
  });
});

describe('persistFilterState', () => {
  it('writes state to localStorage as JSON', () => {
    const state = { savedFilters: [], activeFilterId: 'f2' };
    persistFilterState(KEY, state);
    const stored = JSON.parse(localStorage.getItem(KEY)!) as unknown;
    expect(stored).toEqual(state);
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => persistFilterState(KEY, { savedFilters: [], activeFilterId: null })).not.toThrow();
  });
});
