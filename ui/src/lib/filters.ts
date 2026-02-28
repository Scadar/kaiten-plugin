/**
 * Client-side filter logic for Kaiten tasks.
 *
 * Note: server-side pre-filtering by member_ids is applied at the API level
 * (see client.ts getCards). This module handles further client-side filtering
 * by column and member role type.
 */

import type { Task } from '../api/types';

/** Member type constants from Kaiten API */
export const MEMBER_TYPE_MEMBER = 1;
export const MEMBER_TYPE_RESPONSIBLE = 2;

/**
 * Options for filtering tasks
 */
export interface FilterTasksOptions {
  selectedColumnIds?: number[] | Set<number>;
  selectedUserId?: number | null;
  /** Show cards where the user appears as a Member (type 1). Default: true */
  filterAsMember?: boolean;
  /** Show cards where the user appears as a Responsible (type 2). Default: true */
  filterAsResponsible?: boolean;
  /** How to combine role filters when both are enabled. Default: 'OR' */
  filterLogic?: 'OR' | 'AND';
}

/**
 * Filter tasks based on column and user/role criteria.
 *
 * @param tasks - List of tasks to filter
 * @param options - Filter options
 */
export function filterTasks(tasks: Task[], options: FilterTasksOptions = {}): Task[] {
  const {
    selectedColumnIds = [],
    selectedUserId = null,
    filterAsMember = true,
    filterAsResponsible = true,
    filterLogic = 'OR',
  } = options;

  const columnIdSet = Array.isArray(selectedColumnIds)
    ? new Set(selectedColumnIds)
    : selectedColumnIds;

  let result = tasks;

  // Filter by column
  if (columnIdSet.size > 0) {
    result = result.filter((task) => columnIdSet.has(task.columnId));
  }

  // Filter by user + role
  if (selectedUserId !== null && (filterAsMember || filterAsResponsible)) {
    result = result.filter((task) => {
      const isMember =
        filterAsMember &&
        task.participants.some((m) => m.id === selectedUserId && m.type === MEMBER_TYPE_MEMBER);
      const isResponsible =
        filterAsResponsible &&
        task.participants.some(
          (m) => m.id === selectedUserId && m.type === MEMBER_TYPE_RESPONSIBLE,
        );

      if (filterAsMember && filterAsResponsible) {
        return filterLogic === 'AND' ? isMember && isResponsible : isMember || isResponsible;
      }
      return isMember || isResponsible;
    });
  }

  return result;
}
