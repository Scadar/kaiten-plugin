/**
 * Query key factories for TanStack Query
 *
 * These factories provide centralized, type-safe query keys for cache management.
 * Hierarchical structure enables targeted cache invalidation.
 *
 * Pattern:
 * - all() returns base key array
 * - detail() returns key with specific ID
 * - by*() returns keys filtered by specific criteria
 *
 * Example usage:
 *   spacesKeys.all() → ['spaces']
 *   spacesKeys.detail(1) → ['spaces', 1]
 *   boardsKeys.bySpace(1) → ['boards', { spaceId: 1 }]
 */

/**
 * Query keys for spaces
 */
export const spacesKeys = {
  all: () => ['spaces'] as const,
  detail: (id: number) => ['spaces', id] as const,
};

/**
 * Query keys for boards
 */
export const boardsKeys = {
  all: () => ['boards'] as const,
  bySpace: (spaceId: number) => ['boards', { spaceId }] as const,
  detail: (id: number) => ['boards', id] as const,
};

/**
 * Query keys for columns
 */
export const columnsKeys = {
  all: () => ['columns'] as const,
  byBoard: (boardId: number) => ['columns', { boardId }] as const,
  detail: (id: number) => ['columns', id] as const,
};

/**
 * Query keys for tasks
 */
export const tasksKeys = {
  all: () => ['tasks'] as const,
  byColumn: (columnId: number) => ['tasks', { columnId }] as const,
  byBoard: (boardId: number) => ['tasks', { boardId }] as const,
  detail: (id: number) => ['tasks', id] as const,
};

/**
 * Query keys for users
 */
export const usersKeys = {
  all: () => ['users'] as const,
  current: () => ['users', 'current'] as const,
  detail: (id: number) => ['users', id] as const,
};

/**
 * Query keys for settings (IDE settings accessed via RPC)
 */
export const settingsKeys = {
  all: () => ['settings'] as const,
};
