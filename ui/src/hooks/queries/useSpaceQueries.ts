import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { spacesKeys } from '@/api/endpoints';
import type { Space } from '@/api/types';

import { useApiClient } from '../useApiClient';

export function useSpaces(): UseQueryResult<Space[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: spacesKeys.all(),
    queryFn: () => client!.getSpaces(),
    enabled: client !== null,
  });
}
