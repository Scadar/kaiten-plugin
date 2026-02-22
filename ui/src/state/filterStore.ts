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
import type { KaitenSettings } from '@/api/types';

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
   * Selected user ID for filtering tasks (null if no user filter)
   */
  selectedUserId: number | null;

  /**
   * Filter by member role (type 1). Only applies when selectedUserId is set.
   */
  filterAsMember: boolean;

  /**
   * Filter by responsible role (type 2). Only applies when selectedUserId is set.
   */
  filterAsResponsible: boolean;

  /**
   * Logic for combining role filters when both are enabled.
   * - 'OR': show cards where user matches ANY selected role
   * - 'AND': show cards where user matches ALL selected roles
   */
  filterLogic: 'OR' | 'AND';
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
   * Set selected user ID for filtering
   */
  setSelectedUser: (userId: number | null) => void;

  setFilterAsMember: (enabled: boolean) => void;
  setFilterAsResponsible: (enabled: boolean) => void;
  setFilterLogic: (logic: 'OR' | 'AND') => void;

  /**
   * Reset all filters to initial state
   */
  reset: () => void;

  /**
   * Initialize filter state from persisted IDE settings
   */
  initializeFromSettings: (settings: KaitenSettings) => void;
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
  selectedUserId: null,
  filterAsMember: true,
  filterAsResponsible: true,
  filterLogic: 'OR',
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
   * Set selected user ID for filtering
   */
  setSelectedUser: (userId: number | null) => {
    set({ selectedUserId: userId });
  },

  setFilterAsMember: (enabled: boolean) => set({ filterAsMember: enabled }),
  setFilterAsResponsible: (enabled: boolean) => set({ filterAsResponsible: enabled }),
  setFilterLogic: (logic: 'OR' | 'AND') => set({ filterLogic: logic }),

  /**
   * Reset all filters to initial state
   */
  reset: () => {
    set(initialState);
  },

  /**
   * Initialize filter state from persisted IDE settings (called once on startup)
   */
  initializeFromSettings: (settings: KaitenSettings) => {
    set({
      selectedSpaceId: settings.selectedSpaceId,
      selectedBoardId: settings.selectedBoardId,
      selectedColumnIds: settings.selectedColumnIds,
      selectedUserId: settings.selectedFilterUserId,
      filterAsMember: settings.filterAsMember,
      filterAsResponsible: settings.filterAsResponsible,
      filterLogic: settings.filterLogic,
    });
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
    selectedUserId: state.selectedUserId,
    filterAsMember: state.filterAsMember,
    filterAsResponsible: state.filterAsResponsible,
    filterLogic: state.filterLogic,
  }),

  /**
   * Check if any filters are active
   */
  hasActiveFilters: (state: FilterStore) =>
    state.selectedColumnIds.length > 0 ||
    state.selectedUserId !== null,

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
