/**
 * Hook for fetching and filtering Kaiten tasks
 *
 * This hook combines data fetching (useTasks, useCurrentUser) with client-side
 * filtering logic to provide a filtered view of tasks based on column and user criteria.
 *
 * Features:
 * - Fetches tasks and current user in parallel
 * - Applies client-side filtering based on column and user criteria
 * - Memoizes filtered results for performance
 * - Combines loading/error states from multiple queries
 *
 * Example usage:
 *   const { data: tasks, isLoading, error } = useFilteredTasks(config, boardId, {
 *     selectedColumnIds: [1, 2, 3],
 *     filterByAssignee: true,
 *     filterByParticipant: false,
 *     filterLogic: 'AND',
 *   });
 */

import { useMemo } from 'react';
import { useTasks, useCurrentUser } from './useKaitenQuery';
import { filterTasks, FilterTasksOptions } from '../lib/filters';
import { ApiConfig } from '../api/client';
import { Task } from '../api/types';

/**
 * Result type for useFilteredTasks hook
 */
export interface UseFilteredTasksResult {
  /** Filtered tasks (undefined while loading) */
  data: Task[] | undefined;
  /** True if any underlying query is loading */
  isLoading: boolean;
  /** Error from any underlying query */
  error: Error | null;
}

/**
 * Hook to fetch tasks and filter them based on column and user criteria
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @param boardId - The ID of the board to fetch tasks for
 * @param filterOptions - Filter options (columns, assignee, participant, logic)
 * @param searchText - Optional search text to filter tasks
 * @returns Filtered tasks with loading/error states
 *
 * @example
 * ```tsx
 * const { data: tasks, isLoading, error } = useFilteredTasks(
 *   config,
 *   boardId,
 *   {
 *     selectedColumnIds: [1, 2, 3],
 *     filterByAssignee: true,
 *     filterByParticipant: false,
 *     filterLogic: 'AND',
 *   }
 * );
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * return <TaskList tasks={tasks} />;
 * ```
 */
export function useFilteredTasks(
  config: ApiConfig,
  boardId: number | null | undefined,
  filterOptions: FilterTasksOptions = {},
  searchText?: string
): UseFilteredTasksResult {
  // Fetch tasks and current user
  const tasksQuery = useTasks(config, boardId, searchText);
  const currentUserQuery = useCurrentUser(config);

  // Apply filtering to tasks using memoization for performance
  const filteredTasks = useMemo(() => {
    if (!tasksQuery.data) {
      return undefined;
    }

    return filterTasks(
      tasksQuery.data,
      currentUserQuery.data ?? null,
      filterOptions
    );
  }, [tasksQuery.data, currentUserQuery.data, filterOptions]);

  // Combine loading states - we're loading if either query is loading
  const isLoading = tasksQuery.isLoading || currentUserQuery.isLoading;

  // Combine error states - return first error encountered
  const error = tasksQuery.error || currentUserQuery.error || null;

  return {
    data: filteredTasks,
    isLoading,
    error,
  };
}
