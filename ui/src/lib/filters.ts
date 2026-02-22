/**
 * Filter logic for Kaiten tasks
 */

import type { Task } from '../api/types';

/**
 * Options for filtering tasks
 */
export interface FilterTasksOptions {
  selectedColumnIds?: number[] | Set<number>;
  selectedUserId?: number | null;
}

/**
 * Filter tasks based on column and user criteria
 *
 * @param tasks - List of tasks to filter
 * @param options - Filter options
 * @returns Filtered list of tasks
 */
export function filterTasks(
  tasks: Task[],
  options: FilterTasksOptions = {}
): Task[] {
  const { selectedColumnIds = [], selectedUserId = null } = options;

  // Convert selectedColumnIds to Set for efficient lookup
  const columnIdSet = Array.isArray(selectedColumnIds)
    ? new Set(selectedColumnIds)
    : selectedColumnIds;

  let filteredTasks = tasks;

  // Filter by column
  if (columnIdSet.size > 0) {
    filteredTasks = filteredTasks.filter((task) => columnIdSet.has(task.columnId));
  }

  // Filter by user (assignee or participant)
  if (selectedUserId !== null) {
    filteredTasks = filteredTasks.filter(
      (task) =>
        task.assigneeId === selectedUserId ||
        task.participants.some((p) => p.id === selectedUserId)
    );
  }

  return filteredTasks;
}
