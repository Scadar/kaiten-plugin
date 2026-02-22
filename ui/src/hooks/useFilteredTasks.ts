/**
 * Hook for fetching and filtering Kaiten tasks
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
  const tasksQuery = useTasks(boardId, searchText);

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
