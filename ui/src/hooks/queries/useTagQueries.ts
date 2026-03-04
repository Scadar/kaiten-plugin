import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { tagsKeys, cardTypesKeys } from '@/api/endpoints';
import type { Tag, CardType } from '@/api/types';

import { useApiClient } from '../useApiClient';

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
