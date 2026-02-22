/**
 * Custom hooks for Kaiten API data fetching using TanStack Query
 *
 * Hooks get settings internally via useSettings() — no config param needed at call site.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useSettings } from './useSettings';
import { KaitenApiClient } from '../api/client';
import { Space, Board, Column, Task, User } from '../api/types';
import {
  spacesKeys,
  boardsKeys,
  columnsKeys,
  tasksKeys,
  usersKeys,
} from '../api/endpoints';
import { CACHE_CONFIG } from '../lib/cache';

export function useSpaces(): UseQueryResult<Space[], Error> {
  const settings = useSettings();
  return useQuery({
    queryKey: spacesKeys.all(),
    queryFn: () => new KaitenApiClient({ serverUrl: settings.serverUrl, apiToken: settings.apiToken }).getSpaces(),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(settings.serverUrl && settings.apiToken),
  });
}

export function useBoards(spaceId: number | null | undefined): UseQueryResult<Board[], Error> {
  const settings = useSettings();
  return useQuery({
    queryKey: boardsKeys.bySpace(spaceId!),
    queryFn: () => new KaitenApiClient({ serverUrl: settings.serverUrl, apiToken: settings.apiToken }).getBoards(spaceId!),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(settings.serverUrl && settings.apiToken && spaceId != null),
  });
}

export function useColumns(boardId: number | null | undefined): UseQueryResult<Column[], Error> {
  const settings = useSettings();
  return useQuery({
    queryKey: columnsKeys.byBoard(boardId!),
    queryFn: () => new KaitenApiClient({ serverUrl: settings.serverUrl, apiToken: settings.apiToken }).getColumns(boardId!),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(settings.serverUrl && settings.apiToken && boardId != null),
  });
}

export function useTasks(
  boardId: number | null | undefined,
  searchText?: string
): UseQueryResult<Task[], Error> {
  const settings = useSettings();
  return useQuery({
    queryKey: tasksKeys.byBoard(boardId!),
    queryFn: () => new KaitenApiClient({ serverUrl: settings.serverUrl, apiToken: settings.apiToken }).getCards(boardId!, searchText),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(settings.serverUrl && settings.apiToken && boardId != null),
  });
}

export function useTask(cardId: number | null | undefined): UseQueryResult<Task, Error> {
  const settings = useSettings();
  return useQuery({
    queryKey: tasksKeys.detail(cardId!),
    queryFn: () => new KaitenApiClient({ serverUrl: settings.serverUrl, apiToken: settings.apiToken }).getCard(cardId!),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(settings.serverUrl && settings.apiToken && cardId != null),
  });
}

export function useUsers(): UseQueryResult<User[], Error> {
  const settings = useSettings();
  return useQuery({
    queryKey: usersKeys.all(),
    queryFn: () => new KaitenApiClient({ serverUrl: settings.serverUrl, apiToken: settings.apiToken }).getUsers(),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(settings.serverUrl && settings.apiToken),
  });
}

export function useCurrentUser(): UseQueryResult<User, Error> {
  const settings = useSettings();
  return useQuery({
    queryKey: usersKeys.current(),
    queryFn: () => new KaitenApiClient({ serverUrl: settings.serverUrl, apiToken: settings.apiToken }).getCurrentUser(),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    enabled: !!(settings.serverUrl && settings.apiToken),
  });
}
