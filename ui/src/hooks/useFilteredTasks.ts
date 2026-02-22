/**
 * Hook for fetching and filtering Kaiten tasks
 */

import { useMemo } from 'react';
import { useTasks, useCurrentUser } from './useKaitenQuery';
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
  const tasksQuery = useTasks(boardId, searchText);
  const currentUserQuery = useCurrentUser();

  const filteredTasks = useMemo(() => {
    if (!tasksQuery.data) {
      return undefined;
    }
    return filterTasks(tasksQuery.data, currentUserQuery.data ?? null, filterOptions);
  }, [tasksQuery.data, currentUserQuery.data, filterOptions]);

  return {
    data: filteredTasks,
    isLoading: tasksQuery.isLoading || currentUserQuery.isLoading,
    error: tasksQuery.error || currentUserQuery.error || null,
  };
}
