import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { computeOpenItems, deriveNewClosed, useAccordionState } from './useAccordionState';

// ─── computeOpenItems ─────────────────────────────────────────────────────────

describe('computeOpenItems', () => {
  it('returns all IDs when nothing is closed', () => {
    expect(computeOpenItems(['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c']);
  });

  it('excludes closed IDs', () => {
    expect(computeOpenItems(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('returns empty array when all are closed', () => {
    expect(computeOpenItems(['a', 'b'], ['a', 'b'])).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(computeOpenItems([], [])).toEqual([]);
  });
});

// ─── deriveNewClosed ──────────────────────────────────────────────────────────

describe('deriveNewClosed', () => {
  it('marks items as closed when removed from open set', () => {
    const result = deriveNewClosed(['a', 'b', 'c'], ['a'], []);
    expect(result).toContain('b');
    expect(result).toContain('c');
    expect(result).not.toContain('a');
  });

  it('removes items from closed set when they are opened', () => {
    const result = deriveNewClosed(['a', 'b'], ['a', 'b'], ['a', 'b']);
    expect(result).toHaveLength(0);
  });

  it('preserves closed IDs from other groups', () => {
    // 'x' belongs to a different accordion group and must remain closed
    const result = deriveNewClosed(['a', 'b'], ['a'], ['x']);
    expect(result).toContain('x');
    expect(result).toContain('b');
    expect(result).not.toContain('a');
  });

  it('handles all items being open', () => {
    const result = deriveNewClosed(['a', 'b', 'c'], ['a', 'b', 'c'], ['a']);
    expect(result).toHaveLength(0);
  });
});

// ─── useAccordionState ────────────────────────────────────────────────────────

describe('useAccordionState', () => {
  it('derives open IDs from allIds and closedIds', () => {
    const onClosedIdsChange = vi.fn();
    const { result } = renderHook(() =>
      useAccordionState({ allIds: ['a', 'b', 'c'], closedIds: ['b'], onClosedIdsChange }),
    );
    expect(result.current.openIds).toEqual(['a', 'c']);
  });

  it('calls onClosedIdsChange with the correct new closed set', () => {
    const onClosedIdsChange = vi.fn();
    const { result } = renderHook(() =>
      useAccordionState({ allIds: ['a', 'b', 'c'], closedIds: [], onClosedIdsChange }),
    );

    act(() => {
      result.current.handleChange(['a']); // b and c are now closed
    });

    const newClosed = onClosedIdsChange.mock.calls[0]![0] as string[];
    expect(newClosed).toContain('b');
    expect(newClosed).toContain('c');
    expect(newClosed).not.toContain('a');
  });

  it('returns all IDs as open when closedIds is empty', () => {
    const onClosedIdsChange = vi.fn();
    const { result } = renderHook(() =>
      useAccordionState({ allIds: ['x', 'y'], closedIds: [], onClosedIdsChange }),
    );
    expect(result.current.openIds).toEqual(['x', 'y']);
  });
});
