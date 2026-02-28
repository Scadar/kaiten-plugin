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
  byBoard: (boardId: number, memberId?: number | null) =>
    memberId !== null
      ? (['tasks', { boardId, memberId }] as const)
      : (['tasks', { boardId }] as const),
  bySpace: (
    spaceId: number,
    filter?: string | null,
    boardId?: number | null,
    columnIds?: number[] | null,
  ) =>
    [
      'tasks',
      { spaceId, filter: filter ?? null, boardId: boardId ?? null, columnIds: columnIds ?? null },
    ] as const,
  detail: (id: number) => ['tasks', id] as const,
  detailExtended: (id: number) => ['tasks', id, 'detail'] as const,
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
 * Query keys for comments
 */
export const commentsKeys = {
  byCard: (cardId: number) => ['comments', { cardId }] as const,
};

/**
 * Query keys for settings (IDE settings accessed via RPC)
 */
export const settingsKeys = {
  all: () => ['settings'] as const,
};

/**
 * Query keys for the time tracker (branch time entries and git log)
 */
export const timeTrackerKeys = {
  branches: () => ['branchTimeEntries'] as const,
};

/**
 * Query keys for tags
 */
export const tagsKeys = {
  all: () => ['tags'] as const,
  bySpace: (spaceId: number | null) => ['tags', { spaceId }] as const,
};

/**
 * Query keys for card types
 */
export const cardTypesKeys = {
  all: () => ['card-types'] as const,
  bySpace: (spaceId: number | null) => ['card-types', { spaceId }] as const,
};

/**
 * Query keys for child cards (cards with a given parent_id)
 */
export const childCardsKeys = {
  byParent: (childrenIds: number[], filter?: string | null) =>
    ['child-cards', { childrenIds, filter: filter ?? null }] as const,
};

/**
 * Query keys for custom properties
 */
export const customPropertiesKeys = {
  all: () => ['custom-properties'] as const,
  detail: (id: number) => ['custom-properties', id] as const,
  selectValues: (id: number) => ['custom-properties', id, 'select-values'] as const,
};

/**
 * Query keys for card files
 */
export const filesKeys = {
  byCard: (cardId: number) => ['files', { cardId }] as const,
};

/**
 * Query keys for git operations (via IDE bridge)
 */
export const gitKeys = {
  checkBranchesMerged: (releaseBranch: string, branches: string[]) =>
    ['git', 'check-branches-merged', releaseBranch, branches] as const,
};
