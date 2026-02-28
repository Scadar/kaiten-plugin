/**
 * Tests for client-side filter logic
 */

import { describe, it, expect } from 'vitest';

import { filterTasks, MEMBER_TYPE_MEMBER, MEMBER_TYPE_RESPONSIBLE } from './filters';

import type { Task, TaskMember } from '../api/types';

const createMember = (id: number, type: number): TaskMember => ({
  id,
  fullName: `User ${id}`,
  email: `user${id}@example.com`,
  type,
  initials: '',
  username: 'qwe',
  avatar_initials_url: '',
  avatar_type: 2,
  avatar_uploaded_url: '',
});

const createTask = (id: number, columnId: number, members: TaskMember[] = []): Task => ({
  id,
  title: `Task ${id}`,
  description: null,
  columnId,
  boardId: null,
  laneId: null,
  assigneeId: null,
  participants: members,
  dueDate: null,
});

// user 1: member(type1) only
// user 2: responsible(type2) only
// user 3: both member(type1) and responsible(type2) on some tasks
const tasks: Task[] = [
  // Task 1: user1=member, user2=responsible
  createTask(1, 100, [
    createMember(1, MEMBER_TYPE_MEMBER),
    createMember(2, MEMBER_TYPE_RESPONSIBLE),
  ]),
  // Task 2: user1=responsible, user3=member
  createTask(2, 100, [
    createMember(1, MEMBER_TYPE_RESPONSIBLE),
    createMember(3, MEMBER_TYPE_MEMBER),
  ]),
  // Task 3: user3=member AND user3=responsible (both roles)
  createTask(3, 200, [
    createMember(3, MEMBER_TYPE_MEMBER),
    createMember(3, MEMBER_TYPE_RESPONSIBLE),
  ]),
  // Task 4: user2=member
  createTask(4, 200, [createMember(2, MEMBER_TYPE_MEMBER)]),
  // Task 5: no members
  createTask(5, 300, []),
];

describe('filterTasks', () => {
  describe('no filters', () => {
    it('should return all tasks when no options', () => {
      expect(filterTasks(tasks)).toHaveLength(5);
    });

    it('should return all tasks when selectedUserId is null', () => {
      expect(filterTasks(tasks, { selectedUserId: null })).toHaveLength(5);
    });
  });

  describe('column filtering', () => {
    it('should filter by single column (array)', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [100] });
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by single column (Set)', () => {
      const result = filterTasks(tasks, { selectedColumnIds: new Set([200]) });
      expect(result.map((t) => t.id)).toEqual([3, 4]);
    });

    it('should filter by multiple columns', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [100, 200] });
      expect(result.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    });

    it('should return empty when no tasks match column', () => {
      expect(filterTasks(tasks, { selectedColumnIds: [999] })).toHaveLength(0);
    });
  });

  describe('user + role filtering (OR logic default)', () => {
    it('should show tasks where user1 is member OR responsible', () => {
      // user1 is member in task1, responsible in task2
      const result = filterTasks(tasks, { selectedUserId: 1 });
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should show tasks where user1 is member only', () => {
      const result = filterTasks(tasks, {
        selectedUserId: 1,
        filterAsMember: true,
        filterAsResponsible: false,
      });
      expect(result.map((t) => t.id)).toEqual([1]);
    });

    it('should show tasks where user1 is responsible only', () => {
      const result = filterTasks(tasks, {
        selectedUserId: 1,
        filterAsMember: false,
        filterAsResponsible: true,
      });
      expect(result.map((t) => t.id)).toEqual([2]);
    });

    it('should show tasks where user3 is member OR responsible (OR logic)', () => {
      // user3 is member in task2, member+responsible in task3
      const result = filterTasks(tasks, {
        selectedUserId: 3,
        filterAsMember: true,
        filterAsResponsible: true,
        filterLogic: 'OR',
      });
      expect(result.map((t) => t.id)).toEqual([2, 3]);
    });

    it('should show tasks where user3 is BOTH member AND responsible (AND logic)', () => {
      // Only task3 has user3 in both roles
      const result = filterTasks(tasks, {
        selectedUserId: 3,
        filterAsMember: true,
        filterAsResponsible: true,
        filterLogic: 'AND',
      });
      expect(result.map((t) => t.id)).toEqual([3]);
    });

    it('should return all tasks when both role filters are disabled', () => {
      const result = filterTasks(tasks, {
        selectedUserId: 1,
        filterAsMember: false,
        filterAsResponsible: false,
      });
      expect(result).toHaveLength(5);
    });
  });

  describe('combined column + user filtering', () => {
    it('should filter by column AND user role', () => {
      const result = filterTasks(tasks, {
        selectedColumnIds: [100],
        selectedUserId: 1,
      });
      // Column 100: tasks 1,2. User1 involved in both.
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should filter by column AND user with partial overlap', () => {
      const result = filterTasks(tasks, {
        selectedColumnIds: [200],
        selectedUserId: 3,
        filterAsMember: true,
        filterAsResponsible: false,
      });
      // Column 200: tasks 3,4. User3 as member: task3.
      expect(result.map((t) => t.id)).toEqual([3]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty task list', () => {
      expect(filterTasks([], { selectedUserId: 1 })).toHaveLength(0);
    });

    it('should handle task with no members', () => {
      expect(filterTasks([createTask(1, 100)], { selectedUserId: 1 })).toHaveLength(0);
    });

    it('should handle empty selectedColumnIds array', () => {
      const result = filterTasks(tasks, { selectedColumnIds: [], selectedUserId: 1 });
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('should handle empty selectedColumnIds Set', () => {
      const result = filterTasks(tasks, {
        selectedColumnIds: new Set<number>(),
        selectedUserId: 1,
      });
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });
  });
});
