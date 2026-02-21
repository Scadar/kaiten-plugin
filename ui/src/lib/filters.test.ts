/**
 * Tests for filter logic
 * Verifies behavior matches Kotlin FilterService
 */

import { describe, it, expect } from 'vitest';
import { filterTasks } from './filters';
import type { Task, User, TaskMember } from '../api/types';

// Test data
const createTaskMember = (id: number, name: string): TaskMember => ({
  id,
  fullName: name,
  email: `user${id}@example.com`,
});

const createUser = (id: number, name: string): User => ({
  id,
  name,
  email: `user${id}@example.com`,
});

const createTask = (
  id: number,
  columnId: number,
  assigneeId: number | null,
  participantIds: number[] = []
): Task => ({
  id,
  title: `Task ${id}`,
  description: null,
  columnId,
  assigneeId,
  participants: participantIds.map((pid) => createTaskMember(pid, `User ${pid}`)),
  dueDate: null,
});

describe('filterTasks', () => {
  const user1 = createUser(1, 'User 1');
  const user2 = createUser(2, 'User 2');

  const tasks: Task[] = [
    createTask(1, 100, 1, [1, 2]), // Column 100, assigned to user1, participants: user1, user2
    createTask(2, 100, 2, [1]), // Column 100, assigned to user2, participants: user1
    createTask(3, 200, 1, [2]), // Column 200, assigned to user1, participants: user2
    createTask(4, 200, 2, []), // Column 200, assigned to user2, no participants
    createTask(5, 300, null, [1]), // Column 300, no assignee, participants: user1
    createTask(6, 300, null, []), // Column 300, no assignee, no participants
  ];

  describe('column filtering', () => {
    it('should return all tasks when no column filter is applied', () => {
      const result = filterTasks(tasks, null);
      expect(result).toHaveLength(6);
    });

    it('should filter by single column (array)', () => {
      const result = filterTasks(tasks, null, { selectedColumnIds: [100] });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by single column (Set)', () => {
      const result = filterTasks(tasks, null, { selectedColumnIds: new Set([100]) });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by multiple columns', () => {
      const result = filterTasks(tasks, null, { selectedColumnIds: [100, 200] });
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    });

    it('should return empty array when no tasks match column', () => {
      const result = filterTasks(tasks, null, { selectedColumnIds: [999] });
      expect(result).toHaveLength(0);
    });
  });

  describe('user filtering with AND logic', () => {
    it('should filter by assignee only (default)', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: true,
        filterByParticipant: false,
        filterLogic: 'AND',
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 3]);
    });

    it('should filter by participant only', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: false,
        filterByParticipant: true,
        filterLogic: 'AND',
      });
      expect(result).toHaveLength(3);
      expect(result.map((t) => t.id)).toEqual([1, 2, 5]);
    });

    it('should filter by both assignee AND participant (must match both)', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'AND',
      });
      // Only task 1 has user1 as both assignee and participant
      expect(result).toHaveLength(1);
      expect(result.map((t) => t.id)).toEqual([1]);
    });

    it('should return all tasks when both filters are disabled', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: false,
        filterByParticipant: false,
        filterLogic: 'AND',
      });
      expect(result).toHaveLength(6);
    });

    it('should return all tasks when currentUser is null', () => {
      const result = filterTasks(tasks, null, {
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'AND',
      });
      expect(result).toHaveLength(6);
    });
  });

  describe('user filtering with OR logic', () => {
    it('should filter by assignee only', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: true,
        filterByParticipant: false,
        filterLogic: 'OR',
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 3]);
    });

    it('should filter by participant only', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: false,
        filterByParticipant: true,
        filterLogic: 'OR',
      });
      expect(result).toHaveLength(3);
      expect(result.map((t) => t.id)).toEqual([1, 2, 5]);
    });

    it('should filter by assignee OR participant (match either)', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'OR',
      });
      // Tasks 1, 2, 3, 5 have user1 as either assignee or participant
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 5]);
    });

    it('should return all tasks when both filters are disabled', () => {
      const result = filterTasks(tasks, user1, {
        filterByAssignee: false,
        filterByParticipant: false,
        filterLogic: 'OR',
      });
      expect(result).toHaveLength(6);
    });

    it('should return all tasks when currentUser is null', () => {
      const result = filterTasks(tasks, null, {
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'OR',
      });
      expect(result).toHaveLength(6);
    });
  });

  describe('combined column and user filtering', () => {
    it('should filter by column AND assignee (AND logic)', () => {
      const result = filterTasks(tasks, user1, {
        selectedColumnIds: [100, 200],
        filterByAssignee: true,
        filterByParticipant: false,
        filterLogic: 'AND',
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 3]);
    });

    it('should filter by column AND participant (AND logic)', () => {
      const result = filterTasks(tasks, user1, {
        selectedColumnIds: [100],
        filterByAssignee: false,
        filterByParticipant: true,
        filterLogic: 'AND',
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by column AND (assignee OR participant)', () => {
      const result = filterTasks(tasks, user1, {
        selectedColumnIds: [200],
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'OR',
      });
      expect(result).toHaveLength(1);
      expect(result.map((t) => t.id)).toEqual([3]);
    });

    it('should filter by column AND (assignee AND participant)', () => {
      const result = filterTasks(tasks, user1, {
        selectedColumnIds: [100],
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'AND',
      });
      expect(result).toHaveLength(1);
      expect(result.map((t) => t.id)).toEqual([1]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty task list', () => {
      const result = filterTasks([], user1, {
        selectedColumnIds: [100],
        filterByAssignee: true,
      });
      expect(result).toHaveLength(0);
    });

    it('should handle task with no assignee', () => {
      const result = filterTasks([createTask(1, 100, null, [])], user1, {
        filterByAssignee: true,
      });
      expect(result).toHaveLength(0);
    });

    it('should handle task with empty participants', () => {
      const result = filterTasks([createTask(1, 100, 1, [])], user1, {
        filterByParticipant: true,
      });
      expect(result).toHaveLength(0);
    });

    it('should use default options when not provided', () => {
      // Default: filterByAssignee=true, filterByParticipant=false, filterLogic=AND
      const result = filterTasks(tasks, user1);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 3]);
    });

    it('should handle empty selectedColumnIds Set', () => {
      const result = filterTasks(tasks, user1, {
        selectedColumnIds: new Set<number>(),
        filterByAssignee: true,
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 3]);
    });

    it('should handle empty selectedColumnIds array', () => {
      const result = filterTasks(tasks, user1, {
        selectedColumnIds: [],
        filterByAssignee: true,
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 3]);
    });
  });

  describe('different user scenarios', () => {
    it('should filter correctly for user2 as assignee', () => {
      const result = filterTasks(tasks, user2, {
        filterByAssignee: true,
        filterByParticipant: false,
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([2, 4]);
    });

    it('should filter correctly for user2 as participant', () => {
      const result = filterTasks(tasks, user2, {
        filterByAssignee: false,
        filterByParticipant: true,
      });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 3]);
    });

    it('should filter correctly for user2 with OR logic', () => {
      const result = filterTasks(tasks, user2, {
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'OR',
      });
      // Tasks 1, 2, 3, 4 (user2 is assignee of 2,4 and participant of 1,3)
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    });

    it('should filter correctly for user2 with AND logic', () => {
      const result = filterTasks(tasks, user2, {
        filterByAssignee: true,
        filterByParticipant: true,
        filterLogic: 'AND',
      });
      // No tasks where user2 is both assignee and participant
      expect(result).toHaveLength(0);
    });
  });
});
