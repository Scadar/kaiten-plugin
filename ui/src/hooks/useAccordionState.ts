import { useCallback } from 'react';

/**
 * Given all item IDs and the persisted set of explicitly-closed IDs,
 * returns the list of open item IDs. Items not seen before are open by default.
 */
export function computeOpenItems(allIds: string[], closedIds: string[]): string[] {
  const closedSet = new Set(closedIds);
  return allIds.filter((id) => !closedSet.has(id));
}

/**
 * Derive the new closed set when the user changes the open state of a group.
 *
 * @param allGroupIds - All accordion item IDs that belong to this accordion
 * @param newOpenIds  - The newly open IDs reported by the accordion onChange
 * @param prevClosed  - Existing closed IDs from the store (may span multiple accordions)
 */
export function deriveNewClosed(
  allGroupIds: string[],
  newOpenIds: string[],
  prevClosed: string[],
): string[] {
  const openSet = new Set(newOpenIds);
  const groupSet = new Set(allGroupIds);
  // Items in this group that are now closed
  const nowClosed = allGroupIds.filter((id) => !openSet.has(id));
  // Items from other groups in the store stay unchanged
  const otherClosed = prevClosed.filter((id) => !groupSet.has(id));
  return [...otherClosed, ...nowClosed];
}

export interface UseAccordionStateOptions {
  allIds: string[];
  closedIds: string[];
  onClosedIdsChange: (newClosed: string[]) => void;
}

/**
 * Manages open/closed state for a controlled Accordion component that uses
 * "open by default, closed by exception" semantics.
 *
 * Items are open by default; the store only persists the explicitly-closed set.
 */
export function useAccordionState({
  allIds,
  closedIds,
  onClosedIdsChange,
}: UseAccordionStateOptions) {
  const openIds = computeOpenItems(allIds, closedIds);

  const handleChange = useCallback(
    (newOpen: string[]) => {
      onClosedIdsChange(deriveNewClosed(allIds, newOpen, closedIds));
    },
    [allIds, closedIds, onClosedIdsChange],
  );

  return { openIds, handleChange };
}
