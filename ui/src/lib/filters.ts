/**
 * Filter logic for Kaiten tasks
 * Ported from FilterService.kt
 */

import type { Task, User } from '../api/types';

/**
 * Filter settings for task filtering
 */
export interface FilterSettings {
  selectedSpaceId: number | null;
  selectedBoardId: number | null;
  selectedColumnIds: Set<number>;
  filterByAssignee: boolean;
  filterByParticipant: boolean;
  filterLogic: 'AND' | 'OR';
}

/**
 * Options for filtering tasks
 */
export interface FilterTasksOptions {
  selectedColumnIds?: number[] | Set<number>;
  filterByAssignee?: boolean;
  filterByParticipant?: boolean;
  filterLogic?: 'AND' | 'OR';
}

/**
 * Filter tasks based on column and user criteria
 * Ported from FilterService.kt#filterTasks
 *
 * @param tasks - List of tasks to filter
 * @param currentUser - Current user for assignee/participant filtering
 * @param options - Filter options
 * @returns Filtered list of tasks
 */
export function filterTasks(
  tasks: Task[],
  currentUser: User | null,
  options: FilterTasksOptions = {}
): Task[] {
  const {
    selectedColumnIds = [],
    filterByAssignee = true,
    filterByParticipant = false,
    filterLogic = 'AND',
  } = options;

  // Convert selectedColumnIds to Set for efficient lookup
  const columnIdSet = Array.isArray(selectedColumnIds)
    ? new Set(selectedColumnIds)
    : selectedColumnIds;

  let filteredTasks = tasks;

  // Filter by column
  if (columnIdSet.size > 0) {
    filteredTasks = filteredTasks.filter((task) => columnIdSet.has(task.columnId));
  }

  // Filter by user
  if (currentUser !== null) {
    filteredTasks =
      filterLogic === 'AND'
        ? filterTasksByUserAnd(filteredTasks, currentUser, filterByAssignee, filterByParticipant)
        : filterTasksByUserOr(filteredTasks, currentUser, filterByAssignee, filterByParticipant);
  }

  return filteredTasks;
}

/**
 * Filter tasks where user matches ALL enabled criteria (AND logic)
 * Ported from FilterService.kt#filterTasksByUserAnd
 *
 * @param tasks - List of tasks to filter
 * @param user - User to filter by
 * @param filterByAssignee - Whether to filter by assignee
 * @param filterByParticipant - Whether to filter by participant
 * @returns Filtered list of tasks
 */
function filterTasksByUserAnd(
  tasks: Task[],
  user: User,
  filterByAssignee: boolean,
  filterByParticipant: boolean
): Task[] {
  return tasks.filter((task) => {
    const isAssignee = filterByAssignee && task.assigneeId === user.id;
    const isParticipant =
      filterByParticipant && task.participants.some((p) => p.id === user.id);

    if (filterByAssignee && filterByParticipant) {
      // Both filters enabled: user must be BOTH assignee AND participant
      return isAssignee && isParticipant;
    } else if (filterByAssignee) {
      // Only assignee filter enabled
      return isAssignee;
    } else if (filterByParticipant) {
      // Only participant filter enabled
      return isParticipant;
    } else {
      // No filters enabled: include all tasks
      return true;
    }
  });
}

/**
 * Filter tasks where user matches ANY enabled criteria (OR logic)
 * Ported from FilterService.kt#filterTasksByUserOr
 *
 * @param tasks - List of tasks to filter
 * @param user - User to filter by
 * @param filterByAssignee - Whether to filter by assignee
 * @param filterByParticipant - Whether to filter by participant
 * @returns Filtered list of tasks
 */
function filterTasksByUserOr(
  tasks: Task[],
  user: User,
  filterByAssignee: boolean,
  filterByParticipant: boolean
): Task[] {
  return tasks.filter((task) => {
    const isAssignee = filterByAssignee && task.assigneeId === user.id;
    const isParticipant =
      filterByParticipant && task.participants.some((p) => p.id === user.id);

    if (filterByAssignee && filterByParticipant) {
      // Both filters enabled: user must be EITHER assignee OR participant
      return isAssignee || isParticipant;
    } else if (filterByAssignee) {
      // Only assignee filter enabled
      return isAssignee;
    } else if (filterByParticipant) {
      // Only participant filter enabled
      return isParticipant;
    } else {
      // No filters enabled: include all tasks
      return true;
    }
  });
}
