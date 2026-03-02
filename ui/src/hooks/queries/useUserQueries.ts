import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { usersKeys } from '@/api/endpoints';
import type { User } from '@/api/types';

import { useApiClient } from '../useApiClient';

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
