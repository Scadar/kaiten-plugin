/**
 * Custom hooks for Kaiten API data fetching using TanStack Query
 *
 * These hooks provide a React-friendly interface to the Kaiten API client,
 * with built-in caching, error handling, and loading states via React Query.
 *
 * Features:
 * - Automatic caching with TTL (5min stale, 30min gc)
 * - Type-safe query results
 * - Error handling with typed errors
 * - Automatic refetching and retry logic
 * - Loading and error states
 *
 * Example usage:
 *   const { data: spaces, isLoading, error } = useSpaces(config);
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { KaitenApiClient, ApiConfig } from '../api/client';
import { Space, Board, Column, Task, User } from '../api/types';
import {
  spacesKeys,
  boardsKeys,
  columnsKeys,
  tasksKeys,
  usersKeys,
} from '../api/endpoints';
import { CACHE_CONFIG } from '../lib/cache';

/**
 * Hook to fetch all spaces
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @returns Query result with spaces data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: spaces, isLoading, error } = useSpaces(config);
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * return <SpacesList spaces={spaces} />;
 * ```
 */
export function useSpaces(config: ApiConfig): UseQueryResult<Space[], Error> {
  return useQuery({
    queryKey: spacesKeys.all(),
    queryFn: async () => {
      const client = new KaitenApiClient(config);
      return client.getSpaces();
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(config.serverUrl && config.apiToken), // Only fetch if config is valid
  });
}

/**
 * Hook to fetch all boards in a space
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @param spaceId - The ID of the space to fetch boards for
 * @returns Query result with boards data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: boards } = useBoards(config, selectedSpaceId);
 * ```
 */
export function useBoards(
  config: ApiConfig,
  spaceId: number | null | undefined
): UseQueryResult<Board[], Error> {
  return useQuery({
    queryKey: boardsKeys.bySpace(spaceId!),
    queryFn: async () => {
      const client = new KaitenApiClient(config);
      return client.getBoards(spaceId!);
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(config.serverUrl && config.apiToken && spaceId != null), // Only fetch if config and spaceId are valid
  });
}

/**
 * Hook to fetch all columns in a board
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @param boardId - The ID of the board to fetch columns for
 * @returns Query result with columns data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: columns } = useColumns(config, selectedBoardId);
 * ```
 */
export function useColumns(
  config: ApiConfig,
  boardId: number | null | undefined
): UseQueryResult<Column[], Error> {
  return useQuery({
    queryKey: columnsKeys.byBoard(boardId!),
    queryFn: async () => {
      const client = new KaitenApiClient(config);
      return client.getColumns(boardId!);
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(config.serverUrl && config.apiToken && boardId != null), // Only fetch if config and boardId are valid
  });
}

/**
 * Hook to fetch all tasks/cards in a board
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @param boardId - The ID of the board to fetch tasks for
 * @param searchText - Optional search text to filter tasks
 * @returns Query result with tasks data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: tasks } = useTasks(config, boardId, searchText);
 * ```
 */
export function useTasks(
  config: ApiConfig,
  boardId: number | null | undefined,
  searchText?: string
): UseQueryResult<Task[], Error> {
  return useQuery({
    queryKey: tasksKeys.byBoard(boardId!),
    queryFn: async () => {
      const client = new KaitenApiClient(config);
      return client.getCards(boardId!, searchText);
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(config.serverUrl && config.apiToken && boardId != null), // Only fetch if config and boardId are valid
  });
}

/**
 * Hook to fetch a single task/card by ID
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @param cardId - The ID of the card to fetch
 * @returns Query result with task data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: task } = useTask(config, cardId);
 * ```
 */
export function useTask(
  config: ApiConfig,
  cardId: number | null | undefined
): UseQueryResult<Task, Error> {
  return useQuery({
    queryKey: tasksKeys.detail(cardId!),
    queryFn: async () => {
      const client = new KaitenApiClient(config);
      return client.getCard(cardId!);
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(config.serverUrl && config.apiToken && cardId != null), // Only fetch if config and cardId are valid
  });
}

/**
 * Hook to fetch all users
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @returns Query result with users data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: users } = useUsers(config);
 * ```
 */
export function useUsers(config: ApiConfig): UseQueryResult<User[], Error> {
  return useQuery({
    queryKey: usersKeys.all(),
    queryFn: async () => {
      const client = new KaitenApiClient(config);
      return client.getUsers();
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(config.serverUrl && config.apiToken), // Only fetch if config is valid
  });
}

/**
 * Hook to fetch the current user
 *
 * @param config - API configuration (serverUrl, apiToken)
 * @returns Query result with current user data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: currentUser } = useCurrentUser(config);
 * ```
 */
export function useCurrentUser(
  config: ApiConfig
): UseQueryResult<User, Error> {
  return useQuery({
    queryKey: usersKeys.current(),
    queryFn: async () => {
      const client = new KaitenApiClient(config);
      return client.getCurrentUser();
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(config.serverUrl && config.apiToken), // Only fetch if config is valid
  });
}
