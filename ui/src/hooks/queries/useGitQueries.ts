import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { gitKeys } from '@/api/endpoints';
import { bridge } from '@/bridge/JCEFBridge';

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
