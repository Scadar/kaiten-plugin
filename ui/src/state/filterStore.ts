/**
 * Zustand store for managing filter state
 *
 * This store:
 * - Manages filter selections (space, board, columns, user filters)
 * - Provides type-safe filter state access
 * - Implements cascading updates (space change resets board)
 * - Centralizes filter logic for the application
 */

import { create } from 'zustand';

/**
 * Filter state interface
 */
export interface FilterStoreState {
  /**
   * Currently selected space ID (null if none selected)
   */
  selectedSpaceId: number | null;

  /**
   * Currently selected board ID (null if none selected)
   */
  selectedBoardId: number | null;

  /**
   * Selected column IDs for filtering tasks
   */
  selectedColumnIds: number[];

  /**
   * Whether to filter tasks by assignee (current user)
   */
  filterByAssignee: boolean;

  /**
   * Whether to filter tasks by participant (current user)
   */
  filterByParticipant: boolean;

  /**
   * Filter logic for user-based filtering
   * - 'AND': User must match ALL enabled criteria (assignee AND participant)
   * - 'OR': User must match ANY enabled criteria (assignee OR participant)
   */
  filterLogic: 'AND' | 'OR';
}

/**
 * Filter store actions
 */
export interface FilterStoreActions {
  /**
   * Set selected space ID
   * Cascading: Resets board and columns when changed
   */
  setSelectedSpace: (spaceId: number | null) => void;

  /**
   * Set selected board ID
   * Cascading: Resets columns when changed
   */
  setSelectedBoard: (boardId: number | null) => void;

  /**
   * Set selected column IDs (replaces current selection)
   */
  setSelectedColumns: (columnIds: number[]) => void;

  /**
   * Toggle a column ID in the selection
   * If column is selected, removes it; if not selected, adds it
   */
  toggleColumn: (columnId: number) => void;

  /**
   * Set filter by assignee option
   */
  setFilterByAssignee: (enabled: boolean) => void;

  /**
   * Set filter by participant option
   */
  setFilterByParticipant: (enabled: boolean) => void;

  /**
   * Set filter logic (AND/OR)
   */
  setFilterLogic: (logic: 'AND' | 'OR') => void;

  /**
   * Reset all filters to initial state
   */
  reset: () => void;
}

/**
 * Complete filter store type
 */
export type FilterStore = FilterStoreState & FilterStoreActions;

/**
 * Initial filter state
 */
const initialState: FilterStoreState = {
  selectedSpaceId: null,
  selectedBoardId: null,
  selectedColumnIds: [],
  filterByAssignee: true,
  filterByParticipant: false,
  filterLogic: 'AND',
};

/**
 * Zustand store for filter state management
 *
 * @example
 * ```tsx
 * function FiltersPanel() {
 *   const selectedSpaceId = useFilterStore((state) => state.selectedSpaceId);
 *   const setSelectedSpace = useFilterStore((state) => state.setSelectedSpace);
 *
 *   return (
 *     <select
 *       value={selectedSpaceId ?? ''}
 *       onChange={(e) => setSelectedSpace(Number(e.target.value))}
 *     >
 *       <option value="">Select a space</option>
 *       {spaces.map((space) => (
 *         <option key={space.id} value={space.id}>
 *           {space.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,

  /**
   * Set selected space ID
   * Cascading: Resets board and columns when space changes
   */
  setSelectedSpace: (spaceId: number | null) => {
    set({
      selectedSpaceId: spaceId,
      selectedBoardId: null, // Reset board when space changes
      selectedColumnIds: [], // Reset columns when space changes
    });
  },

  /**
   * Set selected board ID
   * Cascading: Resets columns when board changes
   */
  setSelectedBoard: (boardId: number | null) => {
    set({
      selectedBoardId: boardId,
      selectedColumnIds: [], // Reset columns when board changes
    });
  },

  /**
   * Set selected column IDs (replaces current selection)
   */
  setSelectedColumns: (columnIds: number[]) => {
    set({ selectedColumnIds: columnIds });
  },

  /**
   * Toggle a column ID in the selection
   */
  toggleColumn: (columnId: number) => {
    set((state) => ({
      selectedColumnIds: state.selectedColumnIds.includes(columnId)
        ? state.selectedColumnIds.filter((id) => id !== columnId)
        : [...state.selectedColumnIds, columnId],
    }));
  },

  /**
   * Set filter by assignee option
   */
  setFilterByAssignee: (enabled: boolean) => {
    set({ filterByAssignee: enabled });
  },

  /**
   * Set filter by participant option
   */
  setFilterByParticipant: (enabled: boolean) => {
    set({ filterByParticipant: enabled });
  },

  /**
   * Set filter logic (AND/OR)
   */
  setFilterLogic: (logic: 'AND' | 'OR') => {
    set({ filterLogic: logic });
  },

  /**
   * Reset all filters to initial state
   */
  reset: () => {
    set(initialState);
  },
}));

/**
 * Selector helpers for common filter access patterns
 */
export const filterStoreSelectors = {
  /**
   * Select filter options for use with filterTasks function
   */
  filterOptions: (state: FilterStore) => ({
    selectedColumnIds: state.selectedColumnIds,
    filterByAssignee: state.filterByAssignee,
    filterByParticipant: state.filterByParticipant,
    filterLogic: state.filterLogic,
  }),

  /**
   * Check if any filters are active
   */
  hasActiveFilters: (state: FilterStore) =>
    state.selectedColumnIds.length > 0 ||
    state.filterByAssignee ||
    state.filterByParticipant,

  /**
   * Check if a space is selected
   */
  hasSelectedSpace: (state: FilterStore) => state.selectedSpaceId !== null,

  /**
   * Check if a board is selected
   */
  hasSelectedBoard: (state: FilterStore) => state.selectedBoardId !== null,
};

/**
 * Cleanup function for testing/HMR
 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    useFilterStore.getState().reset();
  });
}

/**
 * Export cleanup function for manual disposal if needed
 */
export function disposeFilterStore(): void {
  useFilterStore.getState().reset();
}
