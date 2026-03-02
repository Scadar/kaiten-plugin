import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';

import { boardsKeys, columnsKeys } from '@/api/endpoints';
import type { Board, Column } from '@/api/types';

import { useApiClient } from '../useApiClient';

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
