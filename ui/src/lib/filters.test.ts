/**
 * Tests for filter logic
 */

import { describe, it, expect } from 'vitest';
import { filterTasks } from './filters';
import type { Task, TaskMember } from '../api/types';

// Test data
const createTaskMember = (id: number, name: string): TaskMember => ({
  id,
  fullName: name,
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
  const tasks: Task[] = [
    createTask(1, 100, 1, [1, 2]), // Column 100, assigned to user1, participants: user1, user2
    createTask(2, 100, 2, [1]),    // Column 100, assigned to user2, participants: user1
    createTask(3, 200, 1, [2]),    // Column 200, assigned to user1, participants: user2
    createTask(4, 200, 2, []),     // Column 200, assigned to user2, no participants
    createTask(5, 300, null, [1]), // Column 300, no assignee, participants: user1
    createTask(6, 300, null, []), // Column 300, no assignee, no participants
  ];

  describe('column filtering', () => {
    it('should return all tasks when no column filter is applied', () => {
      const result = filterTasks(tasks);
      expect(result).toHaveLength(6);
    });

    it('should filter by single column (array)', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [100] });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by single column (Set)', () => {
      const result = filterTasks(tasks, { selectedColumnIds: new Set([100]) });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by multiple columns', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [100, 200] });
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    });

    it('should return empty array when no tasks match column', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [999] });
      expect(result).toHaveLength(0);
    });
  });

  describe('user filtering', () => {
    it('should return all tasks when no user filter is applied', () => {
      const result = filterTasks(tasks);
      expect(result).toHaveLength(6);
    });

    it('should return all tasks when selectedUserId is null', () => {
      const result = filterTasks(tasks, { selectedUserId: null });
      expect(result).toHaveLength(6);
    });

    it('should filter tasks where user1 is assignee or participant', () => {
      const result = filterTasks(tasks, { selectedUserId: 1 });
      // Tasks 1 (assignee+participant), 2 (participant), 3 (assignee), 5 (participant)
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 5]);
    });

    it('should filter tasks where user2 is assignee or participant', () => {
      const result = filterTasks(tasks, { selectedUserId: 2 });
      // Tasks 1 (participant), 2 (assignee), 3 (participant), 4 (assignee)
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    });

    it('should return empty when user has no tasks', () => {
      const result = filterTasks(tasks, { selectedUserId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  describe('combined column and user filtering', () => {
    it('should filter by column AND user', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [100], selectedUserId: 1 });
      // Column 100: tasks 1, 2. User1 involved: tasks 1 (assignee), 2 (participant)
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by column AND user with partial overlap', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [200], selectedUserId: 1 });
      // Column 200: tasks 3, 4. User1 involved: task 3 (assignee)
      expect(result).toHaveLength(1);
      expect(result.map((t) => t.id)).toEqual([3]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty task list', () => {
      const result = filterTasks([], { selectedColumnIds: [100], selectedUserId: 1 });
      expect(result).toHaveLength(0);
    });

    it('should handle task with no assignee when filtering by user', () => {
      const result = filterTasks([createTask(1, 100, null, [])], { selectedUserId: 1 });
      expect(result).toHaveLength(0);
    });

    it('should handle task with empty participants when filtering by user', () => {
      const result = filterTasks([createTask(1, 100, 2, [])], { selectedUserId: 1 });
      expect(result).toHaveLength(0);
    });

    it('should handle empty selectedColumnIds array', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [], selectedUserId: 1 });
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 5]);
    });

    it('should handle empty selectedColumnIds Set', () => {
      const result = filterTasks(tasks, { selectedColumnIds: new Set<number>(), selectedUserId: 1 });
      expect(result).toHaveLength(4);
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 5]);
    });
  });
});
