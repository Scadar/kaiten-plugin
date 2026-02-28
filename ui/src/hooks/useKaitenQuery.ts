/**
 * Custom hooks for Kaiten API data fetching using TanStack Query.
 *
 * Each hook obtains a memoized KaitenApiClient via useApiClient() —
 * no need to pass config or check settings at the call site.
 * staleTime / gcTime are inherited from the global QueryClient defaults.
 */

import { useMemo } from 'react';

import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';

import { bridge } from '@/bridge/JCEFBridge';
import {
  encodeFilter,
  type FilterCondition,
  type FilterGroup,
  type SavedFilter,
} from '@/lib/advancedFilters.ts';

import { useApiClient } from './useApiClient';
import {
  spacesKeys,
  boardsKeys,
  columnsKeys,
  tasksKeys,
  commentsKeys,
  filesKeys,
  usersKeys,
  tagsKeys,
  cardTypesKeys,
  childCardsKeys,
  customPropertiesKeys,
  gitKeys,
} from '../api/endpoints';
import {
  type Space,
  type Board,
  type Column,
  type Task,
  type TaskDetail,
  type Comment,
  type CardFile,
  type User,
  type Tag,
  type CardType,
  type CustomProperty,
  type CustomPropertySelectValue,
} from '../api/types';

export function useSpaces(): UseQueryResult<Space[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: spacesKeys.all(),
    queryFn: () => client!.getSpaces(),
    enabled: client !== null,
  });
}

export function useBoards(spaceId: number | null | undefined): UseQueryResult<Board[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: boardsKeys.bySpace(spaceId!),
    queryFn: () => client!.getBoards(spaceId!),
    enabled: client !== null && spaceId !== null,
  });
}

export function useColumns(boardId: number | null | undefined): UseQueryResult<Column[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: columnsKeys.byBoard(boardId!),
    queryFn: () => client!.getColumns(boardId!),
    enabled: client !== null && boardId !== null,
  });
}

/**
 * Fetch columns for multiple boards in parallel.
 * Returns a map of boardId → Column[] and a combined isLoading flag.
 */
export function useColumnsByBoards(boardIds: number[]): {
  data: Record<number, Column[]>;
  isLoading: boolean;
} {
  const client = useApiClient();
  const results = useQueries({
    queries: boardIds.map((boardId) => ({
      queryKey: columnsKeys.byBoard(boardId),
      queryFn: () => client!.getColumns(boardId),
      enabled: client !== null,
    })),
  });

  const data: Record<number, Column[]> = {};
  boardIds.forEach((boardId, i) => {
    data[boardId] = results[i]?.data ?? [];
  });

  return {
    data,
    isLoading: results.some((r) => r.isLoading),
  };
}

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

export function useUsers(): UseQueryResult<User[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: usersKeys.all(),
    queryFn: () => client!.getUsers(),
    enabled: client !== null,
  });
}

export function useCurrentUser(): UseQueryResult<User> {
  const client = useApiClient();
  return useQuery({
    queryKey: usersKeys.current(),
    queryFn: () => client!.getCurrentUser(),
    enabled: client !== null,
  });
}

export function useTags(spaceId?: number | null): UseQueryResult<Tag[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: tagsKeys.bySpace(spaceId ?? null),
    queryFn: () => client!.getTags(spaceId),
    enabled: client !== null,
  });
}

export function useCardTypes(spaceId?: number | null): UseQueryResult<CardType[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: cardTypesKeys.bySpace(spaceId ?? null),
    queryFn: () => client!.getCardTypes(spaceId),
    enabled: client !== null,
  });
}

export function useCustomProperties(): UseQueryResult<CustomProperty[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: customPropertiesKeys.all(),
    queryFn: () => client!.getCustomProperties(),
    enabled: client !== null,
  });
}

export interface CustomPropertyWithValues extends CustomProperty {
  selectValues: CustomPropertySelectValue[];
}

export function useCustomPropertiesWithValues(): {
  data: CustomPropertyWithValues[];
  isLoading: boolean;
} {
  const client = useApiClient();
  const { data: properties = [], isLoading: propsLoading } = useCustomProperties();

  const selectProperties = useMemo(
    () => properties.filter((p) => p.type === 'select'),
    [properties],
  );

  const selectValueResults = useQueries({
    queries: selectProperties.map((p) => ({
      queryKey: customPropertiesKeys.selectValues(p.id),
      queryFn: () => client!.getCustomPropertySelectValues(p.id),
      enabled: client !== null,
    })),
  });

  const data = useMemo<CustomPropertyWithValues[]>(() => {
    return properties.map((prop) => {
      if (prop.type !== 'select') return { ...prop, selectValues: [] };
      const idx = selectProperties.findIndex((sp) => sp.id === prop.id);
      const values = idx >= 0 ? (selectValueResults[idx]?.data ?? []) : [];
      return { ...prop, selectValues: values };
    });
  }, [properties, selectProperties, selectValueResults]);

  return {
    data,
    isLoading: propsLoading || selectValueResults.some((r) => r.isLoading),
  };
}

export interface ResolvedCustomProperty {
  property: CustomProperty;
  selectedValueIds: number[];
  selectValues: CustomPropertySelectValue[] | null;
}

export function useCardCustomProperties(properties: Record<string, number[]>): {
  data: ResolvedCustomProperty[];
  isLoading: boolean;
} {
  const client = useApiClient();

  const propertyEntries = useMemo(() => {
    return Object.entries(properties)
      .map(([key, valueIds]) => {
        const match = /^id_(\d+)$/.exec(key);
        if (!match) return null;
        const normalized = Array.isArray(valueIds) ? valueIds : [Number(valueIds)];
        return { id: parseInt(match[1]!, 10), valueIds: normalized };
      })
      .filter((e): e is { id: number; valueIds: number[] } => e !== null);
  }, [properties]);

  const propertyIds = useMemo(() => propertyEntries.map((e) => e.id), [propertyEntries]);

  const propResults = useQueries({
    queries: propertyIds.map((id) => ({
      queryKey: customPropertiesKeys.detail(id),
      queryFn: () => client!.getCustomProperty(id),
      enabled: client !== null,
    })),
  });

  const selectResults = useQueries({
    queries: propertyIds.map((id, i) => ({
      queryKey: customPropertiesKeys.selectValues(id),
      queryFn: () => client!.getCustomPropertySelectValues(id),
      enabled: client !== null && propResults[i]?.data?.type === 'select',
    })),
  });

  const data = useMemo<ResolvedCustomProperty[]>(() => {
    return propertyEntries
      .map(({ valueIds }, i) => {
        const prop = propResults[i]?.data;
        if (!prop) return null;
        const selectValues = prop.type === 'select' ? (selectResults[i]?.data ?? null) : null;
        return { property: prop, selectedValueIds: valueIds, selectValues };
      })
      .filter((e): e is ResolvedCustomProperty => e !== null);
  }, [propertyEntries, propResults, selectResults]);

  return {
    data,
    isLoading: propResults.some((q) => q.isLoading),
  };
}

export function useCheckBranchesMerged(
  releaseBranch: string | null,
  branches: string[],
): UseQueryResult<Record<string, boolean>> {
  return useQuery({
    queryKey: gitKeys.checkBranchesMerged(releaseBranch ?? '', branches),
    queryFn: async () => {
      const result = await bridge.call('checkBranchesMerged', {
        releaseBranch: releaseBranch!,
        branches,
      });
      if ('error' in result) throw new Error((result as { error: string }).error);
      return (result as { results: Record<string, boolean> }).results;
    },
    enabled: releaseBranch !== null && releaseBranch.trim() !== '' && branches.length > 0,
    staleTime: 0,
    gcTime: 0,
    retry: false,
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

    // Combine the children-IDs condition with any conditions from the active filter.
    // normalizeGroup() (called inside encodeFilter) will wrap bare conditions in OR
    // groups as required by the Kaiten API.
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
