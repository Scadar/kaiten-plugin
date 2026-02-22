/**
 * Custom hooks for Kaiten API data fetching using TanStack Query
 *
 * Hooks get settings internally via useSettings() — no config param needed at call site.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useSettings } from './useSettings';
import { KaitenApiClient } from '../api/client';
import { Space, Board, Column, Task, TaskDetail, Comment, User } from '../api/types';
import {
  spacesKeys,
  boardsKeys,
  columnsKeys,
  tasksKeys,
  commentsKeys,
  usersKeys,
} from '../api/endpoints';
import { CACHE_CONFIG } from '../lib/cache';

function makeClient(serverUrl: string, apiToken: string) {
  return new KaitenApiClient({ serverUrl, apiToken });
}

export function useSpaces(): UseQueryResult<Space[], Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken);
  console.log('[useSpaces] enabled:', enabled, '| serverUrl:', settings.serverUrl || '(empty)');
  return useQuery({
    queryKey: spacesKeys.all(),
    queryFn: async () => {
      console.log('[useSpaces] queryFn running...');
      const result = await makeClient(settings.serverUrl, settings.apiToken).getSpaces();
      console.log('[useSpaces] queryFn success, count:', result.length);
      return result;
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useBoards(spaceId: number | null | undefined): UseQueryResult<Board[], Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken && spaceId != null);
  console.log('[useBoards] enabled:', enabled, '| spaceId:', spaceId);
  return useQuery({
    queryKey: boardsKeys.bySpace(spaceId!),
    queryFn: async () => {
      console.log('[useBoards] queryFn running, spaceId:', spaceId);
      const result = await makeClient(settings.serverUrl, settings.apiToken).getBoards(spaceId!);
      console.log('[useBoards] queryFn success, count:', result.length);
      return result;
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useColumns(boardId: number | null | undefined): UseQueryResult<Column[], Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken && boardId != null);
  console.log('[useColumns] enabled:', enabled, '| boardId:', boardId);
  return useQuery({
    queryKey: columnsKeys.byBoard(boardId!),
    queryFn: async () => {
      console.log('[useColumns] queryFn running, boardId:', boardId);
      const result = await makeClient(settings.serverUrl, settings.apiToken).getColumns(boardId!);
      console.log('[useColumns] queryFn success, count:', result.length);
      return result;
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useTasks(
  boardId: number | null | undefined,
  searchText?: string,
  memberId?: number | null
): UseQueryResult<Task[], Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken && boardId != null);
  console.log('[useTasks] enabled:', enabled, '| boardId:', boardId, '| memberId:', memberId);
  return useQuery({
    queryKey: tasksKeys.byBoard(boardId!, memberId),
    queryFn: async () => {
      console.log('[useTasks] queryFn running, boardId:', boardId, 'memberId:', memberId);
      const result = await makeClient(settings.serverUrl, settings.apiToken).getCards(boardId!, searchText, memberId);
      console.log('[useTasks] queryFn success, count:', result.length);
      return result;
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useTask(cardId: number | null | undefined): UseQueryResult<Task, Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken && cardId != null);
  return useQuery({
    queryKey: tasksKeys.detail(cardId!),
    queryFn: async () => {
      console.log('[useTask] queryFn running, cardId:', cardId);
      return makeClient(settings.serverUrl, settings.apiToken).getCard(cardId!);
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useCardDetail(cardId: number | null | undefined): UseQueryResult<TaskDetail, Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken && cardId != null);
  return useQuery({
    queryKey: [...tasksKeys.detail(cardId!), 'detail'],
    queryFn: async () => {
      console.log('[useCardDetail] queryFn running, cardId:', cardId);
      return makeClient(settings.serverUrl, settings.apiToken).getCardDetail(cardId!);
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useCardComments(cardId: number | null | undefined): UseQueryResult<Comment[], Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken && cardId != null);
  return useQuery({
    queryKey: commentsKeys.byCard(cardId!),
    queryFn: async () => {
      console.log('[useCardComments] queryFn running, cardId:', cardId);
      return makeClient(settings.serverUrl, settings.apiToken).getCardComments(cardId!);
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useUsers(): UseQueryResult<User[], Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken);
  console.log('[useUsers] enabled:', enabled);
  return useQuery({
    queryKey: usersKeys.all(),
    queryFn: async () => {
      console.log('[useUsers] queryFn running...');
      const result = await makeClient(settings.serverUrl, settings.apiToken).getUsers();
      console.log('[useUsers] queryFn success, count:', result.length);
      return result;
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}

export function useCurrentUser(): UseQueryResult<User, Error> {
  const settings = useSettings();
  const enabled = !!(settings.serverUrl && settings.apiToken);
  return useQuery({
    queryKey: usersKeys.current(),
    queryFn: async () => {
      console.log('[useCurrentUser] queryFn running...');
      return makeClient(settings.serverUrl, settings.apiToken).getCurrentUser();
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled,
  });
}
