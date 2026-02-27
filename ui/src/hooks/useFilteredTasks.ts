/**
 * Hook for fetching Kaiten tasks using the advanced filter system.
 *
 * Fetches cards by space_id (and optionally board_id from the saved filter),
 * passing an encoded filter to the Kaiten API for server-side filtering.
 */

import { useTasksBySpace } from './useKaitenQuery';
import { encodeFilter } from '@/lib/advancedFilters';
import type { SavedFilter } from '@/lib/advancedFilters';
import type { Task } from '../api/types';

export interface UseFilteredTasksResult {
  data: Task[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useFilteredTasks(
  spaceId: number | null | undefined,
  activeFilter: SavedFilter | null,
  searchText?: string
): UseFilteredTasksResult {
  const encodedFilter = activeFilter ? encodeFilter(activeFilter.group) : null;
  const boardId = activeFilter?.boardId ?? null;

  const tasksQuery = useTasksBySpace({ spaceId, filter: encodedFilter, boardId, searchText });

  return {
    data:      tasksQuery.data,
    isLoading: tasksQuery.isLoading,
    error:     tasksQuery.error || null,
  };
}
