import { describe, it, expect } from 'vitest';

import {
  encodeFilter,
  normalizeGroup,
  serializeNode,
  isFilterGroup,
  isFilterCondition,
  isCustomPropertyKey,
  customPropertyIdFromKey,
  customPropertyKey,
  createCondition,
  createGroup,
  createRootGroup,
  getKeyComparisons,
  needsValue,
  type FilterGroup,
  type FilterCondition,
} from './advancedFilters';

// ─── normalizeGroup ────────────────────────────────────────────────────────────

describe('normalizeGroup', () => {
  it('wraps bare conditions inside AND groups in OR groups', () => {
    const condition: FilterCondition = {
      id: 'c1',
      key: 'responsible',
      comparison: 'eq',
      value: 1,
    };
    const group: FilterGroup = { id: 'g1', logic: 'and', conditions: [condition] };
    const result = normalizeGroup(group);
    expect(result.conditions).toHaveLength(1);
    const wrapped = result.conditions[0]!;
    expect(isFilterGroup(wrapped)).toBe(true);
    if (isFilterGroup(wrapped)) {
      expect(wrapped.logic).toBe('or');
      expect(wrapped.conditions[0]).toBe(condition);
    }
  });

  it('does not wrap conditions inside OR groups', () => {
    const condition: FilterCondition = { id: 'c1', key: 'tag', comparison: 'known' };
    const group: FilterGroup = { id: 'g1', logic: 'or', conditions: [condition] };
    const result = normalizeGroup(group);
    expect(result.conditions[0]).toBe(condition);
  });

  it('recursively normalizes nested groups', () => {
    const inner: FilterCondition = { id: 'c1', key: 'member', comparison: 'eq', value: 2 };
    const innerGroup: FilterGroup = { id: 'inner', logic: 'and', conditions: [inner] };
    const outerGroup: FilterGroup = { id: 'outer', logic: 'and', conditions: [innerGroup] };
    const result = normalizeGroup(outerGroup);
    const normalizedInner = result.conditions[0]!;
    expect(isFilterGroup(normalizedInner)).toBe(true);
    if (isFilterGroup(normalizedInner)) {
      // The inner condition should still be wrapped in an OR group
      expect(isFilterGroup(normalizedInner.conditions[0]!)).toBe(true);
    }
  });
});

// ─── serializeNode ────────────────────────────────────────────────────────────

describe('serializeNode', () => {
  it('serializes a group correctly', () => {
    const group: FilterGroup = {
      id: 'g1',
      logic: 'and',
      conditions: [],
    };
    const result = serializeNode(group) as { key: string; value: unknown[] };
    expect(result.key).toBe('and');
    expect(result.value).toEqual([]);
  });

  it('serializes a standard condition correctly', () => {
    const condition: FilterCondition = {
      id: 'c1',
      key: 'responsible',
      comparison: 'eq',
      value: 5,
    };
    const result = serializeNode(condition) as Record<string, unknown>;
    expect(result.key).toBe('responsible');
    expect(result.comparison).toBe('eq');
    expect(result.value).toBe(5);
  });

  it('serializes a condition without value when comparison needs none', () => {
    const condition: FilterCondition = { id: 'c1', key: 'asap', comparison: 'true' };
    const result = serializeNode(condition) as Record<string, unknown>;
    expect('value' in result).toBe(false);
  });

  it('serializes a custom property condition with id, type, key=custom_property', () => {
    const condition: FilterCondition = {
      id: 'c1',
      key: 'id_42',
      comparison: 'in',
      value: [1, 2],
      customPropertyType: 'select',
    };
    const result = serializeNode(condition) as Record<string, unknown>;
    expect(result.key).toBe('custom_property');
    expect(result.id).toBe(42);
    expect(result.type).toBe('select');
    expect(result.comparison).toBe('in');
    expect(result.value).toEqual([1, 2]);
  });
});

// ─── encodeFilter ─────────────────────────────────────────────────────────────

describe('encodeFilter', () => {
  it('returns a non-empty base64 string', () => {
    const group: FilterGroup = {
      id: 'root',
      logic: 'and',
      conditions: [
        {
          id: 'g1',
          logic: 'or',
          conditions: [{ id: 'c1', key: 'responsible', comparison: 'eq', value: 1 }],
        },
      ],
    };
    const encoded = encodeFilter(group);
    expect(encoded).toBeTruthy();
    // Must be valid base64
    expect(() => atob(encoded)).not.toThrow();
  });

  it('round-trips to the correct JSON structure', () => {
    const group: FilterGroup = {
      id: 'root',
      logic: 'and',
      conditions: [
        { id: 'g1', logic: 'or', conditions: [{ id: 'c1', key: 'tag', comparison: 'known' }] },
      ],
    };
    const encoded = encodeFilter(group);
    const decoded = JSON.parse(decodeURIComponent(atob(encoded))) as Record<string, unknown>;
    expect(decoded.key).toBe('and');
  });
});

// ─── Type guard helpers ───────────────────────────────────────────────────────

describe('isFilterGroup / isFilterCondition', () => {
  it('correctly identifies a group', () => {
    const g: FilterGroup = { id: 'g', logic: 'or', conditions: [] };
    expect(isFilterGroup(g)).toBe(true);
    expect(isFilterCondition(g)).toBe(false);
  });

  it('correctly identifies a condition', () => {
    const c: FilterCondition = { id: 'c', key: 'member', comparison: 'eq' };
    expect(isFilterCondition(c)).toBe(true);
    expect(isFilterGroup(c)).toBe(false);
  });
});

// ─── Custom property helpers ──────────────────────────────────────────────────

describe('isCustomPropertyKey', () => {
  it('matches id_<number> keys', () => {
    expect(isCustomPropertyKey('id_1')).toBe(true);
    expect(isCustomPropertyKey('id_999')).toBe(true);
    expect(isCustomPropertyKey('responsible')).toBe(false);
    expect(isCustomPropertyKey('id_')).toBe(false);
  });
});

describe('customPropertyIdFromKey', () => {
  it('extracts the numeric id', () => {
    expect(customPropertyIdFromKey('id_42')).toBe(42);
  });
  it('returns null for non-custom keys', () => {
    expect(customPropertyIdFromKey('responsible')).toBe(null);
  });
});

describe('customPropertyKey', () => {
  it('builds the correct key string', () => {
    expect(customPropertyKey(7)).toBe('id_7');
  });
});

// ─── Factory helpers ──────────────────────────────────────────────────────────

describe('createCondition', () => {
  it('returns a FilterCondition with the given key', () => {
    const c = createCondition('tag');
    expect(c.key).toBe('tag');
    expect(c.id).toBeTruthy();
  });
});

describe('createGroup', () => {
  it('returns an OR group by default with one condition', () => {
    const g = createGroup();
    expect(g.logic).toBe('or');
    expect(g.conditions).toHaveLength(1);
  });
});

describe('createRootGroup', () => {
  it('returns an AND group containing one OR subgroup', () => {
    const r = createRootGroup();
    expect(r.logic).toBe('and');
    expect(isFilterGroup(r.conditions[0]!)).toBe(true);
  });
});

// ─── getKeyComparisons / needsValue ──────────────────────────────────────────

describe('getKeyComparisons', () => {
  it('returns comparisons for static keys', () => {
    const comparisons = getKeyComparisons('responsible');
    expect(comparisons).toContain('eq');
    expect(comparisons).toContain('known');
  });

  it('returns extended comparisons for custom property keys', () => {
    const comparisons = getKeyComparisons('id_5');
    expect(comparisons).toContain('in');
    expect(comparisons).toContain('not_in');
  });
});

describe('needsValue', () => {
  it('returns false for boolean comparisons', () => {
    expect(needsValue('asap', 'true')).toBe(false);
    expect(needsValue('tag', 'known')).toBe(false);
    expect(needsValue('tag', 'unknown')).toBe(false);
    expect(needsValue('asap', 'false')).toBe(false);
  });

  it('returns true for value-based comparisons', () => {
    expect(needsValue('responsible', 'eq')).toBe(true);
    expect(needsValue('id', 'in')).toBe(true);
  });
});
