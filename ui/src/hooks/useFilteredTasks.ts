/**
 * Hook for fetching and filtering Kaiten tasks.
 *
 * Two-stage filtering:
 * 1. API-level: member_ids param pre-filters cards by selected user (server-side)
 * 2. Client-level: further filter by column and member role type
 */

import { useMemo } from 'react';
import { useTasks } from './useKaitenQuery';
import { filterTasks, FilterTasksOptions } from '../lib/filters';
import { Task } from '../api/types';

export interface UseFilteredTasksResult {
  data: Task[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useFilteredTasks(
  boardId: number | null | undefined,
  filterOptions: FilterTasksOptions = {},
  searchText?: string
): UseFilteredTasksResult {
  const { selectedUserId } = filterOptions;

  // Pass selectedUserId to the API call for server-side pre-filtering
  const tasksQuery = useTasks(boardId, searchText, selectedUserId ?? null);

  const filteredTasks = useMemo(() => {
    if (!tasksQuery.data) {
      return undefined;
    }
    return filterTasks(tasksQuery.data, filterOptions);
  }, [tasksQuery.data, filterOptions]);

  return {
    data: filteredTasks,
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error || null,
  };
}
