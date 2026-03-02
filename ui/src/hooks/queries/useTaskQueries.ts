import { useMemo } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { tasksKeys, commentsKeys, filesKeys, childCardsKeys } from '@/api/endpoints';
import type { Task, TaskDetail, Comment, CardFile } from '@/api/types';
import {
  encodeFilter,
  type FilterCondition,
  type FilterGroup,
  type SavedFilter,
} from '@/lib/advancedFilters';

import { useApiClient } from '../useApiClient';

export function useTasks(
  boardId: number | null | undefined,
  searchText?: string,
  memberId?: number | null,
): UseQueryResult<Task[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: tasksKeys.byBoard(boardId!, memberId),
    queryFn: () => client!.getCards(boardId!, searchText, memberId),
    enabled: client !== null && boardId !== null,
  });
}

export interface TasksBySpaceOptions {
  spaceId: number | null | undefined;
  filter?: string | null;
  boardId?: number | null;
  columnIds?: number[] | null;
  searchText?: string;
}

export function useTasksBySpace(options: TasksBySpaceOptions): UseQueryResult<Task[]> {
  const { spaceId, filter, boardId, columnIds, searchText } = options;
  const client = useApiClient();
  return useQuery({
    queryKey: tasksKeys.bySpace(spaceId!, filter, boardId, columnIds),
    queryFn: () => client!.getCardsBySpace(spaceId!, filter, boardId, searchText, columnIds),
    enabled: client !== null && spaceId !== null,
  });
}

export function useTask(cardId: number | null | undefined): UseQueryResult<Task> {
  const client = useApiClient();
  return useQuery({
    queryKey: tasksKeys.detail(cardId!),
    queryFn: () => client!.getCard(cardId!),
    enabled: client !== null && cardId !== null,
  });
}

export function useCardDetail(cardId: number | null | undefined): UseQueryResult<TaskDetail> {
  const client = useApiClient();
  return useQuery({
    queryKey: tasksKeys.detailExtended(cardId!),
    queryFn: () => client!.getCardDetail(cardId!),
    enabled: client !== null && cardId !== null,
  });
}

export function useCardComments(cardId: number | null | undefined): UseQueryResult<Comment[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: commentsKeys.byCard(cardId!),
    queryFn: () => client!.getCardComments(cardId!),
    enabled: client !== null && cardId !== null,
  });
}

export function useCardFiles(cardId: number | null | undefined): UseQueryResult<CardFile[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: filesKeys.byCard(cardId!),
    queryFn: () => client!.getCardFiles(cardId!),
    enabled: client !== null && cardId !== null,
  });
}

export function useChildCards(
  childrenIds: number[] | null | undefined,
  activeFilter?: SavedFilter | null,
): UseQueryResult<Task[]> {
  const client = useApiClient();

  const encodedActiveFilter = useMemo(
    () => (activeFilter ? encodeFilter(activeFilter.group) : null),
    [activeFilter],
  );

  const combinedFilter = useMemo((): string => {
    const ids = childrenIds;
    if (!ids || ids.length === 0) return '';

    const baseCondition: FilterCondition = {
      id: 'children-ids',
      key: 'id',
      comparison: 'in',
      value: ids,
    };

    const group: FilterGroup = {
      id: 'children-root',
      logic: 'and',
      conditions:
        activeFilter && activeFilter.group.conditions.length > 0
          ? [baseCondition, ...activeFilter.group.conditions]
          : [baseCondition],
    };

    return encodeFilter(group);
  }, [childrenIds, activeFilter]);

  return useQuery({
    queryKey: childCardsKeys.byParent(childrenIds ?? [], encodedActiveFilter),
    queryFn: () => client!.getCardsByFilter(combinedFilter),
    enabled: Boolean(childrenIds && childrenIds.length > 0),
  });
}
