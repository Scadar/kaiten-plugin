import type { Task, TaskDetail, Board, Column, Space, User, Lane } from '@/api/types';

// ─── Space ─────────────────────────────────────────────────────────────────────

export function makeSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: 1,
    name: 'Test Space',
    archived: false,
    ...overrides,
  };
}

// ─── Lane ──────────────────────────────────────────────────────────────────────

export function makeLane(overrides: Partial<Lane> = {}): Lane {
  return {
    id: 1,
    name: 'Default Lane',
    boardId: 1,
    ...overrides,
  };
}

// ─── Board ─────────────────────────────────────────────────────────────────────

export function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 1,
    name: 'Test Board',
    spaceId: 1,
    lanes: [makeLane()],
    ...overrides,
  };
}

// ─── Column ────────────────────────────────────────────────────────────────────

export function makeColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: 1,
    name: 'In Progress',
    position: 1,
    ...overrides,
  };
}

// ─── Task ──────────────────────────────────────────────────────────────────────

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Test Task',
    description: null,
    columnId: 1,
    boardId: 1,
    laneId: 1,
    assigneeId: null,
    participants: [],
    dueDate: null,
    ...overrides,
  };
}

// ─── TaskDetail ────────────────────────────────────────────────────────────────

export function makeTaskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    ...makeTask(),
    spaceId: 1,
    typeId: null,
    sizeId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    tags: [],
    externalLinks: [],
    childrenCount: 0,
    childrenIds: [],
    condition: 1,
    blocked: false,
    blockReason: null,
    priority: null,
    spentTimeMinutes: null,
    timeEstimateMinutes: null,
    parentId: null,
    properties: {},
    ...overrides,
  };
}

// ─── User ──────────────────────────────────────────────────────────────────────

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  };
}
